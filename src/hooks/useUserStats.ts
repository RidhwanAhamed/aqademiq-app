import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { checkBadgeEligibility, awardBadge, Badge } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  // Check and award streak badges
  const checkStreakBadges = useCallback(async (currentStreak: number) => {
    if (!user) return;
    
    try {
      const eligibleBadges = await checkBadgeEligibility(user.id, {
        totalPomodoroSessions: 0,
        currentStreak,
        assignmentsCompleted: 0
      });
      
      for (const badge of eligibleBadges) {
        const result = await awardBadge(user.id, badge.id);
        
        if (result.success && result.badge) {
          toast({
            title: `🏆 ${result.badge.title}`,
            description: result.badge.unlock_toast,
            duration: 5000,
          });
        }
      }
    } catch (err) {
      console.error('Error checking streak badges:', err);
    }
  }, [user, toast]);

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        // Create user stats if they don't exist
        const { data: newStats, error: createError } = await supabase
          .from('user_stats')
          .insert({
            user_id: user.id,
            total_study_hours: 0,
            current_streak: 0,
            longest_streak: 0,
            total_assignments_completed: 0,
            total_exams_taken: 0,
            average_grade_points: 0,
            weekly_study_goal: 20
          })
          .select()
          .single();
          
        if (createError) throw createError;
        setStats(newStats);
      } else {
        setStats(data);
      }
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

  const checkAndUpdateStreak = async () => {
    if (!user || !stats) return;

    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const lastStudyDate = stats.last_study_date;
      
      let newStreak = stats.current_streak;
      
      if (lastStudyDate) {
        const lastDate = new Date(lastStudyDate);
        const currentTime = now.getTime();
        const lastStudyTime = lastDate.getTime();
        
        // Check if more than 24 hours have passed since last study
        const hoursSinceLastStudy = (currentTime - lastStudyTime) / (1000 * 60 * 60);
        
        if (hoursSinceLastStudy > 24) {
          // Reset streak if more than 24 hours have passed
          newStreak = 0;
        }
      }

      // Only update if streak changed
      if (newStreak !== stats.current_streak) {
        const { error } = await supabase
          .from('user_stats')
          .update({
            current_streak: newStreak,
          })
          .eq('user_id', user.id);

        if (error) throw error;
        await fetchUserStats();
      }
    } catch (error) {
      console.error('Error checking study streak:', error);
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
      
      // Check for streak badges (7-day, 30-day)
      await checkStreakBadges(newStreak);
      
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
    
    // Set up interval to check streak every hour
    const streakCheckInterval = setInterval(checkAndUpdateStreak, 60 * 60 * 1000);
    
    return () => clearInterval(streakCheckInterval);
  }, [user, stats]);

  // Check streak when stats are first loaded
  useEffect(() => {
    if (stats) {
      checkAndUpdateStreak();
    }
  }, [stats]);

  return {
    stats,
    studyTimeData,
    gradeData,
    loading,
    error,
    updateStudyStreak,
    checkAndUpdateStreak,
    refetch: () => {
      fetchUserStats();
      fetchStudyTimeData();
      fetchGradeData();
    }
  };
}
