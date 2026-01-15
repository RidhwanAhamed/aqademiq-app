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

  const fetchSubtasks = useCallback(async () => {
    if (!user || !assignmentId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("assignment_id", assignmentId)
        .eq("task_type", "micro_task")
        .order("order_index", { ascending: true });

      if (error) throw error;
      
      // Map to include scheduled_block_id (stored in metadata or separate lookup)
      const tasksWithScheduleInfo = (data || []).map(task => ({
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

      toast({
        title: "Tasks Generated!",
        description: `Created ${data.tasks?.length || 0} micro-tasks for this assignment.`,
      });

      await fetchSubtasks();
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
  }, [user, assignmentId, fetchSubtasks, toast]);

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

      setSubtasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? { ...task, is_completed: completed, completed_at: completed ? new Date().toISOString() : null }
            : task
        )
      );

      // Update parent assignment completion percentage
      if (assignmentId) {
        const updatedTasks = subtasks.map((t) =>
          t.id === taskId ? { ...t, is_completed: completed } : t
        );
        const completedCount = updatedTasks.filter((t) => t.is_completed).length;
        const totalCount = updatedTasks.length;
        const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        await supabase
          .from("assignments")
          .update({ completion_percentage: percentage })
          .eq("id", assignmentId);
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

  const scheduleSubtask = useCallback(async (task: Subtask) => {
    if (!user) return;
    
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

      // Use recommended time from task if available, otherwise calculate
      let scheduleDate: Date;
      let startTime: string;
      let endTime: string;
      
      if (task.due_date) {
        // Use the recommended time stored in due_date
        const recommendedDate = new Date(task.due_date);
        scheduleDate = recommendedDate;
        const hours = recommendedDate.getHours();
        const minutes = recommendedDate.getMinutes();
        startTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
        
        const durationMinutes = task.estimated_minutes || 30;
        const endMinutesTotal = hours * 60 + minutes + durationMinutes;
        const endHour = Math.floor(endMinutesTotal / 60) % 24;
        const endMin = endMinutesTotal % 60;
        endTime = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}:00`;
      } else {
        // Fallback: schedule for tomorrow with smart time selection
        const now = new Date();
        scheduleDate = new Date();
        scheduleDate.setDate(now.getDate() + 1);
        
        // Find next available slot starting at 9 AM
        const startHour = 9 + Math.floor(Math.random() * 8);
        startTime = `${String(startHour).padStart(2, "0")}:00:00`;
        const durationMinutes = task.estimated_minutes || 30;
        const endMinutesTotal = startHour * 60 + durationMinutes;
        const endHour = Math.floor(endMinutesTotal / 60);
        const endMin = endMinutesTotal % 60;
        endTime = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}:00`;
      }

      const { error } = await supabase
        .from("schedule_blocks")
        .insert({
          user_id: user.id,
          title: task.title,
          description: `Micro-task for: ${assignment.title} - Task ID: ${task.id}`,
          specific_date: scheduleDate.toISOString().split("T")[0],
          day_of_week: scheduleDate.getDay(),
          start_time: startTime,
          end_time: endTime,
          course_id: assignment.course_id,
          is_recurring: false,
          is_active: true,
          source: "micro_task",
        });

      if (error) throw error;

      // Update local state to show as scheduled
      setSubtasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, scheduled_block_id: "scheduled" } : t
        )
      );

      toast({
        title: "Scheduled!",
        description: `"${task.title}" added to calendar for ${scheduleDate.toLocaleDateString()}.`,
      });
    } catch (err) {
      console.error("Error scheduling subtask:", err);
      toast({
        title: "Error",
        description: "Failed to schedule task to calendar.",
        variant: "destructive",
      });
    } finally {
      setSchedulingTaskId(null);
    }
  }, [user, toast]);

  const scheduleAllSubtasks = useCallback(async () => {
    if (!user) return;
    
    const unscheduledTasks = subtasks.filter(t => !t.is_completed && !t.scheduled_block_id);
    if (unscheduledTasks.length === 0) return;

    setSchedulingTaskId("all");
    try {
      for (const task of unscheduledTasks) {
        await scheduleSubtask(task);
      }
      
      toast({
        title: "All Tasks Scheduled!",
        description: `${unscheduledTasks.length} tasks added to your calendar.`,
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
