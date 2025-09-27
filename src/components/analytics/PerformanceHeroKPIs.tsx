import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Target, Clock, Brain, Award, AlertCircle, Zap } from "lucide-react";

interface PerformanceHeroKPIsProps {
  overallGPA: number;
  semesterProgress: number;
  studyStreak: number;
  criticalAlertsCount: number;
  studyHoursThisWeek?: number;
  goalsAchieved?: number;
  onNeedAIInsights?: (context: string, data: any) => void;
}

export function PerformanceHeroKPIs({ 
  overallGPA, 
  semesterProgress, 
  studyStreak, 
  criticalAlertsCount,
  studyHoursThisWeek = 0,
  goalsAchieved = 0,
  onNeedAIInsights 
}: PerformanceHeroKPIsProps) {
  
  // Calculate performance status
  const gpaStatus = overallGPA >= 8.0 ? 'excellent' : 
                   overallGPA >= 7.0 ? 'good' : 
                   overallGPA >= 6.0 ? 'satisfactory' : 'needs-improvement';
                   
  const progressStatus = semesterProgress >= 80 ? 'excellent' :
                        semesterProgress >= 60 ? 'good' :
                        semesterProgress >= 40 ? 'satisfactory' : 'needs-improvement';

  const streakStatus = studyStreak >= 10 ? 'excellent' :
                      studyStreak >= 5 ? 'good' :
                      studyStreak >= 2 ? 'satisfactory' : 'needs-improvement';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-success border-success/20 bg-success/5';
      case 'good': return 'text-primary border-primary/20 bg-primary/5';
      case 'satisfactory': return 'text-warning border-warning/20 bg-warning/5';
      case 'needs-improvement': return 'text-destructive border-destructive/20 bg-destructive/5';
      default: return 'text-muted-foreground border-muted/20 bg-muted/5';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <Award className="w-5 h-5" />;
      case 'good': return <TrendingUp className="w-5 h-5" />;
      case 'satisfactory': return <Target className="w-5 h-5" />;
      case 'needs-improvement': return <AlertCircle className="w-5 h-5" />;
      default: return <Target className="w-5 h-5" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Overall GPA */}
      <Card className={`bg-gradient-card transition-all duration-300 hover:scale-105 border-2 ${getStatusColor(gpaStatus)}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {getStatusIcon(gpaStatus)}
              <span className="text-sm font-medium text-muted-foreground">Overall GPA</span>
            </div>
            {criticalAlertsCount > 0 && gpaStatus === 'needs-improvement' && (
              <Badge variant="destructive" className="text-xs">
                At Risk
              </Badge>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-4xl font-bold">{overallGPA.toFixed(1)}</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">out of 10.0</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onNeedAIInsights?.('gpa_improvement', {
                  currentGPA: overallGPA,
                  status: gpaStatus,
                  criticalAlertsCount
                })}
                className="h-6 px-2 text-xs opacity-70 hover:opacity-100"
              >
                <Brain className="w-3 h-3 mr-1" />
                Tips
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Semester Progress */}
      <Card className={`bg-gradient-card transition-all duration-300 hover:scale-105 border-2 ${getStatusColor(progressStatus)}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {getStatusIcon(progressStatus)}
              <span className="text-sm font-medium text-muted-foreground">Semester Progress</span>
            </div>
            {progressStatus === 'excellent' && (
              <Badge variant="default" className="bg-success text-success-foreground text-xs">
                On Track
              </Badge>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-4xl font-bold">{Math.round(semesterProgress)}%</p>
            <div className="flex items-center justify-between">
              <div className="w-full bg-muted rounded-full h-2 mr-2">
                <div 
                  className="bg-primary rounded-full h-2 transition-all duration-500" 
                  style={{ width: `${Math.min(semesterProgress, 100)}%` }}
                />
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onNeedAIInsights?.('semester_planning', {
                  currentProgress: semesterProgress,
                  status: progressStatus,
                  goalsAchieved
                })}
                className="h-6 px-2 text-xs opacity-70 hover:opacity-100"
              >
                <Brain className="w-3 h-3 mr-1" />
                Plan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Study Streak */}
      <Card className={`bg-gradient-card transition-all duration-300 hover:scale-105 border-2 ${getStatusColor(streakStatus)}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {streakStatus === 'excellent' ? (
                <Zap className="w-5 h-5 text-warning" />
              ) : (
                getStatusIcon(streakStatus)
              )}
              <span className="text-sm font-medium text-muted-foreground">Study Streak</span>
            </div>
            {studyStreak >= 7 && (
              <Badge variant="default" className="bg-warning text-warning-foreground text-xs animate-pulse">
                🔥 Hot
              </Badge>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline gap-1">
              <p className="text-4xl font-bold">{studyStreak}</p>
              <p className="text-lg text-muted-foreground">days</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {studyStreak === 0 ? 'Start today!' : 'Keep it going!'}
              </p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onNeedAIInsights?.('streak_motivation', {
                  currentStreak: studyStreak,
                  status: streakStatus,
                  studyHoursThisWeek
                })}
                className="h-6 px-2 text-xs opacity-70 hover:opacity-100"
              >
                <Brain className="w-3 h-3 mr-1" />
                Boost
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical Alerts / Weekly Hours */}
      <Card className={`bg-gradient-card transition-all duration-300 hover:scale-105 border-2 ${
        criticalAlertsCount > 0 ? 'text-destructive border-destructive/20 bg-destructive/5' :
        'text-primary border-primary/20 bg-primary/5'
      }`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {criticalAlertsCount > 0 ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
              <span className="text-sm font-medium text-muted-foreground">
                {criticalAlertsCount > 0 ? 'Critical Alerts' : 'Study Hours'}
              </span>
            </div>
            {criticalAlertsCount > 0 ? (
              <Badge variant="destructive" className="text-xs animate-pulse">
                Action Needed
              </Badge>
            ) : studyHoursThisWeek >= 20 ? (
              <Badge variant="default" className="bg-success text-success-foreground text-xs">
                Great Week
              </Badge>
            ) : null}
          </div>
          <div className="space-y-2">
            {criticalAlertsCount > 0 ? (
              <>
                <p className="text-4xl font-bold">{criticalAlertsCount}</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">need attention</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onNeedAIInsights?.('critical_alerts', {
                      alertsCount: criticalAlertsCount,
                      overallGPA,
                      semesterProgress
                    })}
                    className="h-6 px-2 text-xs opacity-70 hover:opacity-100"
                  >
                    <Brain className="w-3 h-3 mr-1" />
                    Fix
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-1">
                  <p className="text-4xl font-bold">{Math.round(studyHoursThisWeek)}</p>
                  <p className="text-lg text-muted-foreground">hrs</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">this week</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onNeedAIInsights?.('study_optimization', {
                      weeklyHours: studyHoursThisWeek,
                      studyStreak,
                      semesterProgress
                    })}
                    className="h-6 px-2 text-xs opacity-70 hover:opacity-100"
                  >
                    <Brain className="w-3 h-3 mr-1" />
                    Optimize
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}