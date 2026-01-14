import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface SmartNudge {
  type: "skip_warning" | "deadline_urgent" | "breakdown_suggest" | "overdue";
  assignment_id: string;
  assignment_title: string;
  message: string;
  action_label: string;
  action_type: "breakdown" | "do_now" | "reschedule";
  priority: number;
}

export function useSmartNudges() {
  const [nudges, setNudges] = useState<SmartNudge[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const { user } = useAuth();

  const fetchNudges = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-nudges", {
        body: {},
      });

      if (error) throw error;

      if (data.nudges) {
        // Filter out dismissed nudges
        const activeNudges = data.nudges.filter(
          (n: SmartNudge) => !dismissed.includes(n.assignment_id)
        );
        setNudges(activeNudges);
      }
    } catch (err) {
      console.error("Error fetching nudges:", err);
    } finally {
      setLoading(false);
    }
  }, [user, dismissed]);

  const dismissNudge = useCallback(async (assignmentId: string, actionTaken?: string) => {
    setDismissed((prev) => [...prev, assignmentId]);
    setNudges((prev) => prev.filter((n) => n.assignment_id !== assignmentId));

    // Record the dismissal in history
    if (user) {
      try {
        await supabase
          .from("nudge_history")
          .update({
            dismissed_at: new Date().toISOString(),
            action_taken: actionTaken || "dismissed",
          })
          .eq("user_id", user.id)
          .eq("assignment_id", assignmentId)
          .is("dismissed_at", null);
      } catch (err) {
        console.error("Error recording nudge dismissal:", err);
      }
    }
  }, [user]);

  const snoozeNudge = useCallback((assignmentId: string, minutes: number = 60) => {
    // Temporarily dismiss, will reappear on next check
    setNudges((prev) => prev.filter((n) => n.assignment_id !== assignmentId));
    
    // Re-add to nudges after snooze period
    setTimeout(() => {
      setDismissed((prev) => prev.filter((id) => id !== assignmentId));
    }, minutes * 60 * 1000);
  }, []);

  // Check for nudges on mount and periodically
  useEffect(() => {
    fetchNudges();

    // Check every 30 minutes
    const interval = setInterval(fetchNudges, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNudges]);

  const currentNudge = nudges[0] || null;

  return {
    nudges,
    currentNudge,
    loading,
    fetchNudges,
    dismissNudge,
    snoozeNudge,
    hasNudges: nudges.length > 0,
  };
}
