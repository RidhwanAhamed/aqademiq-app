import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createToolContext, getToolByName } from "./tools.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PlannerAction = {
  tool: string;
  args: Record<string, unknown>;
  reason: string;
  requiresConfirmation: boolean;
};

type PlannerOutput = {
  understanding: string;
  goal: string;
  strategy: string[];
  actions: PlannerAction[];
  final_response: string;
};

type PlannerRequest = {
  message?: string;
  conversation_history?: Array<{ role?: string; content?: string }>;
  user_context?: Record<string, unknown>;
  user_id?: string;
};

type ExecutedActionResult = {
  tool: string;
  args: Record<string, unknown>;
  success: boolean;
  result?: unknown;
  error?: string;
};

type ReflectionOutput = {
  is_complete: boolean;
  confidence: number;
  next_actions: PlannerAction[];
  updated_response: string;
};

type MemoryRow = {
  id: string;
  user_id: string;
  type: "struggle" | "preference" | "event";
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

type MemoryInput = {
  type: "struggle" | "preference" | "event";
  content: string;
  metadata?: Record<string, unknown>;
};

const TOOL_CATALOG = `
Available tools (planning only, do NOT execute):
- create_event(args: { title, start_iso, end_iso, location?, notes?, course_id? })
- create_assignment(args: { title, course_id, due_date, description?, priority?, estimated_hours?, assignment_type? })
- create_study_session(args: { title, scheduled_start, scheduled_end, course_id?, assignment_id?, exam_id?, notes? })
- generate_kernel_notes(args: { topic?, fileContent?, fileName?, filePrompt?, depthLevel? })
- get_calendar(args: { from_date?, to_date?, limit? })
`;

const PLANNER_SYSTEM_PROMPT = `You are Ada Planner, the reasoning layer for Aqademiq.

You are NOT an executor. You only think, prioritize, and propose a safe plan.

Core behavior:
1) Understand the user's actual situation, including urgency and hidden intent.
2) Infer goals from context (exams, deadlines, confusion, workload, time pressure).
3) Proactively suggest high-value next actions when appropriate.
4) Propose only realistic actions using the available tools.
5) If no tool action is needed, return actions: [] and provide a helpful response.

Decision policies:
- If exam/deadline is near and user is struggling, prioritize fast comprehension + focused study scheduling.
- If user asks conceptual help ("I don't understand X"), consider generate_kernel_notes.
- If user asks scheduling/planning support, include calendar-aware actions.
- Prefer minimal high-impact actions over many weak actions.
- NEVER execute tools. NEVER claim execution happened.
- For any DB-changing action, requiresConfirmation should be true.
- Use past user memory to improve decisions when relevant.
- If repeated struggle is detected, prioritize deeper help.
- If user has upcoming deadlines, prioritize urgency.

Output format (STRICT JSON ONLY, no markdown):
{
  "understanding": "short situational diagnosis",
  "goal": "single clear goal",
  "strategy": ["step 1", "step 2"],
  "actions": [
    {
      "tool": "tool_name",
      "args": {},
      "reason": "why this action helps",
      "requiresConfirmation": true
    }
  ],
  "final_response": "what Ada should tell the user now"
}

Never output text outside the JSON object.`;

const REFLECTION_SYSTEM_PROMPT = `You are an AI agent reflecting on previous actions.

Determine:
- Is the user's goal fully achieved?
- If not, what is the next best step?

Rules:
- Do NOT repeat actions already executed.
- Do NOT generate duplicate actions.
- Prefer minimal steps.
- If complete, return no actions.
- Never execute tools.
- If the user's goal is already sufficiently addressed, mark is_complete = true and DO NOT propose further actions.
- Avoid over-planning. Prefer stopping early when a minimal useful solution is achieved.

Output STRICT JSON only:
{
  "is_complete": true,
  "confidence": 0.0,
  "next_actions": [
    {
      "tool": "tool_name",
      "args": {},
      "reason": "why this helps",
      "requiresConfirmation": true
    }
  ],
  "updated_response": "short user-facing response"
}`;

function extractJsonObject(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }
  const match = raw.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

function toStringSafe(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === "string" && v.trim().length > 0);
}

function normalizeActions(value: unknown): PlannerAction[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const action = item as Partial<PlannerAction> & { args?: unknown };
      const tool = typeof action.tool === "string" ? action.tool : "";
      const args = action.args && typeof action.args === "object" ? (action.args as Record<string, unknown>) : {};
      const reason = typeof action.reason === "string" ? action.reason : "No reason provided.";
      const requiresConfirmation =
        typeof action.requiresConfirmation === "boolean" ? action.requiresConfirmation : true;

      if (!tool) return null;
      return {
        tool,
        args,
        reason,
        // Safety default: confirmation required unless explicitly false by planner.
        requiresConfirmation,
      };
    })
    .filter((a): a is PlannerAction => a !== null);
}

