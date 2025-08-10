import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface RevisionTask {
  id: string;
  user_id: string;
  exam_id: string;
  assignment_id?: string | null;
  title: string;
  description?: string | null;
  priority: number;
  estimated_hours: number;
  due_date: string;
  is_completed: boolean;
  task_type: 'revision' | 'practice' | 'summary' | 'review';
  created_at: string;
  updated_at: string;
  exams?: {
    title: string;
    exam_date: string;
  };
  assignments?: {
    title: string;
  };
}

export function useRevisionTasks() {
  const [revisionTasks, setRevisionTasks] = useState<RevisionTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchRevisionTasks = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("revision_tasks")
        .select(`
          *,
          exams (title, exam_date),
          assignments (title)
        `)
        .eq("user_id", user.id)
        .order("due_date", { ascending: true });
      
      if (error) throw error;
      setRevisionTasks((data || []) as RevisionTask[]);
    } catch (err: any) {
      console.error("Error fetching revision tasks:", err);
      setError("Failed to fetch revision tasks");
    } finally {
      setLoading(false);
    }
  };

  const addRevisionTask = async (task: {
    exam_id: string;
    assignment_id?: string;
    title: string;
    description?: string;
    due_date: string;
    task_type?: 'revision' | 'practice' | 'summary' | 'review';
    estimated_hours?: number;
    priority?: number;
  }) => {
    if (!user) return { data: null, error: "Not authenticated" };
    try {
      const { data, error } = await supabase
        .from("revision_tasks")
        .insert([{ ...task, user_id: user.id }])
        .select()
        .single();
      
      if (error) throw error;
      await fetchRevisionTasks();
      return { data, error: null };
    } catch (err: any) {
      console.error("Error adding revision task:", err);
      return { data: null, error: err?.message || "Failed to add revision task" };
    }
  };

  const updateRevisionTask = async (id: string, updates: Partial<RevisionTask>) => {
    try {
      const { error } = await supabase
        .from("revision_tasks")
        .update(updates)
        .eq("id", id);
      
      if (error) throw error;
      await fetchRevisionTasks();
      return { error: null };
    } catch (err: any) {
      console.error("Error updating revision task:", err);
      return { error: err?.message || "Failed to update revision task" };
    }
  };

  const deleteRevisionTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from("revision_tasks")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      await fetchRevisionTasks();
      return { error: null };
    } catch (err: any) {
      console.error("Error deleting revision task:", err);
      return { error: err?.message || "Failed to delete revision task" };
    }
  };

  const toggleComplete = async (id: string, completed: boolean) => {
    return updateRevisionTask(id, { is_completed: completed });
  };

  const generateTasksForExam = async (examId: string) => {
    if (!user) return { error: "Not authenticated" };
    try {
      const { error } = await supabase.rpc('generate_revision_tasks_for_exam', {
        p_exam_id: examId,
        p_user_id: user.id
      });
      
      if (error) throw error;
      await fetchRevisionTasks();
      return { error: null };
    } catch (err: any) {
      console.error("Error generating revision tasks:", err);
      return { error: err?.message || "Failed to generate revision tasks" };
    }
  };

  useEffect(() => {
    fetchRevisionTasks();
  }, [user?.id]);

  return {
    revisionTasks,
    loading,
    error,
    refetch: fetchRevisionTasks,
    addRevisionTask,
    updateRevisionTask,
    deleteRevisionTask,
    toggleComplete,
    generateTasksForExam,
  };
}