import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Plus, Calendar, Target, Zap, Clock } from "lucide-react";
import { CourseCard } from "./CourseCard";
import { TodayTimeline } from "./TodayTimeline";
import { QuickStats } from "./QuickStats";
import { AddAssignmentDialog } from "./AddAssignmentDialog";
import { AddStudySessionDialog } from "./AddStudySessionDialog";
import { useCourses } from "@/hooks/useCourses";
import { useAssignments } from "@/hooks/useAssignments";
import { useExams } from "@/hooks/useExams";
import { useUserStats } from "@/hooks/useUserStats";
import { RemindersPanel } from "./RemindersPanel";
import { format, isAfter, isBefore, addDays } from "date-fns";

export function Dashboard() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showStudySessionDialog, setShowStudySessionDialog] = useState(false);
  const { courses } = useCourses();
  const { assignments } = useAssignments();
  const { exams } = useExams();
  const { stats } = useUserStats();

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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Welcome back!</h1>
          <p className="text-muted-foreground">Here's your study overview for today</p>
        </div>
        <Button 
          onClick={() => setShowAddDialog(true)}
          className="bg-gradient-primary hover:opacity-90 shadow-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Quick Add
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
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
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Course Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              {courses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No courses yet. Add your first course to get started!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {courses.slice(0, 4).map((course) => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
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
                <div className="text-3xl font-bold text-warning">{stats?.current_streak || 0}</div>
                <p className="text-sm text-muted-foreground">days in a row</p>
                <div className="mt-4 flex justify-center space-x-1">
                  {[...Array(Math.min(stats?.current_streak || 0, 7))].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-3 h-3 rounded-full bg-warning"
                    />
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4 w-full"
                  onClick={() => setShowStudySessionDialog(true)}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Log Study Time
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Deadlines */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Upcoming Deadlines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcoming.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">No upcoming deadlines in the next 7 days</p>
                </div>
              ) : (
                upcoming.map((item, index) => (
                  <div key={index} className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.course}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
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
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-primary-muted rounded-lg">
                  <p className="text-sm text-primary font-medium">Today's Focus</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {upcoming.length > 0 
                      ? `You have ${upcoming.length} upcoming deadline${upcoming.length > 1 ? 's' : ''}. Consider starting with "${upcoming[0]?.title}" to stay ahead.`
                      : "Great job! No urgent deadlines today. Perfect time for review sessions or getting ahead on future assignments."
                    }
                  </p>
                </div>
                <div className="p-3 bg-warning-muted rounded-lg">
                  <p className="text-sm text-warning font-medium">Study Recommendation</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats?.current_streak > 0 
                      ? `Amazing ${stats.current_streak}-day streak! Keep the momentum going with a focused 25-minute study session.`
                      : "Starting a study session today will begin your study streak. Even 15 minutes makes a difference!"
                    }
                  </p>
                </div>
                {stats?.total_study_hours > 0 && (
                  <div className="p-3 bg-success-muted rounded-lg">
                    <p className="text-sm text-success font-medium">Progress Update</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You've completed {stats.total_study_hours} hours of study time. You're building great study habits!
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Reminders Panel */}
          <RemindersPanel />
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
    </div>
  );
}