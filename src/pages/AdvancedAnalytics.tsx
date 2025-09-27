import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useEnhancedAnalytics } from "@/hooks/useEnhancedAnalytics";
import { useCourses } from "@/hooks/useCourses";
import { AdvancedPerformanceChart } from "@/components/analytics/AdvancedPerformanceChart";
import { AcademicGoalsPanel } from "@/components/analytics/AcademicGoalsPanel";
import { AcademicInsightsPanel } from "@/components/analytics/AcademicInsightsPanel";
import { PredictiveInsightsPanel } from "@/components/analytics/PredictiveInsightsPanel";
import { EnhancedHeroKPIs } from "@/components/analytics/EnhancedHeroKPIs";
import { AIInsightModal } from "@/components/analytics/AIInsightModal";
import { AnalyticsEmptyState } from "@/components/analytics/AnalyticsEmptyState";
import { BarChart3, Target, Lightbulb, RefreshCw, TrendingUp, AlertCircle, Brain, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

export default function Analytics() {
  const { courses } = useCourses();
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
    isEmpty
  } = useAdvancedAnalytics();

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

  // Calculate hero KPIs
  const overallGPA = performanceMetrics
    .filter(m => m.metric_type === 'overall_grade')
    .reduce((acc, m) => Math.max(acc, m.metric_value), 0);
    
  const semesterProgress = Math.min(
    (goalsProgress.total > 0 ? (goalsProgress.onTrack / goalsProgress.total) * 100 : 0),
    100
  );
  
  const studyStreak = performanceMetrics
    .filter(m => m.metric_type === 'study_consistency')
    .reduce((acc, m) => Math.max(acc, m.metric_value), 0);

  const criticalAlertsCount = criticalRisks.length + highRiskGoals.length + decliningCourses.length;

  if (loading && isEmptyState) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-gradient-card">
              <CardContent className="p-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Show empty state if user has no data
  if (!loading && isEmptyState) {
    return (
      <div className="p-6">
        <AnalyticsEmptyState dataRequirements={{
          courses: courses.length > 0,
          assignments: false,
          studySessions: false,
          grades: false
        }} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold text-foreground bg-gradient-text bg-clip-text text-transparent">
            Advanced Analytics
          </h1>
          <p className="text-muted-foreground mt-2">
            Real-time insights, predictive analytics, and AI-powered academic recommendations
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={() => handleNeedAIInsights('critical_insights', { alertsCount: criticalAlertsCount })}
            className="bg-gradient-card hover:bg-gradient-card/80"
          >
            <Brain className="w-4 h-4 mr-2" />
            AI Coach
          </Button>
          <Button 
            onClick={handleRefreshMetrics}
            disabled={loading}
            className="bg-gradient-primary hover:opacity-90"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Hero KPIs */}
      <EnhancedHeroKPIs
        overallGPA={overallGPA}
        semesterProgress={semesterProgress}
        studyStreak={studyStreak}
        criticalAlertsCount={criticalAlertsCount}
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
                {criticalRisks.length} high-risk areas, {highRiskGoals.length} goals at risk, {decliningCourses.length} declining courses
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleNeedAIInsights('critical_insights', { 
                alertsCount: criticalAlertsCount,
                risks: criticalRisks,
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
                <p className="text-2xl font-bold">{studyAnalytics.length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-info" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Last 30 days tracked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="predictive" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="predictive" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Predictive
            {criticalAlertsCount > 0 && (
              <Badge variant="destructive" className="ml-1">
                {criticalAlertsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Goals
            {goalsProgress.total > 0 && (
              <Badge variant="secondary" className="ml-1">
                {goalsProgress.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            AI Insights
            {unreadInsightsCount > 0 && (
              <Badge variant="default" className="bg-primary text-primary-foreground ml-1">
                {unreadInsightsCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="predictive" className="space-y-6">
          <PredictiveInsightsPanel
            goalPredictions={goalPredictions}
            gradeForecasts={gradeForecasts}
            performanceRisks={performanceRisks}
            academicGoals={academicGoals}
            onNeedAIInsights={handleNeedAIInsights}
          />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <AdvancedPerformanceChart 
            metrics={performanceMetrics} 
            courses={courses}
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