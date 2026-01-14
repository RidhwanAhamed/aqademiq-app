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
}

export function useSubtasks(assignmentId?: string) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
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
      setSubtasks(data || []);
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
    completedCount,
    totalCount,
    completionPercentage,
    fetchSubtasks,
    generateBreakdown,
    toggleSubtask,
    deleteSubtask,
  };
}
