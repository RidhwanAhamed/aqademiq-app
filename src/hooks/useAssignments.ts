import { useEffect, useState, useCallback } from "react";
import { supabase } from '@/integrations/supabase/client';
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
  exam_id?: string | null;
  original_due_date?: string | null;
  reschedule_count?: number | null;
  last_rescheduled_at?: string | null;
  created_at: string;
  updated_at: string;
}

export function useAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchAssignments = async () => {
    if (!user) {
      setAssignments([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
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
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const addAssignment = async (assignment: Omit<Assignment, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from("assignments")
        .insert([{ ...assignment, user_id: user.id }])
        .select()
        .single();
      if (error) throw error;
      await fetchAssignments();
      return data;
    } catch (err) {
      console.error("Error adding assignment:", err);
      setError("Failed to add assignment");
      return null;
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
    } catch (err) {
      console.error("Error updating assignment:", err);
      setError("Failed to update assignment");
      return false;
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [user]);

  return {
    assignments,
    loading,
    error,
    addAssignment,
    updateAssignment,
    refetch: fetchAssignments,
  };
}
