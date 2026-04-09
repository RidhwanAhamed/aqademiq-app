import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ProactiveSuggestion = {
  id: string;
  user_id: string;
  message: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
};

const POLL_INTERVAL_MS = 60_000;

export function useProactiveSuggestions() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    if (!user) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("proactive_suggestions")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) throw error;
      setSuggestions((data || []) as ProactiveSuggestion[]);
    } catch (error) {
      console.error("Failed to fetch proactive suggestions:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (id: string) => {
    if (!id) return;

    // Optimistic UI: hide immediately.
    setSuggestions((prev) => prev.filter((s) => s.id !== id));

    try {
      const { error } = await supabase
        .from("proactive_suggestions")
        .update({ is_read: true })
        .eq("id", id);

      if (error) throw error;
    } catch (error) {
      console.error("Failed to mark suggestion as read:", error);
      // Restore authoritative state if update failed.
      await fetchSuggestions();
    }
  }, [fetchSuggestions]);

  useEffect(() => {
    void fetchSuggestions();

    const intervalId = window.setInterval(() => {
      void fetchSuggestions();
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [fetchSuggestions]);

  return {
    suggestions,
    loading,
    markAsRead,
    refresh: fetchSuggestions,
  };
}
