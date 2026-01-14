import { useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SimulationResult {
  originalBalance: number; // hours available - hours required
  afterDelayBalance: number;
  totalTaskHours: number;
  availableFreeHours: number;
  dailyRequiredHours: number;
  status: "green" | "yellow" | "red";
  warningMessage: string;
  daysUntilDeadline: number;
}

export function useWorkloadSimulation() {
  const [loading, setLoading] = useState(false);
  const [delayDays, setDelayDays] = useState(0);
  const [simulationData, setSimulationData] = useState<{
    totalTaskHours: number;
    availableFreeHours: number;
    assignments: { title: string; hours: number; dueDate: string }[];
  } | null>(null);
  const { user } = useAuth();

  const fetchWorkloadData = useCallback(async () => {
    if (!user) return null;

    setLoading(true);
    try {
      const now = new Date();
      const twoWeeksAhead = new Date();
      twoWeeksAhead.setDate(twoWeeksAhead.getDate() + 14);

      // Get pending assignments for next 2 weeks
      const { data: assignments } = await supabase
        .from("assignments")
        .select("id, title, due_date, estimated_hours")
        .eq("user_id", user.id)
        .eq("is_completed", false)
        .gte("due_date", now.toISOString())
        .lte("due_date", twoWeeksAhead.toISOString())
        .order("due_date", { ascending: true });

      // Calculate total task hours
      const totalTaskHours = (assignments || []).reduce(
        (sum, a) => sum + (a.estimated_hours || 1),
        0
      );

      // Get schedule blocks to estimate busy time
      const { data: scheduleBlocks } = await supabase
        .from("schedule_blocks")
        .select("start_time, end_time, day_of_week")
        .eq("user_id", user.id)
        .eq("is_active", true);

      // Calculate weekly busy hours from schedule
      let weeklyBusyHours = 0;
      scheduleBlocks?.forEach((block) => {
        const [startH, startM] = block.start_time.split(":").map(Number);
        const [endH, endM] = block.end_time.split(":").map(Number);
        weeklyBusyHours += (endH + endM / 60) - (startH + startM / 60);
      });

      // Available study hours per day (14 awake hours - classes - 2h buffer)
      const dailyAwakeHours = 14;
      const dailyBusyHours = weeklyBusyHours / 5; // Average across weekdays
      const dailyStudyHours = Math.max(0, dailyAwakeHours - dailyBusyHours - 2);

      // Total available hours for 2 weeks
      const availableFreeHours = dailyStudyHours * 14;

      setSimulationData({
        totalTaskHours,
        availableFreeHours,
        assignments: (assignments || []).map((a) => ({
          title: a.title,
          hours: a.estimated_hours || 1,
          dueDate: a.due_date,
        })),
      });

      return { totalTaskHours, availableFreeHours, dailyStudyHours };
    } catch (err) {
      console.error("Error fetching workload data:", err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const simulation = useMemo<SimulationResult | null>(() => {
    if (!simulationData) return null;

    const { totalTaskHours, availableFreeHours } = simulationData;
    
    // Calculate hours lost due to delay
    const dailyStudyHours = availableFreeHours / 14;
    const hoursLostByDelay = delayDays * dailyStudyHours;
    const adjustedFreeHours = Math.max(0, availableFreeHours - hoursLostByDelay);
    
    const originalBalance = availableFreeHours - totalTaskHours;
    const afterDelayBalance = adjustedFreeHours - totalTaskHours;
    
    // Calculate daily required hours if delayed
    const daysRemaining = Math.max(1, 14 - delayDays);
    const dailyRequiredHours = totalTaskHours / daysRemaining;

    // Determine status
    let status: "green" | "yellow" | "red";
    let warningMessage: string;

    if (afterDelayBalance >= totalTaskHours * 0.3) {
      status = "green";
      warningMessage = `You're on track! You have ${Math.round(afterDelayBalance)} free hours after completing all tasks.`;
    } else if (afterDelayBalance >= 0) {
      status = "yellow";
      warningMessage = `Tight schedule! You'll need to study ${dailyRequiredHours.toFixed(1)} hours per day.`;
    } else {
      status = "red";
      const deficit = Math.abs(afterDelayBalance);
      warningMessage = delayDays > 0
        ? `If you wait ${delayDays} more day${delayDays > 1 ? "s" : ""}, you'll need to study ${dailyRequiredHours.toFixed(1)} hours/day. You're ${deficit.toFixed(1)} hours short!`
        : `You're ${deficit.toFixed(1)} hours short! Consider prioritizing or getting extensions.`;
    }

    return {
      originalBalance,
      afterDelayBalance,
      totalTaskHours,
      availableFreeHours: adjustedFreeHours,
      dailyRequiredHours,
      status,
      warningMessage,
      daysUntilDeadline: 14 - delayDays,
    };
  }, [simulationData, delayDays]);

  return {
    loading,
    delayDays,
    setDelayDays,
    simulation,
    simulationData,
    fetchWorkloadData,
  };
}
