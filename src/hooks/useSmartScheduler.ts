import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface ScheduleProposal {
  assignment_id: string;
  assignment_title: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  reasoning: string;
  accepted?: boolean;
}

export function useSmartScheduler() {
  const [loading, setLoading] = useState(false);
  const [proposals, setProposals] = useState<ScheduleProposal[]>([]);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const generateSchedule = useCallback(async (daysAhead: number = 7) => {
    if (!user) return { success: false };

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("smart-scheduler", {
        body: { days_ahead: daysAhead },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return { success: false };
      }

      if (data.proposals && data.proposals.length > 0) {
        setProposals(data.proposals.map((p: ScheduleProposal) => ({ ...p, accepted: true })));
        setProposalId(data.proposal_id);
        toast({
          title: "Schedule Generated!",
          description: `Found ${data.proposals.length} optimal time slots for your tasks.`,
        });
        return { success: true, proposals: data.proposals };
      } else {
        toast({
          title: "No Proposals",
          description: data.message || "No scheduling suggestions available.",
        });
        return { success: true, proposals: [] };
      }
    } catch (err) {
      console.error("Error generating schedule:", err);
      toast({
        title: "Error",
        description: "Failed to generate schedule. Please try again.",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const toggleProposal = useCallback((index: number) => {
    setProposals((prev) =>
      prev.map((p, i) => (i === index ? { ...p, accepted: !p.accepted } : p))
    );
  }, []);

  const acceptSchedule = useCallback(async () => {
    if (!user) return { success: false };

    const acceptedProposals = proposals.filter((p) => p.accepted);
    if (acceptedProposals.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one time slot to accept.",
        variant: "destructive",
      });
      return { success: false };
    }

    setLoading(true);
    try {
      // Create study sessions for accepted proposals
      const sessionsToCreate = acceptedProposals.map((p) => ({
        user_id: user.id,
        title: `Study: ${p.assignment_title}`,
        assignment_id: p.assignment_id,
        scheduled_start: `${p.slot_date}T${p.start_time}:00`,
        scheduled_end: `${p.slot_date}T${p.end_time}:00`,
        status: "scheduled",
        notes: p.reasoning,
      }));

      const { error: insertError } = await supabase
        .from("study_sessions")
        .insert(sessionsToCreate);

      if (insertError) throw insertError;

      // Update proposal status
      if (proposalId) {
        await supabase
          .from("proposed_schedules")
          .update({
            status: acceptedProposals.length === proposals.length ? "accepted" : "partial",
          })
          .eq("id", proposalId);
      }

      toast({
        title: "Schedule Saved!",
        description: `Added ${acceptedProposals.length} study sessions to your calendar.`,
      });

      // Clear proposals
      setProposals([]);
      setProposalId(null);

      return { success: true };
    } catch (err) {
      console.error("Error accepting schedule:", err);
      toast({
        title: "Error",
        description: "Failed to save schedule. Please try again.",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [user, proposals, proposalId, toast]);

  const rejectSchedule = useCallback(async () => {
    if (proposalId && user) {
      await supabase
        .from("proposed_schedules")
        .update({ status: "rejected" })
        .eq("id", proposalId);
    }
    setProposals([]);
    setProposalId(null);
    toast({
      title: "Schedule Dismissed",
      description: "You can generate a new schedule anytime.",
    });
  }, [proposalId, user, toast]);

  return {
    loading,
    proposals,
    hasProposals: proposals.length > 0,
    generateSchedule,
    toggleProposal,
    acceptSchedule,
    rejectSchedule,
  };
}
