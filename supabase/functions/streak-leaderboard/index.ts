import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user from JWT
    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse limit from query params
    const url = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50", 10), 1), 100);

    // Fetch leaderboard and current user rank in parallel
    const [leaderboardResult, userRankResult] = await Promise.all([
      supabase.rpc("get_streak_leaderboard", { p_limit: limit }),
      supabase.rpc("get_user_streak_rank", { p_user_id: user.id }),
    ]);

    if (leaderboardResult.error) {
      throw new Error(`Leaderboard query failed: ${leaderboardResult.error.message}`);
    }
    if (userRankResult.error) {
      throw new Error(`User rank query failed: ${userRankResult.error.message}`);
    }

    const leaderboard = (leaderboardResult.data || []).map((row: any) => ({
      userId: row.user_id,
      name: row.full_name || "Anonymous",
      maxStreak: row.study_streak,
      rank: Number(row.rank),
    }));

    const currentUserData = userRankResult.data?.[0];
    const currentUser = currentUserData
      ? {
          userId: currentUserData.user_id,
          name: currentUserData.full_name || "Anonymous",
          maxStreak: currentUserData.study_streak,
          rank: Number(currentUserData.rank),
        }
      : null;

    return new Response(
      JSON.stringify({ leaderboard, currentUser }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Streak leaderboard error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
