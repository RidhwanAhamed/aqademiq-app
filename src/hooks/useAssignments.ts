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

  // MOCK DATA GENERATOR
  const generateMockAssignments = () => {
    const courseIds = ["course-math-uuid", "course-physics-uuid", "course-cs-uuid", "course-history-uuid"];
    const now = new Date();

    return [
      // Completed (Recent for Report)
      {
        id: "assign-1", user_id: user?.id, course_id: courseIds[0], title: "Calculus Limit Problem Set",
        due_date: new Date(now.getTime() - 2 * 86400000).toISOString(), // 2 days ago
        status: "completed", is_completed: true, grade: 95, grade_received: "A", estimated_hours: 3,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      },
      {
        id: "assign-2", user_id: user?.id, course_id: courseIds[1], title: "Quantum Wave Function Essay",
        due_date: new Date(now.getTime() - 5 * 86400000).toISOString(), // 5 days ago
        status: "completed", is_completed: true, grade: 88, grade_received: "B+", estimated_hours: 5,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      },
      {
        id: "assign-3", user_id: user?.id, course_id: courseIds[2], title: "Binary Tree Implementation",
        due_date: new Date(now.getTime() - 7 * 86400000).toISOString(),
        status: "completed", is_completed: true, grade: 100, grade_received: "A+", estimated_hours: 4,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      },

      // Completed (Recent)
      {
        id: "assign-4", user_id: user?.id, course_id: courseIds[3], title: "World War I Timeline",
        due_date: new Date(now.getTime() - 2 * 86400000).toISOString(),
        status: "completed", is_completed: true, grade: 92, grade_received: "A-", estimated_hours: 2,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      },

      // Overdue / Pending
      {
        id: "assign-5", user_id: user?.id, course_id: courseIds[0], title: "Integration by Parts",
        due_date: new Date(now.getTime() - 1 * 86400000).toISOString(), // Yesterday
        is_completed: false, estimated_hours: 3,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      },

      // Upcoming
      {
        id: "assign-6", user_id: user?.id, course_id: courseIds[1], title: "Thermodynamics Lab Report",
        due_date: new Date(now.getTime() + 2 * 86400000).toISOString(),
        is_completed: false, estimated_hours: 4,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      },
      {
        id: "assign-7", user_id: user?.id, course_id: courseIds[2], title: "Graph Algorithms Project",
        due_date: new Date(now.getTime() + 5 * 86400000).toISOString(),
        is_completed: false, estimated_hours: 8,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      },
      {
        id: "assign-8", user_id: user?.id, course_id: courseIds[3], title: "Cold War Analysis",
        due_date: new Date(now.getTime() + 7 * 86400000).toISOString(),
        is_completed: false, estimated_hours: 3,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      }
    ] as any[];
    // Cast as any[] because local mock structure might vary slightly from strict Supabase type definition
  };

  const fetchAssignments = async () => {
    try {
      if (!user) {
        setAssignments(generateMockAssignments());
        return;
      }
      const { data, error } = await supabase
        .from("assignments")
        .select("*")
        .eq("user_id", user.id)
        .order("due_date", { ascending: true });
      if (error) throw error;

      if (!data || data.length === 0) {
        console.log("Analytics Demo: Injecting Mock Assignments");
        setAssignments(generateMockAssignments());
      } else {
        setAssignments(data);
      }
    } catch (err) {
      console.error("Error fetching assignments:", err);
      setAssignments(generateMockAssignments());
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
    exam_id?: string;
  }) => {
    if (!user) return { data: null as Assignment | null, error: "Not authenticated" };
    try {
      const { data, error } = await supabase
        .from("assignments")
        .insert([{
          ...assignment,
          user_id: user.id,
          original_due_date: assignment.due_date, // Store original due date
        }])
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

  const updateAssignment = useCallback(async (id: string, updates: Partial<Assignment>) => {
    if (!user) return false;

    try {
      // Find the current assignment to check for date changes
      const currentAssignment = assignments.find(a => a.id === id);

      let finalUpdates = { ...updates };

      // Check if due_date is being changed (postponement detection)
      if (updates.due_date && currentAssignment) {
        const currentDueDate = new Date(currentAssignment.due_date);
        const newDueDate = new Date(updates.due_date);

        // If the new date is later than the current date (postponed)
        if (newDueDate > currentDueDate) {
          const currentRescheduleCount = currentAssignment.reschedule_count || 0;

          finalUpdates = {
            ...finalUpdates,
            reschedule_count: currentRescheduleCount + 1,
            last_rescheduled_at: new Date().toISOString(),
            // Store original due date only on first postponement
            original_due_date: currentAssignment.original_due_date || currentAssignment.due_date,
          };

          console.log(`Assignment "${currentAssignment.title}" postponed. Reschedule count: ${currentRescheduleCount + 1}`);
        }
      }

      const { error } = await supabase
        .from("assignments")
        .update(finalUpdates)
        .eq("id", id);
      if (error) throw error;
      await fetchAssignments();
      return true;
    } catch (err: any) {
      console.error("Error updating assignment:", err);
      setError("Failed to update assignment");
      return false;
    }
  }, [user, assignments]);

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
