import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Plus, Calendar, Target, Zap, Clock, Brain } from "lucide-react";
import { CourseCard } from "./CourseCard";
import { TodayTimeline } from "./TodayTimeline";
import { QuickStats } from "./QuickStats";
import { AddAssignmentDialog } from "./AddAssignmentDialog";
import { AddStudySessionDialog } from "./AddStudySessionDialog";
import { useCourses } from "@/hooks/useCourses";
import { useAssignments } from "@/hooks/useAssignments";
import { useExams } from "@/hooks/useExams";
import { useUserStats } from "@/hooks/useUserStats";
import { RevisionTasksPanel } from "./RevisionTasksPanel";
import { MarketplaceTeaserCard } from "./MarketplaceTeaserCard";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { AIInsightModal } from "./analytics/AIInsightModal";
import { supabase } from "@/integrations/supabase/client";

export function Dashboard() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showStudySessionDialog, setShowStudySessionDialog] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiContext, setAiContext] = useState<string>('');
  const [aiContextData, setAiContextData] = useState<any>(null);
  
  const { courses } = useCourses();
  const { assignments } = useAssignments();
  const { exams } = useExams();
  const { stats } = useUserStats();

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

  // Get upcoming assignments and exams (next 7 days)
  const upcoming = [
    ...assignments
      .filter(a => !a.is_completed && isAfter(new Date(a.due_date), new Date()) && isBefore(new Date(a.due_date), addDays(new Date(), 7)))
      .map(a => ({
        title: a.title,
        due: format(new Date(a.due_date), 'EEE MMM d'),
        course: courses.find(c => c.id === a.course_id)?.name || 'Unknown Course',
        type: 'assignment'
      })),
    ...exams
      .filter(e => isAfter(new Date(e.exam_date), new Date()) && isBefore(new Date(e.exam_date), addDays(new Date(), 7)))
      .map(e => ({
        title: e.title,
        due: format(new Date(e.exam_date), 'EEE MMM d'),
        course: courses.find(c => c.id === e.course_id)?.name || 'Unknown Course',
        type: 'exam'
      }))
  ].sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime()).slice(0, 5);

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Welcome back!</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Here's your study overview for today</p>
        </div>
        <Button 
          onClick={() => setShowAddDialog(true)}
          className="bg-gradient-primary hover:opacity-90 shadow-primary w-full sm:w-auto"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Quick Add
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Quick Stats */}
          <QuickStats />

          {/* Today's Timeline */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Today's Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TodayTimeline />
            </CardContent>
          </Card>

          {/* Courses Overview */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Course Progress
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleNeedAIInsights('course_overview', {
                    courses,
                    coursesNeedingHelp: courses.filter(c => 
                      (c.progress_percentage < 50) || (c.current_gpa && c.current_gpa < 2.5)
                    ).length,
                    totalCourses: courses.length
                  })}
                  className="bg-gradient-card hover:bg-gradient-card/80"
                >
                  <Brain className="w-3 h-3 mr-1" />
                  Course Help
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {courses.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-muted-foreground">
                  <Target className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm sm:text-base">No courses yet. Add your first course to get started!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {courses.slice(0, 4).map((course) => (
                    <CourseCard 
                      key={course.id} 
                      course={course} 
                      onNeedAIInsights={handleNeedAIInsights}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 sm:space-y-6">
          {/* Study Streak */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="w-5 h-5 text-warning" />
                Study Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-warning">{stats?.current_streak || 0}</div>
                <p className="text-xs sm:text-sm text-muted-foreground">days in a row</p>
                <div className="mt-3 sm:mt-4 flex justify-center space-x-1">
                  {[...Array(Math.min(stats?.current_streak || 0, 7))].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-warning"
                    />
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 sm:mt-4 w-full text-xs sm:text-sm"
                  onClick={() => setShowStudySessionDialog(true)}
                >
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  Log Study Time
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Marketplace Teaser */}
          <MarketplaceTeaserCard />

          {/* Upcoming Deadlines */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Upcoming Deadlines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3">
              {upcoming.length === 0 ? (
                <div className="text-center py-3 sm:py-4 text-muted-foreground">
                  <p className="text-xs sm:text-sm">No upcoming deadlines in the next 7 days</p>
                </div>
              ) : (
                upcoming.map((item, index) => (
                  <div key={index} className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs sm:text-sm truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.course}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                      item.type === 'exam' 
                        ? 'bg-destructive-muted text-destructive' 
                        : 'bg-primary-muted text-primary'
                    }`}>
                      {item.due}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* AI Insights */}
          <Card className="bg-gradient-card shadow-card border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  AI Insights
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleNeedAIInsights('dashboard_overview', {
                    courses,
                    assignments,
                    exams,
                    stats,
                    upcoming
                  })}
                  className="bg-gradient-card hover:bg-gradient-card/80"
                >
                  <Brain className="w-3 h-3 mr-1" />
                  Ask Ada
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 sm:space-y-3">
                <div className="p-2 sm:p-3 bg-primary-muted rounded-lg">
                  <p className="text-xs sm:text-sm text-primary font-medium">Today's Focus</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {upcoming.length > 0 
                      ? `You have ${upcoming.length} upcoming deadline${upcoming.length > 1 ? 's' : ''}. Consider starting with "${upcoming[0]?.title}" to stay ahead.`
                      : "Great job! No urgent deadlines today. Perfect time for review sessions or getting ahead on future assignments."
                    }
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-warning-muted rounded-lg">
                  <p className="text-xs sm:text-sm text-warning font-medium">Study Recommendation</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats?.current_streak > 0 
                      ? `Amazing ${stats.current_streak}-day streak! Keep the momentum going with a focused 25-minute study session.`
                      : "Starting a study session today will begin your study streak. Even 15 minutes makes a difference!"
                    }
                  </p>
                </div>
                {stats?.total_study_hours > 0 && (
                  <div className="p-2 sm:p-3 bg-success-muted rounded-lg">
                    <p className="text-xs sm:text-sm text-success font-medium">Progress Update</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You've completed {stats.total_study_hours} hours of study time. You're building great study habits!
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
           
           {/* Revision Tasks */}
           <RevisionTasksPanel />
        </div>
      </div>

      <AddAssignmentDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog} 
      />
      
      <AddStudySessionDialog
        open={showStudySessionDialog}
        onOpenChange={setShowStudySessionDialog}
      />

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