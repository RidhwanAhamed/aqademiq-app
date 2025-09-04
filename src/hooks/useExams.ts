import { useState, useEffect } from 'react';
import { supabase } from '@/config/supabaseClient';
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

  const fetchExams = async () => {
    if (!user) return;

    try {
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
      setExams(data || []);
    } catch (error) {
      console.error('Error fetching exams:', error);
      setError('Failed to fetch exams');
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