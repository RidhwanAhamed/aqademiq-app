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
      // First, try to call the edge function
      const { data, error } = await supabase.functions.invoke("check-nudges", {
        body: {},
      });

      if (error) {
        console.error("Edge function error, falling back to client-side check:", error);
        // Fallback: generate nudges client-side
        await generateClientSideNudges();
        return;
      }

      if (data?.nudges) {
        // Filter out dismissed nudges
        const activeNudges = data.nudges.filter(
          (n: SmartNudge) => !dismissed.includes(n.assignment_id)
        );
        setNudges(activeNudges);
      }
    } catch (err) {
      console.error("Error fetching nudges:", err);
      // Fallback to client-side generation
      await generateClientSideNudges();
    } finally {
      setLoading(false);
    }
  }, [user, dismissed]);

  // Client-side fallback for generating nudges
  const generateClientSideNudges = useCallback(async () => {
    if (!user) return;

    try {
      const now = new Date();
      const oneDayAhead = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Get assignments with various conditions
      const { data: assignments } = await supabase
        .from("assignments")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_completed", false)
        .order("due_date", { ascending: true });

      if (!assignments) return;

      const generatedNudges: SmartNudge[] = [];

      for (const assignment of assignments) {
        const dueDate = new Date(assignment.due_date);
        const rescheduleCount = assignment.reschedule_count || 0;
        const completionPercentage = assignment.completion_percentage || 0;

        // Skip warning: Assignment postponed 3+ times
        if (rescheduleCount >= 3 && !dismissed.includes(assignment.id)) {
          generatedNudges.push({
            type: "skip_warning",
            assignment_id: assignment.id,
            assignment_title: assignment.title,
            message: `You've postponed this ${rescheduleCount} times. Consider breaking it into smaller tasks.`,
            action_label: "Break it down",
            action_type: "breakdown",
            priority: 1,
          });
          continue;
        }

        // Overdue: Past due date
        if (dueDate < now && !dismissed.includes(assignment.id)) {
          generatedNudges.push({
            type: "overdue",
            assignment_id: assignment.id,
            assignment_title: assignment.title,
            message: `This assignment is past due! Take action now.`,
            action_label: "Start now",
            action_type: "do_now",
            priority: 0,
          });
          continue;
        }

        // Urgent deadline: Due within 24 hours with low completion
        if (dueDate <= oneDayAhead && dueDate > now && completionPercentage < 50 && !dismissed.includes(assignment.id)) {
          const hoursLeft = Math.round((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));
          generatedNudges.push({
            type: "deadline_urgent",
            assignment_id: assignment.id,
            assignment_title: assignment.title,
            message: `Due in ${hoursLeft} hours with only ${completionPercentage}% complete.`,
            action_label: "Focus now",
            action_type: "do_now",
            priority: 1,
          });
          continue;
        }

        // Breakdown suggestion: Large task (3+ hours) not broken down
        if (
          (assignment.estimated_hours || 0) >= 3 &&
          !assignment.breakdown_status &&
          completionPercentage === 0 &&
          !dismissed.includes(assignment.id)
        ) {
          generatedNudges.push({
            type: "breakdown_suggest",
            assignment_id: assignment.id,
            assignment_title: assignment.title,
            message: `This is a ${assignment.estimated_hours}h task. Breaking it down can help!`,
            action_label: "Magic Breakdown",
            action_type: "breakdown",
            priority: 2,
          });
        }
      }

      // Sort by priority (lower = more urgent)
      generatedNudges.sort((a, b) => a.priority - b.priority);

      setNudges(generatedNudges.filter(n => !dismissed.includes(n.assignment_id)));
    } catch (err) {
      console.error("Error generating client-side nudges:", err);
    }
  }, [user, dismissed]);

  const dismissNudge = useCallback(async (assignmentId: string, actionTaken?: string) => {
    setDismissed((prev) => [...prev, assignmentId]);
    setNudges((prev) => prev.filter((n) => n.assignment_id !== assignmentId));

    // Record the dismissal in history
    if (user) {
      try {
        // First check if there's an existing nudge history entry
        const { data: existingEntry } = await supabase
          .from("nudge_history")
          .select("id")
          .eq("user_id", user.id)
          .eq("assignment_id", assignmentId)
          .is("dismissed_at", null)
          .single();

        if (existingEntry) {
          await supabase
            .from("nudge_history")
            .update({
              dismissed_at: new Date().toISOString(),
              action_taken: actionTaken || "dismissed",
            })
            .eq("id", existingEntry.id);
        } else {
          // Create a new entry
          await supabase
            .from("nudge_history")
            .insert({
              user_id: user.id,
              assignment_id: assignmentId,
              nudge_type: "user_action",
              dismissed_at: new Date().toISOString(),
              action_taken: actionTaken || "dismissed",
            });
        }
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

    // Check every 15 minutes (reduced from 30 for better responsiveness)
    const interval = setInterval(fetchNudges, 15 * 60 * 1000);
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
