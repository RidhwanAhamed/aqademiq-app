import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Nudge {
  type: "skip_warning" | "deadline_urgent" | "breakdown_suggest" | "overdue";
  assignment_id: string;
  assignment_title: string;
  message: string;
  action_label: string;
  action_type: "breakdown" | "do_now" | "reschedule";
  priority: number;
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

    const nudges: Nudge[] = [];

    // Check for assignments moved multiple times
    const { data: rescheduledAssignments } = await supabaseClient
      .from("assignments")
      .select("id, title, reschedule_count, due_date, estimated_hours")
      .eq("user_id", user.id)
      .eq("is_completed", false)
      .gte("reschedule_count", 3)
      .order("reschedule_count", { ascending: false })
      .limit(3);

    rescheduledAssignments?.forEach((assignment) => {
      nudges.push({
        type: "skip_warning",
        assignment_id: assignment.id,
        assignment_title: assignment.title,
        message: `You've moved "${assignment.title}" ${assignment.reschedule_count} times. Do you want me to break it into a 5-minute micro-task instead?`,
        action_label: "Break It Down",
        action_type: "breakdown",
        priority: 1,
      });
    });

    // Check for overdue assignments
    const now = new Date().toISOString();
    const { data: overdueAssignments } = await supabaseClient
      .from("assignments")
      .select("id, title, due_date, estimated_hours")
      .eq("user_id", user.id)
      .eq("is_completed", false)
      .lt("due_date", now)
      .order("due_date", { ascending: true })
      .limit(3);

    overdueAssignments?.forEach((assignment) => {
      const daysOverdue = Math.floor(
        (new Date().getTime() - new Date(assignment.due_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      nudges.push({
        type: "overdue",
        assignment_id: assignment.id,
        assignment_title: assignment.title,
        message: `"${assignment.title}" is ${daysOverdue} day${daysOverdue > 1 ? "s" : ""} overdue. Let's figure out what's blocking you.`,
        action_label: "Work on This",
        action_type: "do_now",
        priority: 2,
      });
    });

    // Check for assignments due within 24 hours with low completion
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24);
    
    const { data: urgentAssignments } = await supabaseClient
      .from("assignments")
      .select("id, title, due_date, completion_percentage, estimated_hours")
      .eq("user_id", user.id)
      .eq("is_completed", false)
      .gte("due_date", now)
      .lte("due_date", tomorrow.toISOString())
      .or("completion_percentage.is.null,completion_percentage.lt.50")
      .limit(3);

    urgentAssignments?.forEach((assignment) => {
      const hoursLeft = Math.floor(
        (new Date(assignment.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60)
      );
      nudges.push({
        type: "deadline_urgent",
        assignment_id: assignment.id,
        assignment_title: assignment.title,
        message: `"${assignment.title}" is due in ${hoursLeft} hours and only ${assignment.completion_percentage || 0}% complete!`,
        action_label: "Start Now",
        action_type: "do_now",
        priority: 1,
      });
    });

    // Check for complex assignments that could use breakdown
    const { data: complexAssignments } = await supabaseClient
      .from("assignments")
      .select("id, title, estimated_hours, breakdown_status")
      .eq("user_id", user.id)
      .eq("is_completed", false)
      .gte("estimated_hours", 3)
      .or("breakdown_status.is.null,breakdown_status.eq.none")
      .limit(2);

    complexAssignments?.forEach((assignment) => {
      nudges.push({
        type: "breakdown_suggest",
        assignment_id: assignment.id,
        assignment_title: assignment.title,
        message: `"${assignment.title}" is a ${assignment.estimated_hours}-hour task. Want me to break it into smaller, manageable steps?`,
        action_label: "Break Down",
        action_type: "breakdown",
        priority: 3,
      });
    });

    // Sort nudges by priority
    nudges.sort((a, b) => a.priority - b.priority);

    // Record nudges in history (skip if already nudged recently)
    for (const nudge of nudges.slice(0, 3)) {
      // Check if we already nudged this assignment today
      const { data: recentNudge } = await supabaseClient
        .from("nudge_history")
        .select("id")
        .eq("user_id", user.id)
        .eq("assignment_id", nudge.assignment_id)
        .eq("nudge_type", nudge.type)
        .gte("triggered_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (!recentNudge) {
        await supabaseClient.from("nudge_history").insert({
          user_id: user.id,
          assignment_id: nudge.assignment_id,
          nudge_type: nudge.type,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        nudges: nudges.slice(0, 3), // Return top 3 nudges
        total_issues: nudges.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in check-nudges:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