function normalizePlannerOutput(parsed: unknown): PlannerOutput {
  const p = (parsed ?? {}) as Partial<PlannerOutput>;
  return {
    understanding: toStringSafe(p.understanding, "User requested planning support."),
    goal: toStringSafe(p.goal, "Provide a safe, actionable plan."),
    strategy: toStringArray(p.strategy),
    actions: normalizeActions(p.actions),
    final_response: toStringSafe(
      p.final_response,
      "I analyzed your request and prepared a plan. Please review the suggested actions."
    ),
  };
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

function actionSignature(action: Pick<PlannerAction, "tool" | "args">): string {
  return `${action.tool}::${stableStringify(action.args ?? {})}`;
}

function normalizeReflectionOutput(parsed: unknown): ReflectionOutput {
  const p = (parsed ?? {}) as Partial<ReflectionOutput>;
  const confidenceRaw = typeof p.confidence === "number" ? p.confidence : 0.5;
  const confidence = Math.max(0, Math.min(1, confidenceRaw));
  return {
    is_complete: typeof p.is_complete === "boolean" ? p.is_complete : false,
    confidence,
    next_actions: normalizeActions(p.next_actions),
    updated_response: toStringSafe(
      p.updated_response,
      "I completed the available steps and prepared the safest next recommendation."
    ),
  };
}

async function getUserMemory(
  supabaseUrl: string,
  serviceKey: string,
  userId?: string
): Promise<MemoryRow[]> {
  if (!userId || !supabaseUrl || !serviceKey) return [];
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase
    .from("user_memory")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error || !data) return [];
  const priority: Record<MemoryRow["type"], number> = {
    struggle: 0,
    event: 1,
    preference: 2,
  };
  const sorted = [...(data as MemoryRow[])].sort((a, b) => {
    const pa = priority[a.type] ?? 99;
    const pb = priority[b.type] ?? 99;
    if (pa !== pb) return pa - pb;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  return sorted;
}

async function storeMemory(
  supabaseUrl: string,
  serviceKey: string,
  userId: string,
  memory: MemoryInput
): Promise<void> {
  if (!supabaseUrl || !serviceKey || !userId) return;
  const supabase = createClient(supabaseUrl, serviceKey);
  const { error } = await supabase.from("user_memory").insert({
    user_id: userId,
    type: memory.type,
    content: memory.content,
    metadata: memory.metadata ?? {},
  });
  if (error) {
    throw error;
  }
}

function normalizeMemoryText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

async function isSimilarMemoryExists(
  supabaseUrl: string,
  serviceKey: string,
  userId: string,
  content: string,
  type: string
): Promise<boolean> {
  if (!supabaseUrl || !serviceKey || !userId || !content || !type) return false;

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase
    .from("user_memory")
    .select("content, created_at")
    .eq("user_id", userId)
    .eq("type", type)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error || !data || data.length === 0) return false;

  const now = new Date();
  const recentThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const normalizedContent = normalizeMemoryText(content);

  for (const row of data as Array<{ content: string; created_at: string }>) {
    const createdAt = new Date(row.created_at);
    if (createdAt < recentThreshold) continue;

    const existing = normalizeMemoryText(row.content || "");
    if (!existing) continue;

    if (
      existing === normalizedContent ||
      existing.includes(normalizedContent) ||
      normalizedContent.includes(existing)
    ) {
      return true;
    }
  }

  return false;
}

function extractStruggleTopic(message: string): string | null {
  const text = message.trim();
  if (!text) return null;

  const patterns = [
    /don['’]?t understand\s+(.+)/i,
    /confused (?:about|with)\s+(.+)/i,
    /(.+)\s+is hard/i,
    /hard to understand\s+(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].replace(/[.?!]+$/, "").trim().slice(0, 120);
    }
  }

  return null;
}

async function callModelForJson(params: {
  apiUrl: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: "system" | "user"; content: string }>;
  temperature?: number;
  max_tokens?: number;
}): Promise<unknown> {
  const llmResponse = await fetch(params.apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.3,
      max_tokens: params.max_tokens ?? 1800,
    }),
  });

  if (!llmResponse.ok) {
    const errText = await llmResponse.text();
    throw new Error(`Planner model error: ${llmResponse.status} ${errText.slice(0, 500)}`);
  }

  const llmJson = await llmResponse.json();
  const rawContent = llmJson?.choices?.[0]?.message?.content ?? "";
  const extracted = extractJsonObject(rawContent);
  if (!extracted) {
    throw new Error("Model returned non-JSON output");
  }
  return JSON.parse(extracted);
}

