import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface UserStats {
  id: string;
  user_id: string;
  total_study_hours: number;
  current_streak: number;
  longest_streak: number;
  total_assignments_completed: number;
  total_exams_taken: number;
  average_grade_points: number;
  weekly_study_goal: number;
  last_study_date: string;
  created_at: string;
  updated_at: string;
}

export interface StudyTimeData {
  date: string;
  hours: number;
}

export interface GradeData {
  course: string;
  grade: number;
  assignment: string;
  date: string;
}

export function useUserStats() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [studyTimeData, setStudyTimeData] = useState<StudyTimeData[]>([]);
  const [gradeData, setGradeData] = useState<GradeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setStats(data);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      setError('Failed to fetch user stats');
    }
  };

  const fetchStudyTimeData = async () => {
    if (!user) return;

    try {
      // Get study sessions from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('study_sessions')
        .select('scheduled_start, scheduled_end, actual_start, actual_end')
        .eq('user_id', user.id)
        .gte('scheduled_start', thirtyDaysAgo.toISOString())
        .eq('status', 'completed');

      if (error) throw error;

      // Process data to get daily study hours
      const dailyHours: { [key: string]: number } = {};
      
      data?.forEach(session => {
        const startTime = new Date(session.actual_start || session.scheduled_start);
        const endTime = new Date(session.actual_end || session.scheduled_end);
        const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        
        const date = startTime.toISOString().split('T')[0];
        dailyHours[date] = (dailyHours[date] || 0) + hours;
      });

      const studyData = Object.entries(dailyHours).map(([date, hours]) => ({
        date,
        hours: Math.round(hours * 10) / 10
      })).sort((a, b) => a.date.localeCompare(b.date));

      setStudyTimeData(studyData);
    } catch (error) {
      console.error('Error fetching study time data:', error);
    }
  };

  const fetchGradeData = async () => {
    if (!user) return;

    try {
      // Get grades from assignments
      const { data: assignmentGrades, error: assignmentError } = await supabase
        .from('assignments')
        .select(`
          title,
          grade_points,
          updated_at,
          courses (name)
        `)
        .eq('user_id', user.id)
        .not('grade_points', 'is', null);

      if (assignmentError) throw assignmentError;

      // Get grades from exams
      const { data: examGrades, error: examError } = await supabase
        .from('exams')
        .select(`
          title,
          grade_points,
          updated_at,
          courses (name)
        `)
        .eq('user_id', user.id)
        .not('grade_points', 'is', null);

      if (examError) throw examError;

      const allGrades: GradeData[] = [
        ...(assignmentGrades || []).map(item => ({
          course: item.courses?.name || 'Unknown',
          grade: item.grade_points || 0,
          assignment: item.title,
          date: item.updated_at
        })),
        ...(examGrades || []).map(item => ({
          course: item.courses?.name || 'Unknown',
          grade: item.grade_points || 0,
          assignment: item.title,
          date: item.updated_at
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setGradeData(allGrades);
    } catch (error) {
      console.error('Error fetching grade data:', error);
    }
  };

  const updateStudyStreak = async () => {
    if (!user || !stats) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const lastStudyDate = stats.last_study_date;
      
      let newStreak = stats.current_streak;
      
      if (lastStudyDate) {
        const lastDate = new Date(lastStudyDate);
        const todayDate = new Date(today);
        const daysDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          // Consecutive day
          newStreak = stats.current_streak + 1;
        } else if (daysDiff > 1) {
          // Streak broken
          newStreak = 1;
        }
        // If daysDiff === 0, same day, keep current streak
      } else {
        // First study session
        newStreak = 1;
      }

      const { error } = await supabase
        .from('user_stats')
        .update({
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, stats.longest_streak),
          last_study_date: today
        })
        .eq('user_id', user.id);

      if (error) throw error;
      await fetchUserStats();
    } catch (error) {
      console.error('Error updating study streak:', error);
    }
  };

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      await Promise.all([
        fetchUserStats(),
        fetchStudyTimeData(),
        fetchGradeData()
      ]);
      setLoading(false);
    };

    fetchAllData();
  }, [user]);

  return {
    stats,
    studyTimeData,
    gradeData,
    loading,
    error,
    updateStudyStreak,
    refetch: () => {
      fetchUserStats();
      fetchStudyTimeData();
      fetchGradeData();
    }
  };
}
