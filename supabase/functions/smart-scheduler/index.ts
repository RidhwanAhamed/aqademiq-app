import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FreeSlot {
  date: string;
  start: string;
  end: string;
  duration_minutes: number;
}

interface ScheduleProposal {
  assignment_id: string;
  assignment_title: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  reasoning: string;
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

    const { days_ahead = 7 } = await req.json();

    // Step 1: Get pending assignments
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days_ahead);

    const { data: assignments, error: assignmentsError } = await supabaseClient
      .from("assignments")
      .select("id, title, due_date, estimated_hours, priority, course_id, courses(name)")
      .eq("user_id", user.id)
      .eq("is_completed", false)
      .gte("due_date", startDate.toISOString())
      .lte("due_date", endDate.toISOString())
      .order("due_date", { ascending: true })
      .order("priority", { ascending: true });

    if (assignmentsError) {
      throw new Error(`Failed to fetch assignments: ${assignmentsError.message}`);
    }

    if (!assignments || assignments.length === 0) {
      return new Response(
        JSON.stringify({ success: true, proposals: [], message: "No pending assignments in the selected period" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Get existing schedule blocks, exams, and study sessions
    const { data: scheduleBlocks } = await supabaseClient
      .from("schedule_blocks")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true);

    const { data: exams } = await supabaseClient
      .from("exams")
      .select("*")
      .eq("user_id", user.id)
      .gte("exam_date", startDate.toISOString())
      .lte("exam_date", endDate.toISOString());

    const { data: studySessions } = await supabaseClient
      .from("study_sessions")
      .select("*")
      .eq("user_id", user.id)
      .gte("scheduled_start", startDate.toISOString())
      .lte("scheduled_start", endDate.toISOString());

    // Step 3: Find free slots (8 AM - 10 PM, minimum 30 minutes)
    const freeSlots: FreeSlot[] = [];
    
    for (let d = 0; d < days_ahead; d++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + d);
      const dateStr = currentDate.toISOString().split("T")[0];
      const dayOfWeek = currentDate.getDay();

      // Build busy slots for this day
      const busySlots: { start: number; end: number }[] = [];

      // Add schedule blocks for this day of week
      scheduleBlocks?.forEach((block) => {
        if (block.day_of_week === dayOfWeek) {
          const [startH, startM] = block.start_time.split(":").map(Number);
          const [endH, endM] = block.end_time.split(":").map(Number);
          busySlots.push({
            start: startH * 60 + startM,
            end: endH * 60 + endM,
          });
        }
      });

      // Add exams for this day
      exams?.forEach((exam) => {
        const examDate = new Date(exam.exam_date);
        if (examDate.toISOString().split("T")[0] === dateStr) {
          const startMinutes = examDate.getHours() * 60 + examDate.getMinutes();
          busySlots.push({
            start: startMinutes,
            end: startMinutes + (exam.duration_minutes || 120),
          });
        }
      });

      // Add study sessions for this day
      studySessions?.forEach((session) => {
        const sessionDate = new Date(session.scheduled_start);
        if (sessionDate.toISOString().split("T")[0] === dateStr) {
          const startMinutes = sessionDate.getHours() * 60 + sessionDate.getMinutes();
          const endDate = new Date(session.scheduled_end);
          const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
          busySlots.push({ start: startMinutes, end: endMinutes });
        }
      });

      // Sort busy slots
      busySlots.sort((a, b) => a.start - b.start);

      // Find gaps between 8 AM (480 mins) and 10 PM (1320 mins)
      const dayStart = 480; // 8 AM
      const dayEnd = 1320; // 10 PM
      let currentTime = dayStart;

      for (const slot of busySlots) {
        if (slot.start > currentTime && slot.start >= dayStart && currentTime < dayEnd) {
          const gapStart = Math.max(currentTime, dayStart);
          const gapEnd = Math.min(slot.start, dayEnd);
          const duration = gapEnd - gapStart;
          if (duration >= 30) {
            freeSlots.push({
              date: dateStr,
              start: `${Math.floor(gapStart / 60).toString().padStart(2, "0")}:${(gapStart % 60).toString().padStart(2, "0")}`,
              end: `${Math.floor(gapEnd / 60).toString().padStart(2, "0")}:${(gapEnd % 60).toString().padStart(2, "0")}`,
              duration_minutes: duration,
            });
          }
        }
        currentTime = Math.max(currentTime, slot.end);
      }

      // Check remaining time after last busy slot
      if (currentTime < dayEnd) {
        const duration = dayEnd - currentTime;
        if (duration >= 30) {
          freeSlots.push({
            date: dateStr,
            start: `${Math.floor(currentTime / 60).toString().padStart(2, "0")}:${(currentTime % 60).toString().padStart(2, "0")}`,
            end: `${Math.floor(dayEnd / 60).toString().padStart(2, "0")}:${(dayEnd % 60).toString().padStart(2, "0")}`,
            duration_minutes: duration,
          });
        }
      }
    }

    if (freeSlots.length === 0) {
      return new Response(
        JSON.stringify({ success: true, proposals: [], message: "No free slots available in the selected period" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 4: Use AI to fit tasks into slots
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tasksForAI = assignments.map((a) => ({
      id: a.id,
      title: a.title,
      course: (a.courses as Array<{ name: string }> | null)?.[0]?.name || "Unknown",
      due_date: a.due_date,
      estimated_hours: a.estimated_hours || 1,
      priority: a.priority || 3,
    }));

    const prompt = `Schedule these academic tasks into the available time slots.

TASKS (sorted by priority and deadline):
${JSON.stringify(tasksForAI, null, 2)}

AVAILABLE FREE SLOTS:
${JSON.stringify(freeSlots, null, 2)}

Rules:
1. Prioritize tasks with nearest deadlines
2. High priority tasks should be scheduled first
3. Don't schedule tasks for times after their due date
4. Prefer morning slots for intensive work
5. Allow buffer time between tasks
6. Match task duration to slot duration (can split across days)`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an academic scheduling optimizer. Create optimal study schedules that maximize productivity." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_schedule",
              description: "Create an optimized schedule by assigning tasks to free slots",
              parameters: {
                type: "object",
                properties: {
                  proposals: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        assignment_id: { type: "string" },
                        assignment_title: { type: "string" },
                        slot_date: { type: "string", description: "YYYY-MM-DD format" },
                        start_time: { type: "string", description: "HH:MM format" },
                        end_time: { type: "string", description: "HH:MM format" },
                        reasoning: { type: "string", description: "Brief explanation for this placement" },
                      },
                      required: ["assignment_id", "assignment_title", "slot_date", "start_time", "end_time", "reasoning"],
                    },
                  },
                },
                required: ["proposals"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_schedule" } },
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

    const { proposals }: { proposals: ScheduleProposal[] } = JSON.parse(toolCall.function.arguments);

    // Save proposed schedule to database
    const { data: savedProposal, error: saveError } = await supabaseClient
      .from("proposed_schedules")
      .insert({
        user_id: user.id,
        proposed_items: proposals,
        status: "pending",
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving proposal:", saveError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        proposal_id: savedProposal?.id,
        proposals,
        free_slots_count: freeSlots.length,
        assignments_count: assignments.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in smart-scheduler:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
