import { useState, useEffect } from 'react';
import { supabase } from '@/config/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

export interface Course {
  id: string;
  user_id: string;
  semester_id: string;
  name: string;
  code?: string;
  credits: number;
  instructor?: string;
  color: string;
  progress_percentage: number;
  target_grade?: string;
  current_gpa?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  semesters?: {
    name: string;
  };
}

export interface Semester {
  id: string;
  user_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchCourses = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          semesters (
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError('Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  const addCourse = async (courseData: Omit<Course, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('courses')
        .insert([{ ...courseData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      
      await fetchCourses(); // Refresh the list
      return data;
    } catch (error) {
      console.error('Error adding course:', error);
      setError('Failed to add course');
      return null;
    }
  };

  const updateCourse = async (id: string, updates: Partial<Course>) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      await fetchCourses(); // Refresh the list
      return true;
    } catch (error) {
      console.error('Error updating course:', error);
      setError('Failed to update course');
      return false;
    }
  };

  const deleteCourse = async (id: string) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      
      await fetchCourses(); // Refresh the list
      return true;
    } catch (error) {
      console.error('Error deleting course:', error);
      setError('Failed to delete course');
      return false;
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [user]);

  return {
    courses,
    loading,
    error,
    addCourse,
    updateCourse,
    deleteCourse,
    refetch: fetchCourses,
  };
}

export function useSemesters() {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchSemesters = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('semesters')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setSemesters(data || []);
    } catch (error) {
      console.error('Error fetching semesters:', error);
      setError('Failed to fetch semesters');
    } finally {
      setLoading(false);
    }
  };

  const addSemester = async (semesterData: Omit<Semester, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('semesters')
        .insert([{ ...semesterData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      
      await fetchSemesters(); // Refresh the list
      return data;
    } catch (error) {
      console.error('Error adding semester:', error);
      setError('Failed to add semester');
      return null;
    }
  };

  useEffect(() => {
    fetchSemesters();
  }, [user]);

  return {
    semesters,
    loading,
    error,
    addSemester,
    refetch: fetchSemesters,
  };
}