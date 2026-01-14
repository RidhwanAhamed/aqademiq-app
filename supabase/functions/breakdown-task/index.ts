import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MicroTask {
  title: string;
  description: string;
  estimated_minutes: number;
  priority: "low" | "medium" | "high";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { assignment_id } = await req.json();
    if (!assignment_id) {
      return new Response(JSON.stringify({ error: "assignment_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the assignment
    const { data: assignment, error: assignmentError } = await supabaseClient
      .from("assignments")
      .select("*, courses(name)")
      .eq("id", assignment_id)
      .eq("user_id", user.id)
      .single();

    if (assignmentError || !assignment) {
      return new Response(JSON.stringify({ error: "Assignment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Lovable AI to generate micro-tasks
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Break down this academic task into 3-5 actionable micro-steps, each taking less than 30 minutes to complete.

Task: "${assignment.title}"
${assignment.description ? `Description: ${assignment.description}` : ""}
Course: ${assignment.courses?.name || "Unknown"}
Due Date: ${assignment.due_date}
Estimated Total Hours: ${assignment.estimated_hours || "Not specified"}

Create specific, actionable steps that a student can complete one at a time. Each step should:
- Be completable in under 30 minutes
- Have a clear action verb (Research, Write, Review, etc.)
- Build logically on previous steps`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an academic task breakdown specialist. You help students break overwhelming assignments into manageable micro-tasks." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_micro_tasks",
              description: "Create a list of 3-5 micro-tasks for the assignment",
              parameters: {
                type: "object",
                properties: {
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Short, action-oriented title" },
                        description: { type: "string", description: "Brief description of what to do" },
                        estimated_minutes: { type: "number", description: "Estimated time in minutes (max 30)" },
                        priority: { type: "string", enum: ["low", "medium", "high"], description: "Task priority" },
                      },
                      required: ["title", "description", "estimated_minutes", "priority"],
                    },
                  },
                },
                required: ["tasks"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_micro_tasks" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add more credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("Failed to parse AI response");
    }

    const { tasks: microTasks }: { tasks: MicroTask[] } = JSON.parse(toolCall.function.arguments);

    // Insert micro-tasks into the tasks table
    const tasksToInsert = microTasks.map((task, index) => ({
      user_id: user.id,
      assignment_id: assignment_id,
      title: task.title,
      description: task.description,
      estimated_minutes: Math.min(task.estimated_minutes, 30),
      priority: task.priority === "high" ? 1 : task.priority === "medium" ? 2 : 3,
      order_index: index,
      is_completed: false,
      task_type: "micro_task",
    }));

    const { data: insertedTasks, error: insertError } = await supabaseClient
      .from("tasks")
      .insert(tasksToInsert)
      .select();

    if (insertError) {
      console.error("Error inserting tasks:", insertError);
      throw new Error("Failed to save micro-tasks");
    }

    // Update assignment breakdown status
    await supabaseClient
      .from("assignments")
      .update({ breakdown_status: "generated" })
      .eq("id", assignment_id);

    return new Response(
      JSON.stringify({
        success: true,
        tasks: insertedTasks,
        message: `Created ${insertedTasks.length} micro-tasks`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in breakdown-task:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
