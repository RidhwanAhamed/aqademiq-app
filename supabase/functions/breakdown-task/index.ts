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

interface ScheduleSlot {
  date: string;
  start_time: string;
  end_time: string;
}

// Helper to add minutes to a time string
function addMinutesToTime(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  return `${String(newHours).padStart(2, "0")}:${String(newMinutes).padStart(2, "0")}:00`;
}

// Helper to check if two time ranges overlap
function timesOverlap(
  start1: string, end1: string, 
  start2: string, end2: string
): boolean {
  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const s1 = toMinutes(start1), e1 = toMinutes(end1);
  const s2 = toMinutes(start2), e2 = toMinutes(end2);
  return s1 < e2 && s2 < e1;
}

// Find available slots for a given date, avoiding conflicts
function findAvailableSlots(
  date: string,
  durationMinutes: number,
  existingBlocks: Array<{ specific_date: string | null; day_of_week: number | null; start_time: string; end_time: string }>,
  workdayStart = 9,
  workdayEnd = 21
): ScheduleSlot | null {
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay();
  
  // Get blocks for this specific date or recurring on this day
  const dayBlocks = existingBlocks.filter(b => 
    b.specific_date === date || b.day_of_week === dayOfWeek
  ).sort((a, b) => a.start_time.localeCompare(b.start_time));
  
  // Try to find a slot between workday hours
  let currentStart = workdayStart;
  
  for (const block of dayBlocks) {
    const [blockStartH] = block.start_time.split(":").map(Number);
    const [blockEndH, blockEndM] = block.end_time.split(":").map(Number);
    const blockEnd = blockEndH + blockEndM / 60;
    
    // Check if we can fit before this block
    const slotEnd = currentStart + durationMinutes / 60;
    if (slotEnd <= blockStartH && currentStart >= workdayStart) {
      const startTime = `${String(Math.floor(currentStart)).padStart(2, "0")}:${String(Math.round((currentStart % 1) * 60)).padStart(2, "0")}:00`;
      const endTime = addMinutesToTime(startTime, durationMinutes);
      return { date, start_time: startTime, end_time: endTime };
    }
    
    // Move current start past this block
    currentStart = Math.max(currentStart, blockEnd);
  }
  
  // Check if we can fit after all blocks
  const slotEnd = currentStart + durationMinutes / 60;
  if (slotEnd <= workdayEnd && currentStart >= workdayStart) {
    const startTime = `${String(Math.floor(currentStart)).padStart(2, "0")}:${String(Math.round((currentStart % 1) * 60)).padStart(2, "0")}:00`;
    const endTime = addMinutesToTime(startTime, durationMinutes);
    return { date, start_time: startTime, end_time: endTime };
  }
  
  return null;
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

    // Fetch existing schedule blocks to avoid conflicts
    const { data: existingBlocks } = await supabaseClient
      .from("schedule_blocks")
      .select("specific_date, day_of_week, start_time, end_time")
      .eq("user_id", user.id)
      .eq("is_active", true);

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

    // Calculate recommended schedule for each task
    const dueDate = new Date(assignment.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate days available (from today to due date - 1)
    const daysUntilDue = Math.max(1, Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    const tasksPerDay = Math.ceil(microTasks.length / daysUntilDue);
    
    // Track used slots to avoid scheduling conflicts between tasks
    const usedSlots: Array<{ date: string; start_time: string; end_time: string }> = [];
    
    // Insert micro-tasks with recommended scheduling
    const tasksToInsert = microTasks.map((task, index) => {
      const estimatedMinutes = Math.min(task.estimated_minutes, 30);
      
      // Calculate which day to schedule this task
      const dayOffset = Math.min(Math.floor(index / tasksPerDay), daysUntilDue - 1);
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + dayOffset);
      const dateStr = targetDate.toISOString().split("T")[0];
      
      // Combine existing blocks with already-used slots for this scheduling session
      const allBlocksForDate = [
        ...(existingBlocks || []),
        ...usedSlots.filter(s => s.date === dateStr).map(s => ({
          specific_date: s.date,
          day_of_week: null,
          start_time: s.start_time,
          end_time: s.end_time
        }))
      ];
      
      // Find an available slot
      const slot = findAvailableSlots(dateStr, estimatedMinutes, allBlocksForDate);
      
      // Track this slot as used
      if (slot) {
        usedSlots.push({ date: slot.date, start_time: slot.start_time, end_time: slot.end_time });
      }
      
      return {
        user_id: user.id,
        assignment_id: assignment_id,
        title: task.title,
        description: task.description,
        estimated_minutes: estimatedMinutes,
        priority: task.priority === "high" ? 1 : task.priority === "medium" ? 2 : 3,
        order_index: index,
        is_completed: false,
        task_type: "micro_task",
        due_date: slot ? `${slot.date}T${slot.start_time}` : null,
      };
    });

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
