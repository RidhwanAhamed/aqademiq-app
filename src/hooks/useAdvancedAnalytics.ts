import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PerformanceMetric {
  id: string;
  course_id: string;
  metric_type: string;
  metric_value: number;
  time_period: string;
  calculation_date: string;
  metadata: any;
}

interface AcademicGoal {
  id: string;
  course_id: string;
  goal_type: string;
  goal_title: string;
  goal_description: string;
  target_value: number;
  current_value: number;
  target_date: string;
  is_achieved: boolean;
  achieved_at: string | null;
  priority: number;
  is_active: boolean;
}

interface AcademicInsight {
  id: string;
  insight_type: string;
  insight_title: string;
  insight_description: string;
  confidence_score: number;
  action_items: any; // JSON data from database
  related_course_id: string | null;
  related_assignment_id: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  expires_at: string | null;
  created_at: string;
}

interface StudySessionAnalytics {
  id: string;
  session_id: string;
  course_id: string;
  productivity_score: number;
  distraction_count: number;
  effective_study_minutes: number;
  session_rating: number;
  session_date: string;
}

export function useAdvancedAnalytics() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [academicGoals, setAcademicGoals] = useState<AcademicGoal[]>([]);
  const [academicInsights, setAcademicInsights] = useState<AcademicInsight[]>([]);
  const [studyAnalytics, setStudyAnalytics] = useState<StudySessionAnalytics[]>([]);
  const [loading, setLoading] = useState(false);

  // Load all analytics data
  useEffect(() => {
    if (!user) return;
    loadAnalyticsData();
  }, [user]);

  const loadAnalyticsData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [metricsData, goalsData, insightsData, analyticsData] = await Promise.all([
        supabase.from('performance_analytics').select('*').eq('user_id', user.id).order('calculation_date', { ascending: false }),
        supabase.from('academic_goals').select('*').eq('user_id', user.id).eq('is_active', true).order('priority'),
        supabase.from('academic_insights').select('*').eq('user_id', user.id).eq('is_dismissed', false).order('created_at', { ascending: false }),
        supabase.from('study_session_analytics').select('*').eq('user_id', user.id).order('session_date', { ascending: false }).limit(30)
      ]);

      setPerformanceMetrics(metricsData.data || []);
      setAcademicGoals(goalsData.data || []);
      setAcademicInsights((insightsData.data || []).map(insight => ({
        ...insight,
        action_items: Array.isArray(insight.action_items) ? insight.action_items : []
      })));
      setStudyAnalytics(analyticsData.data || []);
    } catch (error) {
      console.error('Error loading analytics data:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createGoal = async (goalData: Partial<AcademicGoal>) => {
    if (!user || !goalData.goal_title || !goalData.goal_type) return;

    try {
      const { data, error } = await supabase
        .from('academic_goals')
        .insert({
          user_id: user.id,
          goal_title: goalData.goal_title,
          goal_type: goalData.goal_type,
          goal_description: goalData.goal_description || '',
          target_value: goalData.target_value || 0,
          current_value: goalData.current_value || 0,
          target_date: goalData.target_date,
          priority: goalData.priority || 2,
          course_id: goalData.course_id
        })
        .select()
        .single();

      if (error) throw error;

      setAcademicGoals(prev => [...prev, data]);
      toast({
        title: "Goal Created",
        description: `Your goal "${goalData.goal_title}" has been created.`
      });
    } catch (error) {
      console.error('Error creating goal:', error);
      toast({
        title: "Error",
        description: "Failed to create goal",
        variant: "destructive"
      });
    }
  };

  const updateGoal = async (goalId: string, updates: Partial<AcademicGoal>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('academic_goals')
        .update(updates)
        .eq('id', goalId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setAcademicGoals(prev => prev.map(goal => goal.id === goalId ? data : goal));
      toast({
        title: "Goal Updated",
        description: "Your goal has been updated successfully."
      });
    } catch (error) {
      console.error('Error updating goal:', error);
      toast({
        title: "Error",
        description: "Failed to update goal",
        variant: "destructive"
      });
    }
  };

  const dismissInsight = async (insightId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('academic_insights')
        .update({ is_dismissed: true })
        .eq('id', insightId)
        .eq('user_id', user.id);

      if (error) throw error;

      setAcademicInsights(prev => prev.filter(insight => insight.id !== insightId));
      toast({
        title: "Insight Dismissed",
        description: "The insight has been dismissed."
      });
    } catch (error) {
      console.error('Error dismissing insight:', error);
      toast({
        title: "Error",
        description: "Failed to dismiss insight",
        variant: "destructive"
      });
    }
  };

  const markInsightAsRead = async (insightId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('academic_insights')
        .update({ is_read: true })
        .eq('id', insightId)
        .eq('user_id', user.id);

      if (error) throw error;

      setAcademicInsights(prev => 
        prev.map(insight => 
          insight.id === insightId 
            ? { ...insight, is_read: true }
            : insight
        )
      );
    } catch (error) {
      console.error('Error marking insight as read:', error);
    }
  };

  const refreshMetrics = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Call the database function to recalculate metrics
      const { error } = await supabase.rpc('calculate_performance_metrics', {
        p_user_id: user.id
      });

      if (error) throw error;

      // Reload the data
      await loadAnalyticsData();
      
      toast({
        title: "Metrics Updated",
        description: "Your performance metrics have been recalculated."
      });
    } catch (error) {
      console.error('Error refreshing metrics:', error);
      toast({
        title: "Error",
        description: "Failed to refresh metrics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getMetricsByCourse = (courseId: string) => {
    return performanceMetrics.filter(metric => metric.course_id === courseId);
  };

  const getGoalsByCourse = (courseId: string) => {
    return academicGoals.filter(goal => goal.course_id === courseId);
  };

  const getInsightsByCourse = (courseId: string) => {
    return academicInsights.filter(insight => insight.related_course_id === courseId);
  };

  const getUnreadInsightsCount = () => {
    return academicInsights.filter(insight => !insight.is_read).length;
  };

  const getActiveGoalsProgress = () => {
    const activeGoals = academicGoals.filter(goal => goal.is_active && !goal.is_achieved);
    return {
      total: activeGoals.length,
      onTrack: activeGoals.filter(goal => 
        goal.current_value >= (goal.target_value * 0.7)
      ).length,
      behindSchedule: activeGoals.filter(goal => 
        goal.current_value < (goal.target_value * 0.5)
      ).length
    };
  };

  return {
    performanceMetrics,
    academicGoals,
    academicInsights,
    studyAnalytics,
    loading,
    createGoal,
    updateGoal,
    dismissInsight,
    markInsightAsRead,
    refreshMetrics,
    getMetricsByCourse,
    getGoalsByCourse,
    getInsightsByCourse,
    getUnreadInsightsCount,
    getActiveGoalsProgress,
    loadAnalyticsData
  };
}