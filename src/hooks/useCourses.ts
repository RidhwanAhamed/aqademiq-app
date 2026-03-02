import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

  // MOCK DATA GENERATOR
  const mockCourses: Course[] = [
    {
      id: "course-math-uuid",
      user_id: user?.id || "mock-user",
      semester_id: "sem-1",
      name: "Advanced Calculus",
      code: "MATH301",
      credits: 4,
      color: "#3B82F6",
      progress_percentage: 78,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      semesters: { name: "Fall 2024" }
    },
    {
      id: "course-physics-uuid",
      user_id: user?.id || "mock-user",
      semester_id: "sem-1",
      name: "Quantum Mechanics",
      code: "PHYS402",
      credits: 4,
      color: "#10B981",
      progress_percentage: 65,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      semesters: { name: "Fall 2024" }
    },
    {
      id: "course-cs-uuid",
      user_id: user?.id || "mock-user",
      semester_id: "sem-1",
      name: "Data Structures",
      code: "CS201",
      credits: 3,
      color: "#8B5CF6",
      progress_percentage: 92,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      semesters: { name: "Fall 2024" }
    },
    {
      id: "course-history-uuid",
      user_id: user?.id || "mock-user",
      semester_id: "sem-1",
      name: "World History",
      code: "HIST101",
      credits: 3,
      color: "#F59E0B",
      progress_percentage: 45,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      semesters: { name: "Fall 2024" }
    }
  ];

  const fetchCourses = async () => {
    // Note: We authenticate but allow fallback to mock for demo purposes if no user
    // if (!user) return; 

    try {
      if (!user) {
        setCourses(mockCourses);
        return;
      }

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

      // INJECT MOCK DATA IF EMPTY
      if (!data || data.length === 0) {
        console.log("Analytics Demo: Injecting Mock Courses");
        setCourses(mockCourses);
      } else {
        setCourses(data);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      // Fallback to mock on error for seamless demo
      setCourses(mockCourses);
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