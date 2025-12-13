import { useMemo } from "react";
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
      ? (completedSessions / sessionsInRange.length) * 100 
      : 0;

    // Calculate focus score average
    const sessionsWithScore = sessionsInRange.filter(s => s.focus_score !== null);
    const avgFocusScore = sessionsWithScore.length > 0
      ? sessionsWithScore.reduce((sum, s) => sum + (s.focus_score || 0), 0) / sessionsWithScore.length
      : null;

    // Assignment on-time rate
    const completedAssignments = assignments?.filter(a => a.is_completed) || [];
    const onTimeAssignments = completedAssignments.filter(a => {
      if (!a.updated_at || !a.due_date) return true;
      return new Date(a.updated_at) <= new Date(a.due_date);
    });
    const onTimeRate = completedAssignments.length > 0
      ? (onTimeAssignments.length / completedAssignments.length) * 100
      : null;

    return {
      sessionCompletionRate,
      totalSessions: sessionsInRange.length,
      completedSessions,
      avgFocusScore,
      onTimeRate
    };
  }, [studySessions, assignments, timeRange]);

  if (stats.totalSessions === 0 && stats.onTimeRate === null) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground text-sm">No efficiency data yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Complete study sessions to track efficiency</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Session Completion */}
      {stats.totalSessions > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Session Completion</span>
            <span className="text-sm font-medium text-foreground">
              {stats.sessionCompletionRate.toFixed(0)}%
            </span>
          </div>
          <Progress value={stats.sessionCompletionRate} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {stats.completedSessions} of {stats.totalSessions} sessions completed
          </p>
        </div>
      )}

      {/* Focus Score */}
      {stats.avgFocusScore !== null && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
          <span className="text-sm text-muted-foreground">Avg Focus Score</span>
          <span className="text-lg font-bold text-foreground">
            {stats.avgFocusScore.toFixed(0)}/100
          </span>
        </div>
      )}

      {/* On-time Rate */}
      {stats.onTimeRate !== null && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">On-time Submissions</span>
            <span className="text-sm font-medium text-foreground">
              {stats.onTimeRate.toFixed(0)}%
            </span>
          </div>
          <Progress 
            value={stats.onTimeRate} 
            className="h-2"
          />
        </div>
      )}
    </div>
  );
}
