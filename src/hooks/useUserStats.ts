import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { checkBadgeEligibility, awardBadge } from '@/services/api';
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

  const parseStoredDate = (value: string): Date => {
    // last_study_date is typically stored as YYYY-MM-DD; parse in local time to avoid UTC drift.
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      return new Date(y, m - 1, d, 0, 0, 0, 0);
    }
    const parsed = new Date(value);
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
  };

  const getTodayLocal = (): Date => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  };

  const formatLocalDateKey = (date: Date): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const recalculateStreakFromSessions = useCallback(async (persist = true) => {
    if (!user) return { currentStreak: 0, longestStreak: 0, lastStudyDate: null as string | null };

    const { data: sessions, error: sessionsError } = await supabase
      .from('study_sessions')
      .select('actual_start, scheduled_start, status')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('scheduled_start', { ascending: false })
      .limit(5000);

    if (sessionsError) throw sessionsError;

    const sessionDays = new Set<string>();
    (sessions || []).forEach((session) => {
      const source = session.actual_start || session.scheduled_start;
      if (!source) return;
      const dt = new Date(source);
      const localDay = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0);
      sessionDays.add(formatLocalDateKey(localDay));
    });

    if (sessionDays.size === 0) {
      if (persist) {
        await supabase
          .from('user_stats')
          .update({
            current_streak: 0,
            last_study_date: null,
          })
          .eq('user_id', user.id);
      }
      return { currentStreak: 0, longestStreak: 0, lastStudyDate: null as string | null };
    }

    const sortedDays = [...sessionDays]
      .map((day) => parseStoredDate(day))
      .sort((a, b) => a.getTime() - b.getTime());

    // Longest streak from full session history (distinct study days).
    let longestStreak = 1;
    let runningLongest = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const diffDays = Math.floor((sortedDays[i].getTime() - sortedDays[i - 1].getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        runningLongest += 1;
      } else if (diffDays > 1) {
        runningLongest = 1;
      }
      longestStreak = Math.max(longestStreak, runningLongest);
    }

    // Current streak anchored to today or yesterday.
    const today = getTodayLocal();
    const todayKey = formatLocalDateKey(today);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayKey = formatLocalDateKey(yesterday);

    let currentStreak = 0;
    let cursor = sessionDays.has(todayKey) ? new Date(today) : sessionDays.has(yesterdayKey) ? new Date(yesterday) : null;
    while (cursor) {
      const key = formatLocalDateKey(cursor);
      if (!sessionDays.has(key)) break;
      currentStreak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    const lastStudyDate = formatLocalDateKey(sortedDays[sortedDays.length - 1]);

    if (persist) {
      const nextLongest = Math.max(stats?.longest_streak || 0, longestStreak);
      const { error: updateError } = await supabase
        .from('user_stats')
        .update({
          current_streak: currentStreak,
          longest_streak: nextLongest,
          last_study_date: lastStudyDate,
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;
    }

    return { currentStreak, longestStreak, lastStudyDate };
  }, [user, stats?.longest_streak]);

  // Check and award streak badges
  const checkStreakBadges = useCallback(async (currentStreak: number) => {
    if (!user) return;
    
    try {
      const eligibleBadges = await checkBadgeEligibility(user.id, {
        totalPomodoroSessions: 0,
        currentStreak,
        assignmentsCompleted: 0,
        adaChatMessages: 0,
        adaEventsCreated: 0
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
    try {
      if (!user) return;
      await recalculateStreakFromSessions(true);
      await fetchUserStats();
    } catch (error) {
      console.error('Error checking study streak:', error);
    }
  };

  const updateStudyStreak = async () => {
    try {
      if (!user) return;
      const recalculated = await recalculateStreakFromSessions(true);
      await checkStreakBadges(recalculated.currentStreak);
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
  }, [user?.id]);

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
