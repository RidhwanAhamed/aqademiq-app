import { useState, useEffect, useCallback } from 'react';
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
  action_items: any;
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

interface GoalPrediction {
  goal_id: string;
  probability_percentage: number;
  risk_level: string;
  recommended_actions: string[];
}

interface GradeForecast {
  course_id: string;
  course_name: string;
  current_average: number;
  projected_30_days: number;
  projected_semester_end: number;
  trend_direction: string;
  confidence_level: string;
}

interface PerformanceRisk {
  risk_type: string;
  severity: string;
  description: string;
  affected_courses: string[];
  recommended_actions: string[];
}

export function useEnhancedAnalytics() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [academicGoals, setAcademicGoals] = useState<AcademicGoal[]>([]);
  const [academicInsights, setAcademicInsights] = useState<AcademicInsight[]>([]);
  const [studyAnalytics, setStudyAnalytics] = useState<StudySessionAnalytics[]>([]);
  const [goalPredictions, setGoalPredictions] = useState<GoalPrediction[]>([]);
  const [gradeForecasts, setGradeForecasts] = useState<GradeForecast[]>([]);
  const [performanceRisks, setPerformanceRisks] = useState<PerformanceRisk[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    console.log('Setting up real-time subscriptions for enhanced analytics');

    // Subscribe to real-time updates for analytics data
    const channel = supabase
      .channel('enhanced-analytics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'performance_analytics',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('Performance analytics updated, refreshing...');
          loadAnalyticsData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'academic_goals',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('Academic goals updated, refreshing predictions...');
          loadGoalPredictions();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assignments',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('Assignments updated, refreshing forecasts...');
          loadGradeForecasts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'study_sessions',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('Study sessions updated, refreshing analytics...');
          loadStudyAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Background refresh timer
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(() => {
      console.log('Background refresh triggered');
      refreshAllData();
    }, 5 * 60 * 1000); // Refresh every 5 minutes

    return () => clearInterval(refreshInterval);
  }, [user]);

  // Initial data load
  useEffect(() => {
    if (!user) return;
    loadAllData();
  }, [user]);

  const loadAllData = useCallback(async () => {
    if (!user) return;
    console.log('Loading all enhanced analytics data');
    
    setLoading(true);
    try {
      await Promise.all([
        loadAnalyticsData(),
        loadGoalPredictions(),
        loadGradeForecasts(),
        loadPerformanceRisks()
      ]);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading enhanced analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load enhanced analytics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadAnalyticsData = async () => {
    if (!user) return;

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
      console.error('Error loading basic analytics data:', error);
    }
  };

  const loadGoalPredictions = async () => {
    if (!user || academicGoals.length === 0) return;

    try {
      const predictions: GoalPrediction[] = [];
      
      for (const goal of academicGoals) {
        const { data, error } = await supabase.rpc('calculate_goal_achievement_probability', {
          p_goal_id: goal.id
        });

        if (error) throw error;
        
        if (data && data.length > 0) {
          predictions.push({
            goal_id: data[0].goal_id,
            probability_percentage: data[0].probability_percentage,
            risk_level: data[0].risk_level,
            recommended_actions: Array.isArray(data[0].recommended_actions) 
              ? data[0].recommended_actions 
              : []
          });
        }
      }
      
      setGoalPredictions(predictions);
    } catch (error) {
      console.error('Error loading goal predictions:', error);
    }
  };

  const loadGradeForecasts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('forecast_grade_trend', {
        p_user_id: user.id
      });

      if (error) throw error;
      setGradeForecasts(data || []);
    } catch (error) {
      console.error('Error loading grade forecasts:', error);
    }
  };

  const loadStudyAnalytics = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('study_session_analytics')
        .select('*')
        .eq('user_id', user.id)
        .order('session_date', { ascending: false })
        .limit(30);

      if (error) throw error;
      setStudyAnalytics(data || []);
    } catch (error) {
      console.error('Error loading study analytics:', error);
    }
  };

  const loadPerformanceRisks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('detect_performance_risks', {
        p_user_id: user.id
      });

      if (error) throw error;
      setPerformanceRisks((data || []).map(risk => ({
        ...risk,
        recommended_actions: Array.isArray(risk.recommended_actions) 
          ? risk.recommended_actions 
          : []
      })));
    } catch (error) {
      console.error('Error loading performance risks:', error);
    }
  };

  const refreshAllData = useCallback(async () => {
    await loadAllData();
  }, [loadAllData]);

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

      // Optimistic UI update
      setAcademicGoals(prev => [...prev, data]);
      
      toast({
        title: "Goal Created",
        description: `Your goal "${goalData.goal_title}" has been created.`
      });

      // Refresh predictions
      loadGoalPredictions();
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

      // Optimistic UI update
      setAcademicGoals(prev => prev.map(goal => goal.id === goalId ? data : goal));
      
      toast({
        title: "Goal Updated",
        description: "Your goal has been updated successfully."
      });

      // Refresh predictions
      loadGoalPredictions();
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

      // Optimistic UI update
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

      // Optimistic UI update
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

  // Helper functions
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

  const getHighRiskGoals = () => {
    return goalPredictions.filter(pred => pred.risk_level === 'high');
  };

  const getDecliningCourses = () => {
    return gradeForecasts.filter(forecast => 
      forecast.trend_direction === 'declining' && forecast.confidence_level !== 'low'
    );
  };

  const getCriticalRisks = () => {
    return performanceRisks.filter(risk => risk.severity === 'high');
  };

  return {
    // Data states
    performanceMetrics,
    academicGoals,
    academicInsights,
    studyAnalytics,
    goalPredictions,
    gradeForecasts,
    performanceRisks,
    loading,
    lastUpdated,

    // Actions
    createGoal,
    updateGoal,
    dismissInsight,
    markInsightAsRead,
    refreshAllData,
    loadAllData,

    // Helper functions
    getUnreadInsightsCount,
    getActiveGoalsProgress,
    getHighRiskGoals,
    getDecliningCourses,
    getCriticalRisks,

    // Legacy compatibility
    refreshMetrics: refreshAllData,
    getMetricsByCourse: (courseId: string) => performanceMetrics.filter(metric => metric.course_id === courseId),
    getGoalsByCourse: (courseId: string) => academicGoals.filter(goal => goal.course_id === courseId),
    getInsightsByCourse: (courseId: string) => academicInsights.filter(insight => insight.related_course_id === courseId),
    isEmpty: () => performanceMetrics.length === 0 && academicGoals.length === 0 && academicInsights.length === 0
  };
}