import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface StudySession {
  id: string;
  user_id: string;
  assignment_id?: string;
  exam_id?: string;
  course_id?: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string;
  actual_end?: string;
  status: string;
  focus_score?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export function useStudySessions() {
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchStudySessions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('scheduled_start', { ascending: false });

      if (error) throw error;
      setStudySessions(data || []);
    } catch (error) {
      console.error('Error fetching study sessions:', error);
      setError('Failed to fetch study sessions');
    } finally {
      setLoading(false);
    }
  };

  const addStudySession = async (sessionData: Omit<StudySession, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .insert([{ ...sessionData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      
      await fetchStudySessions(); // Refresh the list
      return data;
    } catch (error) {
      console.error('Error adding study session:', error);
      setError('Failed to add study session');
      return null;
    }
  };

  const updateStudySession = async (id: string, updates: Partial<StudySession>) => {
    try {
      const { error } = await supabase
        .from('study_sessions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      await fetchStudySessions(); // Refresh the list
      return true;
    } catch (error) {
      console.error('Error updating study session:', error);
      setError('Failed to update study session');
      return false;
    }
  };

  useEffect(() => {
    fetchStudySessions();
  }, [user]);

  return {
    studySessions,
    loading,
    error,
    addStudySession,
    updateStudySession,
    refetch: fetchStudySessions,
  };
}