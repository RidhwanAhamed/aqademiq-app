import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useEnhancedAnalytics } from "@/hooks/useEnhancedAnalytics";
import { useCourses } from "@/hooks/useCourses";
import { useAssignments } from "@/hooks/useAssignments";
import { useStudySessions } from "@/hooks/useStudySessions";
import { useFallbackAnalytics } from "@/hooks/useFallbackAnalytics";
import { AdvancedPerformanceChart } from "@/components/analytics/AdvancedPerformanceChart";
import { AcademicGoalsPanel } from "@/components/analytics/AcademicGoalsPanel";
import { AcademicInsightsPanel } from "@/components/analytics/AcademicInsightsPanel";
import { PredictiveInsightsPanel } from "@/components/analytics/PredictiveInsightsPanel";
import { EnhancedHeroKPIs } from "@/components/analytics/EnhancedHeroKPIs";
import { AIInsightModal } from "@/components/analytics/AIInsightModal";
import { AnalyticsEmptyState } from "@/components/analytics/AnalyticsEmptyState";
import { PredictiveTrendChart } from "@/components/analytics/PredictiveTrendChart";
import { StudyPatternHeatmap } from "@/components/analytics/StudyPatternHeatmap";
import { PerformanceHeroKPIs } from "@/components/analytics/PerformanceHeroKPIs";
import { InteractiveInsightsSummary } from "@/components/analytics/InteractiveInsightsSummary";
import { MobileOptimizedCharts } from "@/components/analytics/MobileOptimizedCharts";
import { AccessibleAnalytics } from "@/components/analytics/AccessibleAnalytics";
import { RealTimeUpdateIndicator } from "@/components/analytics/RealTimeUpdateIndicator";
import { BarChart3, Target, Lightbulb, RefreshCw, TrendingUp, AlertCircle, Brain, Zap, Activity } from "lucide-react";
import { OptimizedLoadingStates } from "@/components/analytics/OptimizedLoadingStates";
import { PerformanceMonitor } from "@/components/analytics/PerformanceMonitor";
import { usePerformanceOptimization } from "@/hooks/usePerformanceOptimization";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

