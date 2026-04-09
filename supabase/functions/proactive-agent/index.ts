import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Suggestion = {
  message: string;
  metadata: Record<string, unknown>;
};

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function extractStruggleTopic(content: string): string | null {
  const match = content.toLowerCase().match(/struggled with\s+(.+)/);
  if (!match?.[1]) return null;
  return match[1].replace(/[.?!]+$/, "").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      throw new Error("Supabase service configuration missing");
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const userId = typeof body?.user_id === "string" ? body.user_id : "";

    if (!userId) {
      return new Response(JSON.stringify({ error: "user_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const inTwoDays = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const dayStart = startOfUtcDay(now);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const sixHoursAgoIso = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();

    // Prevent spam: if suggestion exists in past 6h, skip.
    const { data: recentSuggestions } = await supabase
      .from("proactive_suggestions")
      .select("id, created_at")
      .eq("user_id", userId)
      .gte("created_at", sixHoursAgoIso)
      .order("created_at", { ascending: false })
      .limit(1);

    if (recentSuggestions && recentSuggestions.length > 0) {
      return new Response(JSON.stringify({ suggestions_created: 0, reason: "cooldown_active" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [examsResult, studySessionsResult, memoryResult] = await Promise.all([
      supabase
        .from("exams")
        .select("id, title, exam_date")
        .eq("user_id", userId)
        .gte("exam_date", now.toISOString())
        .lte("exam_date", inTwoDays.toISOString())
        .order("exam_date", { ascending: true })
        .limit(3),
      supabase
        .from("study_sessions")
        .select("id")
        .eq("user_id", userId)
        .gte("scheduled_start", dayStart.toISOString())
        .lt("scheduled_start", dayEnd.toISOString())
        .limit(1),
      supabase
        .from("user_memory")
        .select("id, type, content, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const upcomingExams = examsResult.data || [];
    const todayStudySessions = studySessionsResult.data || [];
    const recentMemory = memoryResult.data || [];

    let suggestion: Suggestion | null = null;

    // RULE 1: Exam Soon (24-48h)
    if (upcomingExams.length > 0) {
      const exam = upcomingExams[0];
      suggestion = {
        message: `Your exam "${exam.title}" is coming up soon. Want to revise now?`,
        metadata: {
          type: "exam_reminder",
          exam_id: exam.id,
          exam_date: exam.exam_date,
        },
      };
    }

    // RULE 2: No Study Today
    if (!suggestion && todayStudySessions.length === 0) {
      suggestion = {
        message: "You haven't studied today. Want me to schedule a focused study session?",
        metadata: {
          type: "study_nudge",
          day_start: dayStart.toISOString(),
        },
      };
    }

    // RULE 3: Repeated Struggle
    if (!suggestion) {
      const struggleRows = recentMemory.filter((m: any) => m.type === "struggle");
      const topicCounts = new Map<string, number>();
      for (const row of struggleRows) {
        const topic = extractStruggleTopic(row.content || "");
        if (!topic) continue;
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      }

      const repeatedTopic = Array.from(topicCounts.entries()).find(([, count]) => count >= 2)?.[0];
      if (repeatedTopic) {
        suggestion = {
          message: `You've been struggling with ${repeatedTopic}. Want a focused revision plan?`,
          metadata: {
            type: "struggle_support",
            topic: repeatedTopic,
          },
        };
      }
    }

    if (!suggestion) {
      return new Response(JSON.stringify({ suggestions_created: 0, reason: "no_trigger" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insertError } = await supabase.from("proactive_suggestions").insert({
      user_id: userId,
      message: suggestion.message,
      metadata: suggestion.metadata,
    });

    if (insertError) {
      throw insertError;
    }

    return new Response(JSON.stringify({ suggestions_created: 1 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        suggestions_created: 0,
        error: error instanceof Error ? error.message : "Unknown proactive-agent error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
