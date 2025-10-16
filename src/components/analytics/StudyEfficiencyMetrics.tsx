import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Brain, Clock, Target, Zap, TrendingUp, AlertTriangle } from "lucide-react";

interface StudyEfficiencyMetricsProps {
  studySessions: any[];
  assignments: any[];
  courses: any[];
}

interface EfficiencyMetric {
  name: string;
  value: number;
  maxValue: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  description: string;
  icon: React.ReactNode;
  color: string;
}

export function StudyEfficiencyMetrics({ studySessions, assignments, courses }: StudyEfficiencyMetricsProps) {
  // Calculate study efficiency metrics
  const efficiencyMetrics = useMemo(() => {
    const now = new Date();
    const last30Days = subDays(now, 30);
    const last7Days = subDays(now, 7);

    // Filter recent study sessions
    const recentSessions = studySessions.filter(session => {
      const sessionDate = new Date(session.actual_start || session.scheduled_start);
      return sessionDate >= last30Days && session.status === 'completed';
    });

    const recent7DaySessions = studySessions.filter(session => {
      const sessionDate = new Date(session.actual_start || session.scheduled_start);
      return sessionDate >= last7Days && session.status === 'completed';
    });

    // 1. Focus Score Average
    const focusScores = recentSessions
      .filter(session => session.focus_score !== null && session.focus_score !== undefined)
      .map(session => session.focus_score);
    
    const avgFocusScore = focusScores.length > 0 
      ? focusScores.reduce((sum, score) => sum + score, 0) / focusScores.length 
      : 0;

    // 2. Study Time vs Planned Time Efficiency
    const plannedVsActual = recentSessions
      .filter(session => session.actual_start && session.actual_end && session.scheduled_start && session.scheduled_end)
      .map(session => {
        const plannedDuration = new Date(session.scheduled_end).getTime() - new Date(session.scheduled_start).getTime();
        const actualDuration = new Date(session.actual_end).getTime() - new Date(session.actual_start).getTime();
        return { planned: plannedDuration, actual: actualDuration };
      });

    const timeEfficiency = plannedVsActual.length > 0
      ? plannedVsActual.reduce((sum, session) => {
          const efficiency = session.planned > 0 ? (session.actual / session.planned) * 100 : 0;
          return sum + Math.min(efficiency, 200); // Cap at 200% to avoid outliers
        }, 0) / plannedVsActual.length
      : 100;

    // 3. Assignment Completion Rate vs Study Time
    const completedAssignments = assignments.filter(assignment => 
      assignment.is_completed && 
      new Date(assignment.updated_at || assignment.created_at) >= last30Days
    );

    const totalStudyHours = recentSessions.reduce((total, session) => {
      if (session.actual_start && session.actual_end) {
        const duration = new Date(session.actual_end).getTime() - new Date(session.actual_start).getTime();
        return total + (duration / (1000 * 60 * 60)); // Convert to hours
      }
      return total;
    }, 0);

    const productivityRate = totalStudyHours > 0 
      ? (completedAssignments.length / totalStudyHours) * 10 // Assignments per 10 hours
      : 0;

    // 4. Study Consistency (days with study sessions)
    const studyDays = new Set(
      recentSessions.map(session => 
        format(new Date(session.actual_start || session.scheduled_start), 'yyyy-MM-dd')
      )
    ).size;

    const consistencyRate = (studyDays / 30) * 100;

    // 5. Session Completion Rate
    const totalSessions = studySessions.filter(session => 
      new Date(session.scheduled_start) >= last30Days
    ).length;

    const completedSessions = recentSessions.length;
    const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

    // 6. Average Session Duration
    const sessionDurations = recentSessions
      .filter(session => session.actual_start && session.actual_end)
      .map(session => {
        const duration = new Date(session.actual_end).getTime() - new Date(session.actual_start).getTime();
        return duration / (1000 * 60); // Convert to minutes
      });

    const avgSessionDuration = sessionDurations.length > 0
      ? sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length
      : 0;

    // Calculate trends (comparing last 7 days vs previous 7 days)
    const previous7Days = studySessions.filter(session => {
      const sessionDate = new Date(session.actual_start || session.scheduled_start);
      return sessionDate >= subDays(now, 14) && sessionDate < last7Days && session.status === 'completed';
    });

    const recentFocusScores = recent7DaySessions
      .filter(session => session.focus_score !== null && session.focus_score !== undefined)
      .map(session => session.focus_score);
    
    const recentAvgFocus = recentFocusScores.length > 0 
      ? recentFocusScores.reduce((sum, score) => sum + score, 0) / recentFocusScores.length 
      : 0;

    const previousFocusScores = previous7Days
      .filter(session => session.focus_score !== null && session.focus_score !== undefined)
      .map(session => session.focus_score);
    
    const previousAvgFocus = previousFocusScores.length > 0 
      ? previousFocusScores.reduce((sum, score) => sum + score, 0) / previousFocusScores.length 
      : 0;

    const focusTrend = recentAvgFocus > previousAvgFocus + 0.5 ? 'up' : 
                      recentAvgFocus < previousAvgFocus - 0.5 ? 'down' : 'stable';

    return [
      {
        name: "Focus Score",
        value: avgFocusScore,
        maxValue: 10,
        percentage: (avgFocusScore / 10) * 100,
        trend: focusTrend,
        description: "Average focus quality during study sessions",
        icon: <Brain className="w-4 h-4" />,
        color: "text-primary"
      },
      {
        name: "Time Efficiency",
        value: timeEfficiency,
        maxValue: 200,
        percentage: Math.min((timeEfficiency / 200) * 100, 100),
        trend: timeEfficiency > 110 ? 'up' : timeEfficiency < 90 ? 'down' : 'stable',
        description: "Actual vs planned study time ratio",
        icon: <Clock className="w-4 h-4" />,
        color: "text-warning"
      },
      {
        name: "Productivity Rate",
        value: productivityRate,
        maxValue: 5,
        percentage: Math.min((productivityRate / 5) * 100, 100),
        trend: productivityRate > 2 ? 'up' : productivityRate < 1 ? 'down' : 'stable',
        description: "Assignments completed per 10 study hours",
        icon: <Target className="w-4 h-4" />,
        color: "text-success"
      },
      {
        name: "Study Consistency",
        value: consistencyRate,
        maxValue: 100,
        percentage: consistencyRate,
        trend: consistencyRate > 70 ? 'up' : consistencyRate < 40 ? 'down' : 'stable',
        description: "Percentage of days with study sessions",
        icon: <TrendingUp className="w-4 h-4" />,
        color: "text-info"
      },
      {
        name: "Session Completion",
        value: completionRate,
        maxValue: 100,
        percentage: completionRate,
        trend: completionRate > 80 ? 'up' : completionRate < 60 ? 'down' : 'stable',
        description: "Percentage of planned sessions completed",
        icon: <Zap className="w-4 h-4" />,
        color: "text-purple-500"
      },
      {
        name: "Avg Session Duration",
        value: avgSessionDuration,
        maxValue: 120,
        percentage: Math.min((avgSessionDuration / 120) * 100, 100),
        trend: avgSessionDuration > 60 ? 'up' : avgSessionDuration < 30 ? 'down' : 'stable',
        description: "Average study session length in minutes",
        icon: <Clock className="w-4 h-4" />,
        color: "text-orange-500"
      }
    ] as EfficiencyMetric[];
  }, [studySessions, assignments]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-success" />;
      case 'down': return <AlertTriangle className="w-3 h-3 text-destructive" />;
      default: return <div className="w-3 h-3 rounded-full bg-muted-foreground" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-success';
      case 'down': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card className="bg-gradient-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          Study Efficiency Metrics
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {efficiencyMetrics.map((metric, index) => (
            <div key={index} className="p-4 rounded-lg border bg-card/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={metric.color}>
                    {metric.icon}
                  </div>
                  <span className="font-medium text-sm">{metric.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  {getTrendIcon(metric.trend)}
                  <span className={`text-xs ${getTrendColor(metric.trend)}`}>
                    {metric.trend}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {metric.name === "Avg Session Duration" 
                      ? `${Math.round(metric.value)}m`
                      : metric.name === "Productivity Rate"
                      ? `${metric.value.toFixed(1)}`
                      : `${metric.value.toFixed(1)}`
                    }
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {metric.percentage.toFixed(0)}%
                  </span>
                </div>
                
                <Progress 
                  value={metric.percentage} 
                  className="h-2"
                />
                
                <p className="text-xs text-muted-foreground">
                  {metric.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Overall Efficiency Score */}
        <div className="mt-6 p-4 bg-muted/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">Overall Study Efficiency</h4>
            <Badge variant="outline">
              {Math.round(efficiencyMetrics.reduce((sum, metric) => sum + metric.percentage, 0) / efficiencyMetrics.length)}%
            </Badge>
          </div>
          <Progress 
            value={efficiencyMetrics.reduce((sum, metric) => sum + metric.percentage, 0) / efficiencyMetrics.length} 
            className="h-3"
          />
          <p className="text-sm text-muted-foreground mt-2">
            Based on focus quality, time management, productivity, and consistency metrics.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}