export default function Analytics() {
  const { courses } = useCourses();
  const { assignments } = useAssignments();
  const { studySessions } = useStudySessions();
  const {
    measurePerformance,
    useIntersectionObserver,
    getCachedData,
    setCachedData,
    settings: perfSettings
  } = usePerformanceOptimization();
  const {
    performanceMetrics,
    academicGoals,
    academicInsights,
    studyAnalytics,
    goalPredictions,
    gradeForecasts,
    performanceRisks,
    loading,
    lastUpdated,
    createGoal,
    updateGoal,
    dismissInsight,
    markInsightAsRead,
    refreshAllData,
    getUnreadInsightsCount,
    getActiveGoalsProgress,
    getHighRiskGoals,
    getDecliningCourses,
    getCriticalRisks,
    isEmpty,
    getDataRequirements
  } = useEnhancedAnalytics();
  
  // Get fallback analytics when no processed data exists
  const {
    fallbackMetrics,
    fallbackGradeForecasts,
    fallbackStudyAnalytics,
    fallbackPerformanceRisks,
    hasFallbackData
  } = useFallbackAnalytics({
    courses,
    assignments,
    studySessions
  });

  // AI Insights Modal state
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiContext, setAiContext] = useState<string>('');
  const [aiContextData, setAiContextData] = useState<any>(null);

  const unreadInsightsCount = getUnreadInsightsCount();
  const goalsProgress = getActiveGoalsProgress();
  const highRiskGoals = getHighRiskGoals();
  const decliningCourses = getDecliningCourses();
  const criticalRisks = getCriticalRisks();
  const isEmptyState = isEmpty();

  const handleRefreshMetrics = async () => {
    await refreshAllData();
  };

  const handleNeedAIInsights = (context: string, data: any) => {
    setAiContext(context);
    setAiContextData(data);
    setAiModalOpen(true);
  };

  const generateAIInsights = async (context: string, data: any, customQuery?: string) => {
    try {
      const { data: result, error } = await supabase.functions.invoke('ai-insights', {
        body: {
          task_type: context,
          title: `AI Insights for ${context}`,
          description: customQuery || `Generate insights for ${context}`,
          context_data: data,
          course_info: courses.map(c => ({ id: c.id, name: c.name }))
        }
      });

      if (error) throw error;
      return result;
    } catch (error) {
      console.error('Error generating AI insights:', error);
      throw error;
    }
  };

  // Use fallback data when processed analytics are empty
  const effectiveGradeForecasts = gradeForecasts.length > 0 ? gradeForecasts : fallbackGradeForecasts;
  const effectiveStudyAnalytics = studyAnalytics.length > 0 ? studyAnalytics : fallbackStudyAnalytics;
  const effectivePerformanceRisks = performanceRisks.length > 0 ? performanceRisks : fallbackPerformanceRisks;
  
  // Calculate hero KPIs using fallback data when needed
  const overallGPA = performanceMetrics
    .filter(m => m.metric_type === 'overall_grade')
    .reduce((acc, m) => Math.max(acc, m.metric_value), 0) || fallbackMetrics.overallGPA;
    
  const semesterProgress = Math.min(
    (goalsProgress.total > 0 ? (goalsProgress.onTrack / goalsProgress.total) * 100 : 0),
    100
  );
  
  const studyStreak = performanceMetrics
    .filter(m => m.metric_type === 'study_consistency')
    .reduce((acc, m) => Math.max(acc, m.metric_value), 0) || fallbackMetrics.studyConsistency;

  const criticalAlertsCount = effectivePerformanceRisks.length + highRiskGoals.length + decliningCourses.length;

  // Calculate additional metrics for hero KPIs using fallback data
  const studyHoursThisWeek = effectiveStudyAnalytics
    .filter(session => {
      const sessionDate = new Date(session.session_date);
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      return sessionDate >= weekStart;
    })
    .reduce((total, session) => total + (session.effective_study_minutes || 0), 0) / 60;

  const goalsAchieved = academicGoals.filter(goal => goal.is_achieved).length;

  if (loading && isEmptyState) {
    return (
      <div className="p-6">
        <OptimizedLoadingStates
          isLoading={true}
          hasError={false}
          loadingMessage="Analyzing your academic data..."
          animationType="shimmer"
          showSkeleton={true}
        />
      </div>
    );
  }

  // Show empty state if user has no data
  if (!loading && isEmptyState) {
    return (
      <div className="p-6">
        <AnalyticsEmptyState dataRequirements={getDataRequirements()} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground bg-gradient-text bg-clip-text text-transparent animate-fade-in">
            Advanced Analytics
          </h1>
          <p className="text-muted-foreground">
            Real-time insights, predictive analytics, and AI-powered academic recommendations
          </p>
          <RealTimeUpdateIndicator
            lastUpdated={lastUpdated}
            isLoading={loading}
            onRefresh={handleRefreshMetrics}
          />
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={() => handleNeedAIInsights('critical_insights', { alertsCount: criticalAlertsCount })}
            className="bg-gradient-card hover:bg-gradient-card/80 animate-fade-in"
          >
            <Brain className="w-4 h-4 mr-2" />
            AI Coach
          </Button>
        </div>
      </div>

      {/* Hero KPIs */}
      <PerformanceHeroKPIs
        overallGPA={overallGPA}
        semesterProgress={semesterProgress}
        studyStreak={studyStreak}
        criticalAlertsCount={criticalAlertsCount}
        studyHoursThisWeek={studyHoursThisWeek}
        goalsAchieved={goalsAchieved}
        onNeedAIInsights={handleNeedAIInsights}
      />

      {/* Critical Alerts */}
      {criticalAlertsCount > 0 && (
        <Alert className="border-destructive/50 bg-destructive/5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <span className="font-medium">Critical Attention Required!</span>
              <p className="text-sm">
                {effectivePerformanceRisks.length} performance risks detected
                {highRiskGoals.length > 0 && `, ${highRiskGoals.length} goals at risk`}
                {decliningCourses.length > 0 && `, ${decliningCourses.length} declining courses`}
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleNeedAIInsights('critical_insights', { 
                alertsCount: criticalAlertsCount,
                risks: effectivePerformanceRisks,
                goals: highRiskGoals,
                courses: decliningCourses
              })}
              className="ml-4"
            >
              <Brain className="w-4 h-4 mr-2" />
              Get AI Help
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Performance Metrics</p>
                <p className="text-2xl font-bold">{performanceMetrics.length}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Across {courses.length} courses
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Goals</p>
                <p className="text-2xl font-bold">{goalsProgress.total}</p>
              </div>
              <Target className="w-8 h-8 text-success" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {goalsProgress.onTrack} on track, {goalsProgress.behindSchedule} behind
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">New Insights</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{unreadInsightsCount}</p>
                  {unreadInsightsCount > 0 && (
                    <Badge variant="default" className="bg-primary text-primary-foreground">
                      New
                    </Badge>
                  )}
                </div>
              </div>
              <Lightbulb className="w-8 h-8 text-warning" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              AI-powered recommendations
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Study Sessions</p>
                <p className="text-2xl font-bold">{effectiveStudyAnalytics.length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-info" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Last 30 days tracked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Summary - Always visible */}
      <InteractiveInsightsSummary
        overallGPA={overallGPA}
        goalsProgress={goalsProgress}
        decliningCourses={decliningCourses}
        criticalRisks={effectivePerformanceRisks}
        studyAnalytics={effectiveStudyAnalytics}
        onNeedAIInsights={handleNeedAIInsights}
      />

      {/* Main Content Tabs */}
      <Tabs defaultValue="forecasting" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="forecasting" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Forecasting</span>
            <span className="sm:hidden">Forecast</span>
            {(decliningCourses.length > 0 || criticalRisks.length > 0) && (
              <Badge variant="destructive" className="ml-1">
                {decliningCourses.length + criticalRisks.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="patterns" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Patterns</span>
            <span className="sm:hidden">Pattern</span>
          </TabsTrigger>
          <TabsTrigger value="mobile" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            <span className="hidden sm:inline">Mobile</span>
            <span className="sm:hidden">Mobile</span>
          </TabsTrigger>
          <TabsTrigger value="accessibility" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">Accessibility</span>
            <span className="sm:hidden">A11y</span>
          </TabsTrigger>
          <TabsTrigger value="predictive" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Predictive</span>
            <span className="sm:hidden">Predict</span>
            {criticalAlertsCount > 0 && (
              <Badge variant="destructive" className="ml-1">
                {criticalAlertsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">Goals</span>
            <span className="sm:hidden">Goals</span>
            {goalsProgress.total > 0 && (
              <Badge variant="secondary" className="ml-1">
                {goalsProgress.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            <span className="hidden sm:inline">AI Insights</span>
            <span className="sm:hidden">AI</span>
            {unreadInsightsCount > 0 && (
              <Badge variant="default" className="bg-primary text-primary-foreground ml-1">
                {unreadInsightsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Monitor</span>
            <span className="sm:hidden">Perf</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="forecasting" className="space-y-6">
          <PredictiveTrendChart
            gradeForecasts={effectiveGradeForecasts}
            courses={courses}
            onNeedAIInsights={handleNeedAIInsights}
          />
        </TabsContent>

        <TabsContent value="mobile" className="space-y-6">
          <MobileOptimizedCharts
            gradeForecasts={effectiveGradeForecasts}
            performanceMetrics={performanceMetrics}
            studyAnalytics={effectiveStudyAnalytics}
            courses={courses}
            onNeedAIInsights={handleNeedAIInsights}
          />
        </TabsContent>

        <TabsContent value="accessibility" className="space-y-6">
          <AccessibleAnalytics
            overallGPA={overallGPA}
            semesterProgress={semesterProgress}
            studyStreak={studyStreak}
            criticalAlertsCount={criticalAlertsCount}
            onNeedAIInsights={handleNeedAIInsights}
          />
        </TabsContent>

        <TabsContent value="predictive" className="space-y-6">
          <PredictiveInsightsPanel
            goalPredictions={goalPredictions}
            gradeForecasts={effectiveGradeForecasts}
            performanceRisks={effectivePerformanceRisks}
            academicGoals={academicGoals}
          />
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <AcademicGoalsPanel
            goals={academicGoals}
            courses={courses}
            onCreateGoal={createGoal}
            onUpdateGoal={updateGoal}
          />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <AcademicInsightsPanel
            insights={academicInsights}
            courses={courses}
            onDismissInsight={dismissInsight}
            onMarkAsRead={markInsightAsRead}
          />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <PerformanceMonitor />
        </TabsContent>
      </Tabs>

      {/* AI Insight Modal */}
      <AIInsightModal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        context={aiContext}
        contextData={aiContextData}
        onGenerateInsights={generateAIInsights}
      />
    </div>
  );
}