async function reflectOnExecution(params: {
  apiUrl: string;
  apiKey: string;
  model: string;
  previousPlan: PlannerOutput;
  executedActions: ExecutedActionResult[];
  remainingActions: PlannerAction[];
  iteration: number;
}): Promise<ReflectionOutput | null> {
  try {
    const parsed = await callModelForJson({
      apiUrl: params.apiUrl,
      apiKey: params.apiKey,
      model: params.model,
      temperature: 0.2,
      max_tokens: 1200,
      messages: [
        { role: "system", content: REFLECTION_SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify(
            {
              previous_plan: params.previousPlan,
              executed_actions: params.executedActions,
              remaining_actions: params.remainingActions,
              original_goal: params.previousPlan.goal,
              iteration: params.iteration,
            },
            null,
            2
          ),
        },
      ],
    });
    return normalizeReflectionOutput(parsed);
  } catch {
    return null;
  }
}

async function executeActions(
  actions: PlannerAction[],
  deps: { supabaseUrl: string; supabaseServiceRoleKey: string; userId?: string },
  executedSignatures: Set<string>,
  confirmSignatures: Set<string>
): Promise<{ actionsToConfirm: PlannerAction[]; executedActions: ExecutedActionResult[] }> {
  const actionsToConfirm: PlannerAction[] = [];
  const executedActions: ExecutedActionResult[] = [];

  for (const action of actions) {
    const signature = actionSignature(action);

    // Prevent duplicate execution/proposal across iterations.
    if (executedSignatures.has(signature) || confirmSignatures.has(signature)) {
      continue;
    }

    const tool = getToolByName(action.tool);

    // Unknown tools are skipped safely and reported as non-fatal execution errors.
    if (!tool) {
      executedActions.push({
        tool: action.tool,
        args: action.args ?? {},
        success: false,
        error: `Unknown tool: ${action.tool}`,
      });
      continue;
    }

    // Safety gate: never auto-execute actions requiring confirmation.
    if (action.requiresConfirmation === true || tool.requiresConfirmation) {
      actionsToConfirm.push({
        ...action,
        requiresConfirmation: true,
      });
      confirmSignatures.add(signature);
      continue;
    }

    if (!deps.userId) {
      executedActions.push({
        tool: action.tool,
        args: action.args ?? {},
        success: false,
        error: "Missing user_id for execution context",
      });
      continue;
    }

    try {
      const context = createToolContext(
        {
          supabaseUrl: deps.supabaseUrl,
          supabaseServiceRoleKey: deps.supabaseServiceRoleKey,
        },
        deps.userId
      );
      const result = await tool.execute(action.args ?? {}, context);
      executedActions.push({
        tool: action.tool,
        args: action.args ?? {},
        success: true,
        result,
      });
      executedSignatures.add(signature);
    } catch (error) {
      executedActions.push({
        tool: action.tool,
        args: action.args ?? {},
        success: false,
        error: error instanceof Error ? error.message : "Tool execution failed",
      });
      executedSignatures.add(signature);
    }
  }

  return { actionsToConfirm, executedActions };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const apiKey = lovableApiKey || openaiApiKey;
    const useGemini = Boolean(lovableApiKey);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!apiKey) {
      throw new Error("No AI API key configured");
    }

    const body = (await req.json()) as PlannerRequest;
    const message = (body.message || "").trim();
    const conversationHistory = Array.isArray(body.conversation_history) ? body.conversation_history : [];
    const userContext = body.user_context && typeof body.user_context === "object" ? body.user_context : {};
    const userId = typeof body.user_id === "string" && body.user_id.trim().length > 0 ? body.user_id : undefined;
    const now = new Date().toISOString();
    let userMemory: MemoryRow[] = [];

    try {
      userMemory = await getUserMemory(supabaseUrl || "", supabaseServiceRoleKey || "", userId);
    } catch {
      userMemory = [];
    }

    if (!message) {
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiUrl = useGemini
      ? "https://ai.gateway.lovable.dev/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";
    const model = useGemini ? "google/gemini-2.5-flash" : "gpt-4o-mini";

    let plannerOutput: PlannerOutput;
    let parsedPlanner: unknown = null;
    try {
      parsedPlanner = await callModelForJson({
        apiUrl,
        apiKey,
        model,
        messages: [
          { role: "system", content: PLANNER_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              "Create a planner-only JSON response.",
              "",
              TOOL_CATALOG,
              "",
              `Current user message:\n${message}`,
              "",
              `Conversation history (recent):\n${JSON.stringify(conversationHistory.slice(-12), null, 2)}`,
              "",
              `Current time (ISO):\n${now}`,
              "",
              `User memory:\n${JSON.stringify(userMemory, null, 2)}`,
              "",
              `User context:\n${JSON.stringify(userContext, null, 2)}`,
            ].join("\n"),
          },
        ],
      });
      plannerOutput = normalizePlannerOutput(parsedPlanner);
    } catch {
      plannerOutput = normalizePlannerOutput({
        understanding: "Planner returned non-JSON output.",
        goal: "Provide a safe minimal plan response.",
        strategy: ["Clarify user intent", "Propose next best action safely"],
        actions: [],
        final_response:
          "I understood your request, but I could not produce a structured plan format this time. Please try rephrasing.",
      });
    }

    // Phase 5: bounded reasoning loop (plan -> execute -> observe -> re-plan)
    const MAX_ITERATIONS = 2;
    let iteration = 0;
    let currentPlan: PlannerOutput = plannerOutput;
    let finalResponse = plannerOutput.final_response;
    const allExecutedActions: ExecutedActionResult[] = [];
    const allActionsToConfirm: PlannerAction[] = [];
    const executedSignatures = new Set<string>();
    const confirmSignatures = new Set<string>();

    while (iteration < MAX_ITERATIONS) {
      iteration += 1;

      if (currentPlan.actions.length === 0 && allActionsToConfirm.length > 0) {
        break;
      }

      // Minimal-solution stop: if we already executed useful work and no new actions remain.
      if (currentPlan.actions.length === 0 && allExecutedActions.length > 0) {
        break;
      }

      if (currentPlan.actions.length === 0) {
        break;
      }

      const { actionsToConfirm, executedActions } = await executeActions(
        currentPlan.actions,
        {
          supabaseUrl: supabaseUrl || "",
          supabaseServiceRoleKey: supabaseServiceRoleKey || "",
          userId,
        },
        executedSignatures,
        confirmSignatures
      );

      allActionsToConfirm.push(...actionsToConfirm);
      allExecutedActions.push(...executedActions);

      // If nothing was executed and we're only waiting on confirmations, stop early.
      if (executedActions.length === 0 && actionsToConfirm.length > 0) {
        break;
      }

      // If nothing was executed, reflection is unnecessary.
      if (executedActions.length === 0) {
        break;
      }

      const reflection = await reflectOnExecution({
        apiUrl,
        apiKey,
        model,
        previousPlan: currentPlan,
        executedActions: allExecutedActions,
        remainingActions: allActionsToConfirm,
        iteration,
      });

      // Preserve original planner output if reflection fails.
      if (!reflection) {
        break;
      }

      if (reflection.updated_response) {
        finalResponse = reflection.updated_response;
      }

      if (reflection.is_complete === true) {
        break;
      }

      if (reflection.confidence > 0.8 && reflection.next_actions.length === 0) {
        break;
      }

      const dedupedNextActions = reflection.next_actions.filter((a) => {
        const signature = actionSignature(a);
        return !executedSignatures.has(signature) && !confirmSignatures.has(signature);
      });

      currentPlan = {
        ...currentPlan,
        actions: dedupedNextActions,
      };
    }

    // Memory writes are best-effort and must never block main flow.
    if (userId) {
      try {
        const lowerMessage = message.toLowerCase();
        const hasStruggleSignal =
          lowerMessage.includes("don't understand") ||
          lowerMessage.includes("dont understand") ||
          lowerMessage.includes("confused") ||
          lowerMessage.includes("hard");

        if (hasStruggleSignal) {
          const topic = (extractStruggleTopic(message) || "").trim().toLowerCase();
          if (topic.length > 3) {
            const struggleContent = `User struggled with ${topic}`;
            const exists = await isSimilarMemoryExists(
              supabaseUrl || "",
              supabaseServiceRoleKey || "",
              userId,
              struggleContent,
              "struggle"
            );
            if (!exists) {
              await storeMemory(supabaseUrl || "", supabaseServiceRoleKey || "", userId, {
                type: "struggle",
                content: struggleContent,
                metadata: { source: "agent", timestamp: now },
              });
            }
          }
        }

        const importantTools = new Set(["create_event", "create_assignment", "create_study_session"]);
        for (const executed of allExecutedActions) {
          if (!executed.success) continue;
          if (!importantTools.has(executed.tool)) continue;
          const eventContent = `User executed ${executed.tool}`;
          const exists = await isSimilarMemoryExists(
            supabaseUrl || "",
            supabaseServiceRoleKey || "",
            userId,
            eventContent,
            "event"
          );
          if (!exists) {
            await storeMemory(supabaseUrl || "", supabaseServiceRoleKey || "", userId, {
              type: "event",
              content: eventContent,
              metadata: {
                source: "agent",
                tool: executed.tool,
                args: executed.args,
                timestamp: now,
              },
            });
          }
        }
      } catch {
        // Ignore memory failures by design.
      }
    }

    return new Response(
      JSON.stringify({
        understanding: plannerOutput.understanding,
        goal: plannerOutput.goal,
        strategy: plannerOutput.strategy,
        actions_to_confirm: allActionsToConfirm,
        executed_actions: allExecutedActions,
        final_response: finalResponse || plannerOutput.final_response,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown planner error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
