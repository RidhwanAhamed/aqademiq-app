import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ScheduleBlock {
  id: string;
  user_id: string;
  course_id?: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  day_of_week?: number; // 0-6 (Sunday-Saturday)
  specific_date?: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
  week_type?: string; // 'A', 'B', etc. for rotation
  rotation_type?: 'none' | 'weekly' | 'biweekly' | 'odd_weeks' | 'even_weeks' | 'custom';
  rotation_weeks?: number[] | null;
  semester_week_start?: number;
  rotation_group?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  courses?: {
    name: string;
    color: string;
  };
}

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

export function useSchedule() {
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchScheduleBlocks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('schedule_blocks')
        .select(`
          *,
          courses (
            name,
            color
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setScheduleBlocks((data || []) as ScheduleBlock[]);
    } catch (error) {
      console.error('Error fetching schedule blocks:', error);
      setError('Failed to fetch schedule');
    }
  };

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
    }
  };

  const addScheduleBlock = async (blockData: Omit<ScheduleBlock, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('schedule_blocks')
        .insert([{ ...blockData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      await fetchScheduleBlocks();
      return data;
    } catch (error) {
      console.error('Error adding schedule block:', error);
      setError('Failed to add schedule block');
      return null;
    }
  };

  const updateScheduleBlock = async (id: string, updates: Partial<ScheduleBlock>) => {
    try {
      const { error } = await supabase
        .from('schedule_blocks')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchScheduleBlocks();
      return true;
    } catch (error) {
      console.error('Error updating schedule block:', error);
      setError('Failed to update schedule block');
      return false;
    }
  };

  const deleteScheduleBlock = async (id: string) => {
    try {
      const { error } = await supabase
        .from('schedule_blocks')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      await fetchScheduleBlocks();
      return true;
    } catch (error) {
      console.error('Error deleting schedule block:', error);
      setError('Failed to delete schedule block');
      return false;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchScheduleBlocks(), fetchExams()]);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  return {
    scheduleBlocks,
    exams,
    loading,
    error,
    addScheduleBlock,
    updateScheduleBlock,
    deleteScheduleBlock,
    refetch: () => Promise.all([fetchScheduleBlocks(), fetchExams()]),
  };
}