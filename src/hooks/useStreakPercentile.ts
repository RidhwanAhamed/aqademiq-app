import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface StreakPercentileData {
  rank: number;
  totalUsers: number;
  percentile: number; // e.g., 85 means "Top 15%"
  topPercent: number; // e.g., 15 means "Top 15%"
  streak: number;
}

export function useStreakPercentile() {
  const { user } = useAuth();

  return useQuery<StreakPercentileData | null>({
    queryKey: ["streak-percentile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase.functions.invoke(
        "streak-leaderboard",
        { method: "GET" }
      );

      if (error) throw error;

      const totalUsers = data?.leaderboard?.length || 1;
      const currentUser = data?.currentUser;

      if (!currentUser) return null;

      const rank = currentUser.rank;
      const percentile = Math.round(((totalUsers - rank + 1) / totalUsers) * 100);
      const topPercent = Math.max(1, Math.round((rank / totalUsers) * 100));

      return {
        rank,
        totalUsers,
        percentile,
        topPercent,
        streak: currentUser.maxStreak,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
