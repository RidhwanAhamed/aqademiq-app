import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, RotateCcw, Clock, Coffee, Target, Plus, Maximize2, Minimize2, Settings, Volume2, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AddStudySessionDialog } from "@/components/AddStudySessionDialog";
import { useBackgroundTimer, type TimerMode } from "@/hooks/useBackgroundTimer";
import { TimerSettingsDialog } from "@/components/TimerSettingsDialog";

export default function Timer() {
  const [showStudySessionDialog, setShowStudySessionDialog] = useState(false);
  const [currentSessionStart, setCurrentSessionStart] = useState<Date | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
      const sessionDuration = presets.focus / 60; // Convert seconds to minutes
      
      // Save study session to database
      if (user) {
        const endTime = new Date();
        const { error } = await supabase.from('study_sessions').insert({
          user_id: user.id,
          title: 'Pomodoro Focus Session',
          scheduled_start: currentSessionStart.toISOString(),
          scheduled_end: endTime.toISOString(),
          actual_start: currentSessionStart.toISOString(),
          actual_end: endTime.toISOString(),
          status: 'completed'
        });
        
        if (!error) {
          // Update user stats with the study session duration
          const durationHours = sessionDuration / 60; // Convert minutes to hours
          
          try {
            // Use the database function to update study stats
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
        }
      }
      
      // Auto-switch to break after focus session
      const nextMode = sessionsCompleted % 4 === 3 ? 'long-break' : 'short-break';
      setMode(nextMode);
    } else if (mode !== 'focus') {
      // Auto-switch back to focus after break
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
      case 'focus': return <Target className="w-6 h-6" />;
      case 'short-break':
      case 'long-break': return <Coffee className="w-6 h-6" />;
    }
  };

  const progress = ((presets[mode] - timeLeft) / presets[mode]) * 100;

  return (
    <div ref={timerContainerRef} className="p-6 space-y-6 min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Study Timer</h1>
          <p className="text-muted-foreground">Focus with Pomodoro technique</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setSettingsOpen(true)}
            variant="outline"
            aria-label="Timer settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button 
            onClick={handleToggleFullscreen}
            variant="outline"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
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
          >
            <Plus className="w-4 h-4 mr-2" />
            Log Manual Session
          </Button>
        </div>
      </div>

      <div className={`grid ${isFullscreen ? 'grid-cols-1 max-w-4xl mx-auto' : 'grid-cols-1 lg:grid-cols-2'} gap-6`}>
        {/* Timer */}
        <Card className="bg-gradient-card">
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              {getModeIcon()}
              Pomodoro Timer
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
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
                <SelectTrigger className="w-48 mx-auto">
                  <SelectValue placeholder="Select timer mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="focus">Focus (25 min)</SelectItem>
                  <SelectItem value="short-break">Short Break (5 min)</SelectItem>
                  <SelectItem value="long-break">Long Break (15 min)</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex items-center justify-center gap-3">
                <div className={`${isFullscreen ? 'text-9xl' : 'text-6xl'} font-mono font-bold text-primary transition-all`}>
                  {formatTime(timeLeft)}
                </div>
                {soundSettings.enabled ? (
                  <Volume2 className="w-6 h-6 text-muted-foreground" />
                ) : (
                  <VolumeX className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              
              <div className="text-lg text-muted-foreground flex items-center justify-center gap-2">
                {getModeIcon()}
                {getModeLabel()}
              </div>
              
              <Progress value={progress} className="w-full max-w-md mx-auto" />
            </div>
            
            <div className="flex justify-center space-x-4">
              {!isRunning ? (
                <Button size="lg" onClick={startTimer} className="bg-gradient-primary hover:opacity-90">
                  <Play className="w-5 h-5 mr-2" />
                  Start
                </Button>
              ) : (
                <Button size="lg" onClick={pauseTimer} variant="outline">
                  <Pause className="w-5 h-5 mr-2" />
                  Pause
                </Button>
              )}
              <Button size="lg" onClick={resetTimer} variant="outline">
                <RotateCcw className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="bg-gradient-card">
          <CardHeader>
            <CardTitle>Today's Focus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Sessions Completed</span>
              <span className="font-bold text-2xl">{sessionsCompleted}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Focus Time</span>
              <span className="font-bold text-2xl">{Math.floor(totalFocusTime / 60)}h {totalFocusTime % 60}m</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Focus Score</span>
              <span className="font-bold text-2xl text-success">
                {sessionsCompleted > 0 ? Math.min(10, sessionsCompleted + 6) : 0}/10
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions - Hidden in fullscreen */}
      {!isFullscreen && (
        <Card className="bg-gradient-card">
          <CardHeader>
            <CardTitle>Session History</CardTitle>
          </CardHeader>
          <CardContent>
            {sessionsCompleted > 0 ? (
              <div className="space-y-2">
                {Array.from({ length: Math.min(sessionsCompleted, 5) }, (_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-success" />
                      <span>Focus Session {sessionsCompleted - i}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">25 min</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Start your first Pomodoro session!</p>
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
        onTestSound={testSound}
      />
    </div>
  );
}