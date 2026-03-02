import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { subDays, format } from "date-fns";
import { Brain, Clock, Target, Zap, TrendingUp, AlertTriangle, Monitor, Sparkles, Lightbulb, Trophy } from "lucide-react";

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
  colorClass: string; // Tailwnd text-color
  bgGradient: string; // Tailwnd bg-gradient-to-br
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

    return {
      metrics: [
        {
          name: "Focus Score",
          value: avgFocusScore,
          maxValue: 10,
          percentage: (avgFocusScore / 10) * 100,
          trend: focusTrend,
          description: "Quality of focus",
          icon: <Brain className="w-5 h-5" />,
          colorClass: "text-violet-500",
          bgGradient: "from-violet-500/10 to-violet-500/5",
        },
        {
          name: "Efficiency",
          value: timeEfficiency,
          maxValue: 200,
          percentage: Math.min((timeEfficiency / 200) * 100, 100),
          trend: timeEfficiency > 110 ? 'up' : timeEfficiency < 90 ? 'down' : 'stable',
          description: "Actual vs Planned",
          icon: <Zap className="w-5 h-5" />,
          colorClass: "text-amber-500",
          bgGradient: "from-amber-500/10 to-amber-500/5",
        },
        {
          name: "Productivity",
          value: productivityRate,
          maxValue: 5,
          percentage: Math.min((productivityRate / 5) * 100, 100),
          trend: productivityRate > 2 ? 'up' : productivityRate < 1 ? 'down' : 'stable',
          description: "Tasks / 10h",
          icon: <Target className="w-5 h-5" />,
          colorClass: "text-emerald-500",
          bgGradient: "from-emerald-500/10 to-emerald-500/5",
        },
        {
          name: "Consistency",
          value: consistencyRate,
          maxValue: 100,
          percentage: consistencyRate,
          trend: consistencyRate > 70 ? 'up' : consistencyRate < 40 ? 'down' : 'stable',
          description: "Days studied",
          icon: <TrendingUp className="w-5 h-5" />,
          colorClass: "text-blue-500",
          bgGradient: "from-blue-500/10 to-blue-500/5",
        },
        {
          name: "Completion",
          value: completionRate,
          maxValue: 100,
          percentage: completionRate,
          trend: completionRate > 80 ? 'up' : completionRate < 60 ? 'down' : 'stable',
          description: "Sessions finished",
          icon: <Sparkles className="w-5 h-5" />,
          colorClass: "text-pink-500",
          bgGradient: "from-pink-500/10 to-pink-500/5",
        },
        {
          name: "Duration",
          value: avgSessionDuration,
          maxValue: 120,
          percentage: Math.min((avgSessionDuration / 120) * 100, 100),
          trend: avgSessionDuration > 60 ? 'up' : avgSessionDuration < 30 ? 'down' : 'stable',
          description: "Avg minutes",
          icon: <Monitor className="w-5 h-5" />,
          colorClass: "text-cyan-500",
          bgGradient: "from-cyan-500/10 to-cyan-500/5",
        }
      ] as EfficiencyMetric[],
      insights: {
        focusUpgrade: avgFocusScore > 7 ? "High focus is saving you ~2h/week." : "Improving focus could save you 2h/week.",
        consistencyWin: consistencyRate > 60 ? "Consistency streak is building habits." : "Try studying at the same time daily.",
        totalHours: totalStudyHours
      }
    };
  }, [studySessions, assignments]);

  return (
    <Card className="bg-gradient-to-br from-card/50 to-muted/20 border-border/50 backdrop-blur-sm shadow-none h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="w-5 h-5 text-primary" />
          Study Impact & Efficiency
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 flex-1 flex flex-col">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {efficiencyMetrics.metrics.slice(0, 6).map((metric, index) => (
            <div
              key={index}
              className={`
                    relative p-3 rounded-xl border border-border/40 
                    bg-gradient-to-br ${metric.bgGradient} backdrop-blur-sm
                    hover:scale-[1.02] transition-transform duration-300
                    flex flex-col justify-between
                `}
            >
              <div className="flex justify-between items-start mb-2">
                <div className={`p-1.5 rounded-lg bg-background/50 border border-border/20 ${metric.colorClass}`}>
                  {metric.icon}
                </div>
                {metric.trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                {metric.trend === 'down' && <TrendingUp className="w-3 h-3 text-rose-500 rotate-180" />}
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-xl font-bold ${metric.colorClass}`}>
                    {metric.name === "Duration" ? Math.round(metric.value) : metric.name === "Productivity" ? metric.value.toFixed(1) : Math.round(metric.value)}
                  </span>
                  {metric.name !== "Focus Score" && metric.name !== "Productivity" && metric.name !== "Efficiency" && metric.name !== "Duration" && <span className="text-xs text-muted-foreground">%</span>}
                </div>
                <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-wide mt-0.5">{metric.name}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Impact Insight Section */}
        <div className="mt-auto pt-4 border-t border-border/30">
          <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 flex items-start gap-4 transition-all hover:bg-primary/10">
            <div className="p-2 bg-primary/20 rounded-full text-primary shrink-0">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                Weekly Impact
                <Badge variant="secondary" className="text-[10px] uppercase font-bold px-1.5 h-5">AI Insight</Badge>
              </h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                By using Aqademiq this week, you realized <strong>{efficiencyMetrics.insights.totalHours.toFixed(1)} hours</strong> of productive study. {efficiencyMetrics.insights.focusUpgrade} {efficiencyMetrics.insights.consistencyWin}
              </p>
              <div className="mt-3 flex gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                  <Trophy className="w-3 h-3" />
                  Beat Procrastination
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-blue-600 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">
                  <Zap className="w-3 h-3" />
                  Boosted Focus
                </div>
              </div>
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
