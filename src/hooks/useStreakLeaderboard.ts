import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LeaderboardEntry {
  userId: string;
  name: string;
  maxStreak: number;
  rank: number;
}

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
}

export function useStreakLeaderboard(limit = 50) {
  return useQuery<LeaderboardResponse>({
    queryKey: ["streak-leaderboard", limit],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "streak-leaderboard",
        {
          method: "GET",
          headers: {},
        }
      );

      if (error) throw error;
      return data as LeaderboardResponse;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
