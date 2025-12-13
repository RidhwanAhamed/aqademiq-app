import { useMemo } from "react";
import { Zap, CheckCircle2, Clock, Target } from "lucide-react";
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";
import { Progress } from "@/components/ui/progress";
import { TimeRange } from "./MobileTimeRangeSelector";

interface MobileEfficiencySectionProps {
  studySessions: any[];
  assignments: any[];
  timeRange: TimeRange;
}

export function MobileEfficiencySection({ 
  studySessions, 
  assignments,
  timeRange 
}: MobileEfficiencySectionProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const daysBack = timeRange === "week" ? 7 : timeRange === "month" ? 30 : 90;
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    // Filter sessions in range
    const sessionsInRange = studySessions?.filter(s => {
      const sessionDate = new Date(s.scheduled_start || s.created_at);
      return sessionDate >= startDate;
    }) || [];

    // Calculate completion rate
    const completedSessions = sessionsInRange.filter(s => 
      s.status === 'completed' || s.actual_end
    ).length;
    const sessionCompletionRate = sessionsInRange.length > 0 
      ? Math.round((completedSessions / sessionsInRange.length) * 100)
      : 0;

    // Calculate focus score average
    const sessionsWithScore = sessionsInRange.filter(s => s.focus_score !== null);
    const avgFocusScore = sessionsWithScore.length > 0
      ? Math.round(sessionsWithScore.reduce((sum, s) => sum + (s.focus_score || 0), 0) / sessionsWithScore.length)
      : 0;

    // Assignment on-time rate
    const completedAssignments = assignments?.filter(a => a.is_completed) || [];
    const onTimeAssignments = completedAssignments.filter(a => {
      if (!a.updated_at || !a.due_date) return true;
      return new Date(a.updated_at) <= new Date(a.due_date);
    });
    const onTimeRate = completedAssignments.length > 0
      ? Math.round((onTimeAssignments.length / completedAssignments.length) * 100)
      : 0;

    // Overall efficiency score
    const efficiency = Math.round((sessionCompletionRate + avgFocusScore + onTimeRate) / 3);

    return {
      sessionCompletionRate,
      totalSessions: sessionsInRange.length,
      completedSessions,
      avgFocusScore,
      onTimeRate,
      efficiency
    };
  }, [studySessions, assignments, timeRange]);

  const gaugeData = [{ value: stats.efficiency, fill: 'hsl(var(--primary))' }];

  if (stats.totalSessions === 0 && stats.onTimeRate === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Zap className="w-8 h-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">No efficiency data yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Complete study sessions to track efficiency</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Efficiency Gauge + Stats */}
      <div className="flex items-center gap-4">
        {/* Radial Gauge */}
        <div className="relative w-[100px] h-[100px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart 
              cx="50%" 
              cy="50%" 
              innerRadius="65%" 
              outerRadius="100%" 
              data={gaugeData}
              startAngle={180}
              endAngle={0}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar
                background={{ fill: 'hsl(var(--muted))' }}
                dataKey="value"
                cornerRadius={10}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
            <span className="text-2xl font-bold">{stats.efficiency}%</span>
            <span className="text-[10px] text-muted-foreground">Efficiency</span>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="flex-1 space-y-3">
          {/* Completion Rate */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Completion
              </span>
              <span className="font-medium">{stats.sessionCompletionRate}%</span>
            </div>
            <Progress value={stats.sessionCompletionRate} className="h-1.5" />
          </div>

          {/* Focus Score */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <Target className="w-3 h-3" /> Focus
              </span>
              <span className="font-medium">{stats.avgFocusScore}%</span>
            </div>
            <Progress value={stats.avgFocusScore} className="h-1.5" />
          </div>

          {/* On-Time Rate */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> On-Time
              </span>
              <span className="font-medium">{stats.onTimeRate}%</span>
            </div>
            <Progress value={stats.onTimeRate} className="h-1.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
