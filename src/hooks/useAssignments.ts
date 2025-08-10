import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Assignment {
  id: string;
  user_id: string;
  course_id: string;
  title: string;
  description?: string | null;
  notes?: string | null;
  assignment_type?: string | null;
  due_date: string; // ISO string
  estimated_hours?: number | null;
  is_completed?: boolean | null;
  completion_percentage?: number | null;
  priority?: number | null;
  ai_generated_tasks?: any | null;
  grade_points?: number | null;
  grade_received?: string | null;
  is_recurring?: boolean | null;
  recurrence_pattern?: string | null;
  recurrence_interval?: number | null;
  recurrence_end_date?: string | null;
  parent_assignment_id?: string | null;
  original_due_date?: string | null;
  created_at: string;
  updated_at: string;
}

export function useAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchAssignments = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("assignments")
        .select("*")
        .eq("user_id", user.id)
        .order("due_date", { ascending: true });
      if (error) throw error;
      setAssignments(data || []);
    } catch (err) {
      console.error("Error fetching assignments:", err);
      setError("Failed to fetch assignments");
    } finally {
      setLoading(false);
    }
  };

  const addAssignment = async (assignment: {
    title: string;
    description?: string;
    course_id: string;
    due_date: string; // ISO
    estimated_hours?: number;
    is_recurring?: boolean;
    recurrence_pattern?: string;
    recurrence_interval?: number;
    recurrence_end_date?: string;
  }) => {
    if (!user) return { data: null as Assignment | null, error: "Not authenticated" };
    try {
      const { data, error } = await supabase
        .from("assignments")
        .insert([{ ...assignment, user_id: user.id }])
        .select()
        .single();
      if (error) throw error;
      await fetchAssignments();
      return { data: data as Assignment, error: null };
    } catch (err: any) {
      console.error("Error adding assignment:", err);
      setError("Failed to add assignment");
      return { data: null, error: err?.message || "Failed to add assignment" };
    }
  };

  const updateAssignment = async (id: string, updates: Partial<Assignment>) => {
    try {
      const { error } = await supabase
        .from("assignments")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      await fetchAssignments();
      return true;
    } catch (err: any) {
      console.error("Error updating assignment:", err);
      setError("Failed to update assignment");
      return false;
    }
  };

  const toggleComplete = async (id: string, completed: boolean) => {
    return updateAssignment(id, { 
      is_completed: completed,
      completion_percentage: completed ? 100 : 0
    });
  };

  useEffect(() => {
    fetchAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return {
    assignments,
    loading,
    error,
    refetch: fetchAssignments,
    addAssignment,
    updateAssignment,
    toggleComplete,
  };
}
