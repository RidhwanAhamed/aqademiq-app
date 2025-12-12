import { AddStudySessionDialog } from "@/components/AddStudySessionDialog";
import { TimerSettingsDialog } from "@/components/TimerSettingsDialog";
import { AchievementUnlockModal } from "@/components/AchievementUnlockModal";
import { StudyContextSelector, type StudyContext } from "@/components/StudyContextSelector";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useBackgroundTimer, type TimerMode } from "@/hooks/useBackgroundTimer";
import { useAchievements } from "@/hooks/useAchievements";
import { useUserStats } from "@/hooks/useUserStats";
import { useCourses } from "@/hooks/useCourses";
import { useAssignments } from "@/hooks/useAssignments";
import { useExams } from "@/hooks/useExams";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Clock, Coffee, FileText, GraduationCap, Maximize2, Minimize2, Pause, Play, Plus, RotateCcw, Settings, Sparkles, Target, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge as BadgeType } from "@/types/badges";

export default function Timer() {
  const [showStudySessionDialog, setShowStudySessionDialog] = useState(false);
  const [currentSessionStart, setCurrentSessionStart] = useState<Date | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [unlockedBadge, setUnlockedBadge] = useState<BadgeType | null>(null);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [contextCollapsed, setContextCollapsed] = useState(false);
  const [studyContext, setStudyContext] = useState<StudyContext>({
    type: 'general',
    label: 'General Study'
  });
  const timerContainerRef = useRef<HTMLDivElement>(null);
  
  const { 
    mode, 
    timeLeft, 
    isRunning, 
    sessionsCompleted, 
    totalFocusTime,
    soundSettings,
    startTimer: startBackgroundTimer,
    pauseTimer,
    resetTimer: resetBackgroundTimer,
    setMode,
    updateSoundSettings,
    testSound,
    presets
  } = useBackgroundTimer();
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { checkAndAwardBadges, userBadges } = useAchievements();
  const { stats, updateStudyStreak, refetch: refetchStats } = useUserStats();
  const { courses } = useCourses();
  const { assignments } = useAssignments();
  const { exams } = useExams();

  // Track timer completion for database logging
  useEffect(() => {
    if (timeLeft === 0 && !isRunning && sessionsCompleted > 0) {
      handleTimerComplete();
    }
  }, [timeLeft, isRunning, sessionsCompleted]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleTimerComplete = async () => {
    if (mode === 'focus' && currentSessionStart) {
      const sessionDuration = presets.focus / 60;
      
      if (user) {
        const endTime = new Date();
        
        // Build session data with context
        const sessionData: {
          user_id: string;
          title: string;
          scheduled_start: string;
          scheduled_end: string;
          actual_start: string;
          actual_end: string;
          status: string;
          course_id?: string;
          assignment_id?: string;
          exam_id?: string;
        } = {
          user_id: user.id,
          title: studyContext.label || 'Pomodoro Focus Session',
          scheduled_start: currentSessionStart.toISOString(),
          scheduled_end: endTime.toISOString(),
          actual_start: currentSessionStart.toISOString(),
          actual_end: endTime.toISOString(),
          status: 'completed'
        };
        
        // Add context associations
        if (studyContext.type === 'course' && studyContext.courseId) {
          sessionData.course_id = studyContext.courseId;
        } else if (studyContext.type === 'assignment' && studyContext.assignmentId) {
          sessionData.assignment_id = studyContext.assignmentId;
          // Also set course_id from assignment for analytics
          const assignment = assignments.find(a => a.id === studyContext.assignmentId);
          if (assignment) sessionData.course_id = assignment.course_id;
        } else if (studyContext.type === 'exam' && studyContext.examId) {
          sessionData.exam_id = studyContext.examId;
          // Also set course_id from exam for analytics
          const exam = exams.find(e => e.id === studyContext.examId);
          if (exam) sessionData.course_id = exam.course_id;
        }
        
        const { error } = await supabase.from('study_sessions').insert(sessionData);
        
        if (!error) {
          const durationHours = sessionDuration / 60;
          
          try {
            const { error: statsError } = await supabase
              .rpc('update_user_study_stats', {
                p_user_id: user.id,
                p_study_hours: durationHours
              });
            
            if (statsError) {
              console.error('Error updating study stats:', statsError);
            }
          } catch (err) {
            console.error('Error updating study stats:', err);
          }

          // Update study streak (this handles streak badges internally)
          await updateStudyStreak();
          
          // Refetch stats to get updated streak value
          refetchStats();
          
          // Check for Pomodoro badge (Laser Focus) with actual stats
          const totalSessions = sessionsCompleted + 1;
          const currentStreak = stats?.current_streak || 0;
          const assignmentsCompleted = stats?.total_assignments_completed || 0;
          
          const awardedBadges = await checkAndAwardBadges({
            totalPomodoroSessions: totalSessions,
            currentStreak: currentStreak,
            assignmentsCompleted: assignmentsCompleted,
            adaChatMessages: 0,
            adaEventsCreated: 0
          });

          if (awardedBadges.length > 0) {
            setUnlockedBadge(awardedBadges[0]);
            setShowBadgeModal(true);
          }
        }
      }
      
      const nextMode = sessionsCompleted % 4 === 3 ? 'long-break' : 'short-break';
      setMode(nextMode);
    } else if (mode !== 'focus') {
      setMode('focus');
    }
    
    setCurrentSessionStart(null);
  };

  const startTimer = () => {
    startBackgroundTimer();
    if (!currentSessionStart && mode === 'focus') {
      setCurrentSessionStart(new Date());
    }
  };

  const resetTimer = () => {
    resetBackgroundTimer();
    setCurrentSessionStart(null);
  };

  const handleToggleFullscreen = () => {
    const elem = timerContainerRef.current;
    if (!document.fullscreenElement) {
      elem?.requestFullscreen?.();
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'focus': return 'Focus Session';
      case 'short-break': return 'Short Break';
      case 'long-break': return 'Long Break';
    }
  };

  const getModeIcon = () => {
    switch (mode) {
      case 'focus': return <Target className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'short-break':
      case 'long-break': return <Coffee className="w-5 h-5 sm:w-6 sm:h-6" />;
    }
  };

  const progress = ((presets[mode] - timeLeft) / presets[mode]) * 100;

  return (
    <div ref={timerContainerRef} className="p-4 sm:p-6 space-y-4 sm:space-y-6 min-h-screen bg-background">
      {/* Header - responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Study Timer</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Focus with Pomodoro technique</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setSettingsOpen(true)}
            variant="outline"
            aria-label="Timer settings"
            className="h-11 w-11 sm:h-10 sm:w-10 p-0"
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button 
            onClick={handleToggleFullscreen}
            variant="outline"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            className="h-11 w-11 sm:h-10 sm:w-10 p-0"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
          <Button 
            onClick={() => setShowStudySessionDialog(true)}
            variant="outline"
            className="h-11 sm:h-10"
          >
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Log Manual Session</span>
          </Button>
        </div>
      </div>

      {/* Study Context Selector - Hidden in fullscreen */}
      {!isFullscreen && (
        <StudyContextSelector
          studyContext={studyContext}
          onContextChange={setStudyContext}
          courses={courses}
          assignments={assignments}
          exams={exams}
          disabled={isRunning}
          isCollapsed={contextCollapsed}
          onCollapsedChange={setContextCollapsed}
        />
      )}

      <div className={`grid ${isFullscreen ? 'grid-cols-1 max-w-4xl mx-auto' : 'grid-cols-1 lg:grid-cols-2'} gap-4 sm:gap-6`}>
        {/* Timer */}
        <Card className="bg-gradient-card">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-center flex items-center justify-center gap-2 text-lg sm:text-xl">
              {getModeIcon()}
              Pomodoro Timer
            </CardTitle>
            {/* Show current study context */}
            {studyContext.label && studyContext.type !== 'general' && (
              <div className="flex justify-center mt-2">
                <Badge variant="secondary" className="text-xs gap-1">
                  {studyContext.type === 'course' && <BookOpen className="w-3 h-3" />}
                  {studyContext.type === 'assignment' && <FileText className="w-3 h-3" />}
                  {studyContext.type === 'exam' && <GraduationCap className="w-3 h-3" />}
                  {studyContext.label}
                </Badge>
              </div>
            )}
          </CardHeader>
          <CardContent className="text-center space-y-4 sm:space-y-6 pb-6">
            <div className="space-y-4">
              <Select 
                value={mode} 
                onValueChange={(value: TimerMode) => {
                  if (!isRunning) {
                    setMode(value);
                  }
                }}
                disabled={isRunning}
              >
                <SelectTrigger className="w-full sm:w-48 mx-auto h-12 sm:h-10">
                  <SelectValue placeholder="Select timer mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="focus">Focus (25 min)</SelectItem>
                  <SelectItem value="short-break">Short Break (5 min)</SelectItem>
                  <SelectItem value="long-break">Long Break (15 min)</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex items-center justify-center gap-3">
                <div className={`${isFullscreen ? 'text-9xl' : 'text-5xl sm:text-6xl lg:text-7xl'} font-mono font-bold text-primary transition-all`}>
                  {formatTime(timeLeft)}
                </div>
                {soundSettings.enabled ? (
                  <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                ) : (
                  <VolumeX className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                )}
              </div>
              
              <div className="text-base sm:text-lg text-muted-foreground flex items-center justify-center gap-2">
                {getModeIcon()}
                {getModeLabel()}
              </div>
              
              <Progress value={progress} className="w-full max-w-md mx-auto" />
            </div>
            
            {/* Larger touch targets for controls */}
            <div className="flex justify-center space-x-3 sm:space-x-4">
              {!isRunning ? (
                <Button 
                  size="lg" 
                  onClick={startTimer} 
                  className="bg-gradient-primary hover:opacity-90 h-14 w-14 sm:h-12 sm:w-auto sm:px-6 rounded-full sm:rounded-md"
                >
                  <Play className="w-6 h-6 sm:w-5 sm:h-5 sm:mr-2" />
                  <span className="hidden sm:inline">Start</span>
                </Button>
              ) : (
                <Button 
                  size="lg" 
                  onClick={pauseTimer} 
                  variant="outline"
                  className="h-14 w-14 sm:h-12 sm:w-auto sm:px-6 rounded-full sm:rounded-md"
                >
                  <Pause className="w-6 h-6 sm:w-5 sm:h-5 sm:mr-2" />
                  <span className="hidden sm:inline">Pause</span>
                </Button>
              )}
              <Button 
                size="lg" 
                onClick={resetTimer} 
                variant="outline"
                className="h-14 w-14 sm:h-12 sm:w-12 rounded-full sm:rounded-md"
              >
                <RotateCcw className="w-6 h-6 sm:w-5 sm:h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="bg-gradient-card">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl">Today's Focus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="flex justify-between items-center p-3 sm:p-4 bg-muted/30 rounded-lg">
              <span className="text-sm sm:text-base text-muted-foreground">Sessions Completed</span>
              <span className="font-bold text-xl sm:text-2xl">{sessionsCompleted}</span>
            </div>
            <div className="flex justify-between items-center p-3 sm:p-4 bg-muted/30 rounded-lg">
              <span className="text-sm sm:text-base text-muted-foreground">Total Focus Time</span>
              <span className="font-bold text-xl sm:text-2xl">{Math.floor(totalFocusTime / 60)}h {totalFocusTime % 60}m</span>
            </div>
            <div className="flex justify-between items-center p-3 sm:p-4 bg-muted/30 rounded-lg">
              <span className="text-sm sm:text-base text-muted-foreground">Focus Score</span>
              <span className="font-bold text-xl sm:text-2xl text-success">
                {sessionsCompleted > 0 ? Math.min(10, sessionsCompleted + 6) : 0}/10
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions - Hidden in fullscreen */}
      {!isFullscreen && (
        <Card className="bg-gradient-card">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl">Session History</CardTitle>
          </CardHeader>
          <CardContent>
            {sessionsCompleted > 0 ? (
              sessionsCompleted > 8 ? (
                <div className="max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
                  <div className="space-y-2">
                    {Array.from({ length: sessionsCompleted }, (_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-success" />
                          <span className="text-sm sm:text-base">Focus Session {sessionsCompleted - i}</span>
                          {studyContext.label && studyContext.type !== 'general' && i === 0 && (
                            <Badge variant="outline" className="text-xs">
                              {studyContext.label}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs sm:text-sm text-muted-foreground">{Math.floor(presets.focus / 60)} min</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {Array.from({ length: sessionsCompleted }, (_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-success" />
                        <span className="text-sm sm:text-base">Focus Session {sessionsCompleted - i}</span>
                        {studyContext.label && studyContext.type !== 'general' && i === 0 && (
                          <Badge variant="outline" className="text-xs">
                            {studyContext.label}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs sm:text-sm text-muted-foreground">{Math.floor(presets.focus / 60)} min</span>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-8 sm:py-12 text-muted-foreground">
                <Clock className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                <p className="text-sm sm:text-base">Start your first Pomodoro session!</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      <AddStudySessionDialog
        open={showStudySessionDialog}
        onOpenChange={setShowStudySessionDialog}
      />
      
      <TimerSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        soundSettings={soundSettings}
        onSoundSettingsChange={updateSoundSettings}
      />

      <AchievementUnlockModal
        badge={unlockedBadge}
        isOpen={showBadgeModal}
        onClose={() => {
          setShowBadgeModal(false);
          setUnlockedBadge(null);
        }}
      />
    </div>
  );
}