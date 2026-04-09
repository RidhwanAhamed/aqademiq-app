import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAssignments } from "@/hooks/useAssignments";
import { useAuth } from "@/hooks/useAuth";
import { useCourses } from "@/hooks/useCourses";
import { useExams } from "@/hooks/useExams";
import { useUserStats } from "@/hooks/useUserStats";
import { supabase } from "@/integrations/supabase/client";
import { addDays, format, isAfter, isBefore } from "date-fns";
import { Brain, Calendar, Clock, Plus, Target, Zap } from "lucide-react";
import { useState, useMemo } from "react";
import { AddAssignmentDialog } from "./AddAssignmentDialog";
import { AddStudySessionDialog } from "./AddStudySessionDialog";
import { AIInsightModal } from "./analytics/AIInsightModal";
import { CourseCard } from "./CourseCard";
import { InstallBanner } from "./InstallBanner";
import { MarketplaceTeaserCard } from "./MarketplaceTeaserCard";
import { QuickStats } from "./QuickStats";
import { RevisionTasksPanel } from "./RevisionTasksPanel";
import { TodayTimeline } from "./TodayTimeline";
import { useStudySessions } from "@/hooks/useStudySessions";
import { OverdueTasksButton } from "./SmartNudge";

export function Dashboard() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showStudySessionDialog, setShowStudySessionDialog] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiContext, setAiContext] = useState<string>('');
  const [aiContextData, setAiContextData] = useState<any>(null);

  const { user } = useAuth();
  const { courses } = useCourses();
  const { assignments } = useAssignments();
  const { exams } = useExams();
  const { stats } = useUserStats();
  const { studySessions } = useStudySessions();

  // Get user's first name for personalized greeting
  const userName = user?.user_metadata?.first_name ||
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    null;

  const handleNeedAIInsights = (context: string, data: any) => {
    setAiContext(context);
    setAiContextData(data);
    setAiModalOpen(true);
  };

  const generateAIInsights = async (context: string, data: any, customQuery?: string) => {
    try {
      const { data: result, error } = await supabase.functions.invoke('contextual-ai-insights', {
        body: {
          context,
          data,
          customQuery
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

  // Calculate dynamic metrics from real-time data
  const focusScore = useMemo(() => {
    const focusScores = studySessions
      .filter(s => s.status === 'completed' && s.focus_score !== null)
      .map(s => s.focus_score);
    
    return focusScores.length > 0
      ? Math.round((focusScores.reduce((a: number, b: number) => a + b, 0) / focusScores.length) * 10)
      : 72; // Baseline
  }, [studySessions]);

  const completedTasksCount = assignments.filter(a => a.is_completed).length;
  const totalTasksCount = assignments.length;
  const taskExecutionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
  
  const studyHours = stats?.total_study_hours || 0;
  const procrastinationSavedHours = (studyHours * 0.33).toFixed(1);
  const reelsAvoided = Math.round(studyHours * 45);
  const scrollMetersSaved = Math.round(studyHours * 12);

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Welcome back{userName ? `, ${userName}` : ''}!
          </h1>
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

      {/* Install Banner */}
      <InstallBanner />

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
                    <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${item.type === 'exam'
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

          <Card className="bg-gradient-card shadow-card border-primary/20">
            <CardContent className="pt-6">
              <div className="space-y-2 sm:space-y-3">
                <div className="p-2 sm:p-3 bg-primary-muted rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs sm:text-sm text-primary font-medium">Focus Score</p>
                    <span className="text-xs font-bold text-primary">{focusScore}%</span>
                  </div>
                  <div className="w-full bg-primary/20 h-1.5 rounded-full mb-2">
                    <div className="bg-primary h-full rounded-full" style={{ width: `${focusScore}%` }}></div>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    {focusScore >= 80 ? "Elite tier detected!" : "Keep building your focus blocks."} You've neutralized {scrollMetersSaved}m of potential doomscrolling.
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-blue-muted rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs sm:text-sm text-blue-600 font-medium">Task Execution</p>
                    <span className="text-xs font-bold text-blue-600">{taskExecutionRate}%</span>
                  </div>
                  <div className="w-full bg-blue-200 h-1.5 rounded-full mb-2">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: `${taskExecutionRate}%` }}></div>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    {completedTasksCount} of {totalTasksCount} targets hit. Consistency breeds results.
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-rose-muted rounded-lg">
                  <p className="text-xs sm:text-sm text-rose-600 font-medium mb-1">Smart Discovery</p>
                  <div className="flex gap-1 mb-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full ${i <= 3 ? 'bg-rose-500' : 'bg-rose-200'}`} />
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Scheduling hard tasks at 10 AM boosts output by ~20%.
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-purple-muted rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs sm:text-sm text-purple-600 font-medium">Golden Hour</p>
                    <span className="text-[10px] font-bold text-purple-600 px-1.5 py-0.5 bg-purple-100 rounded">11 AM</span>
                  </div>
                  <div className="flex items-end gap-0.5 h-4 mb-2">
                    {[1, 2, 3, 4, 8, 4, 3, 2].map((h, i) => (
                      <div key={i} className="flex-1 bg-purple-400 rounded-t-sm" style={{ height: `${h * 10}%` }} />
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Peak brain conductivity. Schedule your hardest subjects.
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-amber-muted rounded-lg">
                  <p className="text-xs sm:text-sm text-amber-600 font-medium mb-1">Future Stress Saved</p>
                  <div className="relative w-full h-1.5 bg-amber-100 rounded-full mb-2 overflow-hidden">
                    <div className="absolute left-0 top-0 h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(parseFloat(procrastinationSavedHours) * 20, 100)}%` }}></div>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Saved {procrastinationSavedHours}h of potential stress. Avoided ~{reelsAvoided} reels/distractions.
                  </p>
                </div>
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

      {/* Overdue Tasks Button */}
      <OverdueTasksButton />
    </div>
  );
}