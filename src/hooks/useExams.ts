import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Exam {
  id: string;
  user_id: string;
  course_id: string;
  title: string;
  exam_date: string;
  duration_minutes: number;
  location?: string;
  exam_type?: string;
  grade_received?: string;
  grade_points?: number;
  study_hours_planned: number;
  study_hours_completed: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  courses?: {
    name: string;
    color: string;
  };
}

export function useExams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // MOCK DATA GENERATOR
  const mockExams: Exam[] = [
    {
      id: "exam-1",
      user_id: user?.id || "mock-user",
      course_id: "course-math-uuid",
      title: "Midterm Calculus Exam",
      exam_date: new Date(new Date().getTime() + 5 * 86400000).toISOString(), // 5 days from now
      duration_minutes: 120,
      study_hours_planned: 15,
      study_hours_completed: 12,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      courses: { name: "Advanced Calculus", color: "#3B82F6" }
    },
    {
      id: "exam-2",
      user_id: user?.id || "mock-user",
      course_id: "course-physics-uuid",
      title: "Quantum Physics Final",
      exam_date: new Date(new Date().getTime() + 20 * 86400000).toISOString(),
      duration_minutes: 180,
      study_hours_planned: 25,
      study_hours_completed: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      courses: { name: "Quantum Mechanics", color: "#10B981" }
    }
  ];

  const fetchExams = async () => {
    try {
      if (!user) {
        setExams(mockExams);
        return;
      }

      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          courses (
            name,
            color
          )
        `)
        .eq('user_id', user.id)
        .order('exam_date', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        console.log("Analytics Demo: Injecting Mock Exams");
        setExams(mockExams);
      } else {
        setExams(data);
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
      setExams(mockExams);
    } finally {
      setLoading(false);
    }
  };

  const addExam = async (examData: Omit<Exam, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('exams')
        .insert([{ ...examData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      await fetchExams();
      return data;
    } catch (error) {
      console.error('Error adding exam:', error);
      setError('Failed to add exam');
      return null;
    }
  };

  const updateExam = async (id: string, updates: Partial<Exam>) => {
    try {
      const { error } = await supabase
        .from('exams')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchExams();
      return true;
    } catch (error) {
      console.error('Error updating exam:', error);
      setError('Failed to update exam');
      return false;
    }
  };

  const deleteExam = async (id: string) => {
    try {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchExams();
      return true;
    } catch (error) {
      console.error('Error deleting exam:', error);
      setError('Failed to delete exam');
      return false;
    }
  };

  useEffect(() => {
    fetchExams();
  }, [user]);

  return {
    exams,
    loading,
    error,
    addExam,
    updateExam,
    deleteExam,
    refetch: fetchExams,
  };
}