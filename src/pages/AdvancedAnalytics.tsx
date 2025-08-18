import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAdvancedAnalytics } from "@/hooks/useAdvancedAnalytics";
import { useCourses } from "@/hooks/useCourses";
import { AdvancedPerformanceChart } from "@/components/analytics/AdvancedPerformanceChart";
import { AcademicGoalsPanel } from "@/components/analytics/AcademicGoalsPanel";
import { AcademicInsightsPanel } from "@/components/analytics/AcademicInsightsPanel";
import { BarChart3, Target, Lightbulb, RefreshCw, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdvancedAnalytics() {
  const { courses } = useCourses();
  const {
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
    getUnreadInsightsCount,
    getActiveGoalsProgress
  } = useAdvancedAnalytics();

  const unreadInsightsCount = getUnreadInsightsCount();
  const goalsProgress = getActiveGoalsProgress();

  const handleRefreshMetrics = async () => {
    await refreshMetrics();
  };

  if (loading && performanceMetrics.length === 0) {
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Advanced Analytics</h1>
          <p className="text-muted-foreground">
            Deep insights into your academic performance and personalized recommendations
          </p>
        </div>
        <Button 
          onClick={handleRefreshMetrics}
          disabled={loading}
          className="bg-gradient-primary hover:opacity-90"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Metrics
        </Button>
      </div>

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
      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
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
            Insights
            {unreadInsightsCount > 0 && (
              <Badge variant="default" className="bg-primary text-primary-foreground ml-1">
                {unreadInsightsCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

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
    </div>
  );
}