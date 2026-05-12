import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface Subtask {
  id: string;
  user_id: string;
  assignment_id: string | null;
  title: string;
  description: string | null;
  estimated_minutes: number | null;
  priority: number | null;
  order_index: number | null;
  is_completed: boolean;
  completed_at: string | null;
  task_type: string | null;
  created_at: string;
  due_date: string | null;
  scheduled_block_id?: string | null;
  recommended_date?: string | null;
  recommended_start_time?: string | null;
  recommended_end_time?: string | null;
}

export function useSubtasks(assignmentId?: string) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [schedulingTaskId, setSchedulingTaskId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const STUDY_START_HOUR = 8;
  const STUDY_END_HOUR = 22;
  const SLOT_BUFFER_MIN = 10;

  const fetchSubtasks = useCallback(async () => {
    if (!user || !assignmentId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("assignment_id", assignmentId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      
      // Some older/generated rows may have null/variant task_type.
      // Keep assignment-scoped task visibility resilient in UI.
      const assignmentTasks = (data || []).filter((task) => {
        if (!task.task_type) return true;
        return task.task_type === "micro_task";
      });

      // Map to include scheduled_block_id (stored in metadata or separate lookup)
      const tasksWithScheduleInfo = assignmentTasks.map(task => ({
        ...task,
        scheduled_block_id: null, // Will be populated from schedule_blocks lookup
      }));
      
      // Check which tasks have schedule blocks
      if (tasksWithScheduleInfo.length > 0) {
        const { data: scheduleBlocks } = await supabase
          .from("schedule_blocks")
          .select("id, description")
          .eq("user_id", user.id)
          .eq("source", "micro_task")
          .eq("is_active", true);
        
        if (scheduleBlocks) {
          const scheduledTaskIds = new Set(
            scheduleBlocks
              .map(b => {
                // Parse task ID from description (format: "Micro-task for: {assignment} - Task ID: {taskId}")
                const match = b.description?.match(/Task ID: ([a-f0-9-]+)/);
                return match ? match[1] : null;
              })
              .filter(Boolean)
          );
          
          tasksWithScheduleInfo.forEach(task => {
            if (scheduledTaskIds.has(task.id)) {
              task.scheduled_block_id = "scheduled";
            }
          });
        }
      }
      
      setSubtasks(tasksWithScheduleInfo);
    } catch (err) {
      console.error("Error fetching subtasks:", err);
    } finally {
      setLoading(false);
    }
  }, [user, assignmentId]);

  const toggleSubtask = useCallback(async (taskId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          is_completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq("id", taskId);

      if (error) throw error;

      const completedAt = completed ? new Date().toISOString() : null;
      const updatedTasks = subtasks.map((t) =>
        t.id === taskId ? { ...t, is_completed: completed, completed_at: completedAt } : t
      );

      setSubtasks(updatedTasks);

      // Keep UI responsive: update assignment progress + completion status.
      // (Database trigger also enforces this server-side for correctness.)
      if (assignmentId) {
        const completedCount = updatedTasks.filter((t) => t.is_completed).length;
        const totalCount = updatedTasks.length;
        const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        const isCompleted = totalCount > 0 && completedCount === totalCount;

        await supabase
          .from("assignments")
          .update({
            completion_percentage: isCompleted ? 100 : percentage,
            is_completed: isCompleted,
          })
          .eq("id", assignmentId);

        // Ensure any screens using `useAssignments()` refresh their list.
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("aqademiq:assignments:changed"));
        }
      }
    } catch (err) {
      console.error("Error toggling subtask:", err);
      toast({
        title: "Error",
        description: "Failed to update task status.",
        variant: "destructive",
      });
    }
  }, [assignmentId, subtasks, toast]);

  const deleteSubtask = useCallback(async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;

      setSubtasks((prev) => prev.filter((task) => task.id !== taskId));
    } catch (err) {
      console.error("Error deleting subtask:", err);
      toast({
        title: "Error",
        description: "Failed to delete task.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const updateSubtask = useCallback(async (taskId: string, updates: Partial<Subtask>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.estimated_minutes !== undefined) dbUpdates.estimated_minutes = updates.estimated_minutes;
      if (updates.due_date !== undefined) dbUpdates.due_date = updates.due_date;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;

      const { error } = await supabase
        .from("tasks")
        .update(dbUpdates)
        .eq("id", taskId);

      if (error) throw error;

      setSubtasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, ...updates } : task
        )
      );
    } catch (err) {
      console.error("Error updating subtask:", err);
      toast({
        title: "Error",
        description: "Failed to update task.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const scheduleSubtask = useCallback(async (task: Subtask, silent = false): Promise<boolean> => {
    if (!user) return false;
    
    setSchedulingTaskId(task.id);
    try {
      // Get the assignment to find its due date
      const { data: assignment } = await supabase
        .from("assignments")
        .select("title, due_date, course_id")
        .eq("id", task.assignment_id)
        .single();

      if (!assignment) {
        throw new Error("Assignment not found");
      }

      const toMinutes = (time: string): number => {
        const [h = "0", m = "0"] = time.split(":");
        return Number(h) * 60 + Number(m);
      };

      const toTimeString = (minutes: number): string => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
      };

      const startOfDay = (date: Date): Date => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
      };

      const formatDateOnly = (date: Date): string => date.toISOString().split("T")[0];

      const overlaps = (
        aStart: number,
        aEnd: number,
        bStart: number,
        bEnd: number
      ): boolean => aStart < bEnd && bStart < aEnd;

      const durationMinutes = Math.max(10, task.estimated_minutes || 30);
      const preferredStart = task.due_date ? new Date(task.due_date) : null;
      const searchStart = preferredStart && !Number.isNaN(preferredStart.getTime())
        ? preferredStart
        : new Date(Date.now() + 24 * 60 * 60 * 1000);

      const { data: existingBlocks, error: blocksError } = await supabase
        .from("schedule_blocks")
        .select("specific_date, day_of_week, is_recurring, start_time, end_time")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (blocksError) throw blocksError;

      let scheduledSlot:
        | { scheduleDate: Date; startTime: string; endTime: string }
        | null = null;

      const maxDaysLookahead = 45;
      const firstDay = startOfDay(searchStart);

      for (let offset = 0; offset <= maxDaysLookahead; offset++) {
        const day = new Date(firstDay);
        day.setDate(firstDay.getDate() + offset);

        const dateStr = formatDateOnly(day);
        const dayOfWeek = day.getDay();
        const dayBlocks = (existingBlocks || [])
          .filter((b) => b.specific_date === dateStr || (b.is_recurring && b.day_of_week === dayOfWeek))
          .map((b) => ({
            start: toMinutes(b.start_time),
            end: toMinutes(b.end_time),
          }))
          .sort((a, b) => a.start - b.start);

        const earliestStartMin = offset === 0 && preferredStart
          ? Math.max(STUDY_START_HOUR * 60, preferredStart.getHours() * 60 + preferredStart.getMinutes())
          : STUDY_START_HOUR * 60;
        const latestEndMin = STUDY_END_HOUR * 60;

        let cursor = earliestStartMin;

        for (const block of dayBlocks) {
          const candidateEnd = cursor + durationMinutes;
          if (!overlaps(cursor, candidateEnd, block.start, block.end) && candidateEnd + SLOT_BUFFER_MIN <= block.start) {
            scheduledSlot = {
              scheduleDate: day,
              startTime: toTimeString(cursor),
              endTime: toTimeString(candidateEnd),
            };
            break;
          }
          if (overlaps(cursor, candidateEnd, block.start, block.end) || candidateEnd + SLOT_BUFFER_MIN > block.start) {
            cursor = Math.max(cursor, block.end + SLOT_BUFFER_MIN);
          }
        }

        if (!scheduledSlot) {
          const candidateEnd = cursor + durationMinutes;
          if (candidateEnd <= latestEndMin) {
            scheduledSlot = {
              scheduleDate: day,
              startTime: toTimeString(cursor),
              endTime: toTimeString(candidateEnd),
            };
          }
        }

        if (scheduledSlot) break;
      }

      if (!scheduledSlot) {
        // Last-resort fallback so users are never blocked by scheduling failure.
        const fallbackDate = new Date(firstDay);
        fallbackDate.setDate(firstDay.getDate() + 1);
        const fallbackStart = STUDY_START_HOUR * 60;
        const fallbackEnd = fallbackStart + durationMinutes;
        scheduledSlot = {
          scheduleDate: fallbackDate,
          startTime: toTimeString(fallbackStart),
          endTime: toTimeString(fallbackEnd),
        };
      }

      const { error } = await supabase
        .from("schedule_blocks")
        .insert({
          user_id: user.id,
          title: task.title,
          description: `Micro-task for: ${assignment.title} - Task ID: ${task.id}`,
          specific_date: scheduledSlot.scheduleDate.toISOString().split("T")[0],
          day_of_week: scheduledSlot.scheduleDate.getDay(),
          start_time: scheduledSlot.startTime,
          end_time: scheduledSlot.endTime,
          course_id: assignment.course_id,
          is_recurring: false,
          is_active: true,
          source: "micro_task",
        });

      if (error) throw error;

      // Persist chosen slot back to task so recommendation chips stay accurate.
      await supabase
        .from("tasks")
        .update({
          due_date: `${scheduledSlot.scheduleDate.toISOString().split("T")[0]}T${scheduledSlot.startTime}`,
        })
        .eq("id", task.id);

      // Update local state to show as scheduled
      setSubtasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, scheduled_block_id: "scheduled" } : t
        )
      );

      if (!silent) {
        toast({
          title: "Scheduled!",
          description: `"${task.title}" added to calendar for ${scheduledSlot.scheduleDate.toLocaleDateString()}.`,
        });
      }
      return true;
    } catch (err) {
      console.error("Error scheduling subtask:", err);
      if (!silent) {
        toast({
          title: "Error",
          description: "Failed to schedule task to calendar.",
          variant: "destructive",
        });
      }
      return false;
    } finally {
      setSchedulingTaskId(null);
    }
  }, [user, toast]);

  const generateBreakdown = useCallback(async () => {
    if (!user || !assignmentId) return { success: false };
    
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("breakdown-task", {
        body: { assignment_id: assignmentId },
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

      const generatedTasks = (data.tasks || []) as Subtask[];
      let scheduledCount = 0;
      for (const generatedTask of generatedTasks) {
        const ok = await scheduleSubtask(generatedTask, true);
        if (ok) scheduledCount += 1;
      }

      await fetchSubtasks();

      toast({
        title: "Tasks Generated!",
        description: `Created ${generatedTasks.length} micro-tasks and scheduled ${scheduledCount}.`,
      });

      return { success: true, tasks: data.tasks };
    } catch (err) {
      console.error("Error generating breakdown:", err);
      toast({
        title: "Error",
        description: "Failed to generate micro-tasks. Please try again.",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setGenerating(false);
    }
  }, [user, assignmentId, fetchSubtasks, scheduleSubtask, toast]);

  const scheduleAllSubtasks = useCallback(async () => {
    if (!user) return;
    
    const unscheduledTasks = subtasks.filter(t => !t.is_completed && !t.scheduled_block_id);
    if (unscheduledTasks.length === 0) return;

    setSchedulingTaskId("all");
    try {
      let scheduledCount = 0;
      for (const task of unscheduledTasks) {
        const ok = await scheduleSubtask(task, true);
        if (ok) scheduledCount += 1;
      }
      
      toast({
        title: scheduledCount === unscheduledTasks.length ? "All Tasks Scheduled!" : "Tasks Partially Scheduled",
        description: `${scheduledCount}/${unscheduledTasks.length} tasks added to your calendar.`,
        variant: scheduledCount === unscheduledTasks.length ? "default" : "destructive",
      });
    } catch (err) {
      console.error("Error scheduling all subtasks:", err);
    } finally {
      setSchedulingTaskId(null);
    }
  }, [user, subtasks, scheduleSubtask, toast]);

  useEffect(() => {
    fetchSubtasks();
  }, [fetchSubtasks]);

  const completedCount = subtasks.filter((t) => t.is_completed).length;
  const totalCount = subtasks.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return {
    subtasks,
    loading,
    generating,
    schedulingTaskId,
    completedCount,
    totalCount,
    completionPercentage,
    fetchSubtasks,
    generateBreakdown,
    toggleSubtask,
    deleteSubtask,
    updateSubtask,
    scheduleSubtask,
    scheduleAllSubtasks,
  };
}
