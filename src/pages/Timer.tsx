import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, RotateCcw, Clock, Coffee, Target, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AddStudySessionDialog } from "@/components/AddStudySessionDialog";

type TimerMode = 'focus' | 'short-break' | 'long-break';

const TIMER_PRESETS = {
  focus: 25 * 60, // 25 minutes
  'short-break': 5 * 60, // 5 minutes
  'long-break': 15 * 60, // 15 minutes
};

export default function Timer() {
  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState(TIMER_PRESETS.focus);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [totalFocusTime, setTotalFocusTime] = useState(0);
  const [currentSessionStart, setCurrentSessionStart] = useState<Date | null>(null);
  const [showStudySessionDialog, setShowStudySessionDialog] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      handleTimerComplete();
    }
  }, [timeLeft, isRunning]);

  const handleTimerComplete = async () => {
    setIsRunning(false);
    
    if (mode === 'focus') {
      setSessionsCompleted(prev => prev + 1);
      if (currentSessionStart) {
        const sessionDuration = Math.floor((Date.now() - currentSessionStart.getTime()) / 1000 / 60);
        setTotalFocusTime(prev => prev + sessionDuration);
        
        // Save study session to database
        if (user) {
          const { error } = await supabase.from('study_sessions').insert({
            user_id: user.id,
            title: 'Pomodoro Focus Session',
            scheduled_start: currentSessionStart.toISOString(),
            scheduled_end: new Date().toISOString(),
            actual_start: currentSessionStart.toISOString(),
            actual_end: new Date().toISOString(),
            status: 'completed'
          });
          
          if (!error) {
            // Update user stats with the study session duration
            const durationHours = sessionDuration / 60; // Convert minutes to hours
            
            const { data: currentStats } = await supabase
              .from('user_stats')
              .select('total_study_hours')
              .eq('user_id', user.id)
              .single();

            await supabase
              .from('user_stats')
              .upsert({
                user_id: user.id,
                total_study_hours: (currentStats?.total_study_hours || 0) + durationHours,
                last_study_date: new Date().toISOString().split('T')[0],
                updated_at: new Date().toISOString()
              });
          }
        }
      }
      
      toast({
        title: "Focus session complete!",
        description: "Time for a well-deserved break.",
      });
      
      // Auto-switch to break
      const nextMode = sessionsCompleted % 4 === 3 ? 'long-break' : 'short-break';
      setMode(nextMode);
      setTimeLeft(TIMER_PRESETS[nextMode]);
    } else {
      toast({
        title: "Break complete!",
        description: "Ready for another focus session?",
      });
      
      // Auto-switch back to focus
      setMode('focus');
      setTimeLeft(TIMER_PRESETS.focus);
    }
  };

  const startTimer = () => {
    setIsRunning(true);
    if (!currentSessionStart && mode === 'focus') {
      setCurrentSessionStart(new Date());
    }
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(TIMER_PRESETS[mode]);
    setCurrentSessionStart(null);
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

  const progress = ((TIMER_PRESETS[mode] - timeLeft) / TIMER_PRESETS[mode]) * 100;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Study Timer</h1>
          <p className="text-muted-foreground">Focus with Pomodoro technique</p>
        </div>
        <Button 
          onClick={() => setShowStudySessionDialog(true)}
          variant="outline"
        >
          <Plus className="w-4 h-4 mr-2" />
          Log Manual Session
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    setTimeLeft(TIMER_PRESETS[value]);
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
              
              <div className="text-6xl font-mono font-bold text-primary">
                {formatTime(timeLeft)}
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

      {/* Recent Sessions */}
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
      
      <AddStudySessionDialog
        open={showStudySessionDialog}
        onOpenChange={setShowStudySessionDialog}
      />
    </div>
  );
}