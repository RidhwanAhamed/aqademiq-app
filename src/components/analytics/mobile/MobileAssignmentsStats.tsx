import { useMemo } from "react";
import { TimeRange } from "./MobileTimeRangeSelector";
import { subWeeks } from "date-fns";
import { CheckCircle, Clock, AlertTriangle, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface MobileAssignmentsStatsProps {
  assignments: any[];
  timeRange: TimeRange;
}

export function MobileAssignmentsStats({ assignments, timeRange }: MobileAssignmentsStatsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    let start: Date;
    
    switch (timeRange) {
      case "week": start = subWeeks(now, 1); break;
      case "month": start = subWeeks(now, 4); break;
      case "3months": start = subWeeks(now, 12); break;
    }

    const filtered = assignments?.filter((a) => {
      const dueDate = new Date(a.due_date);
      return dueDate >= start && dueDate <= now;
    }) || [];

    const total = filtered.length;
    const completed = filtered.filter(a => a.is_completed).length;
    const pending = total - completed;
    const overdue = filtered.filter(a => !a.is_completed && new Date(a.due_date) < now).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, overdue, completionRate };
  }, [assignments, timeRange]);

  if (stats.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Target className="w-8 h-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">No assignments for this period</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center">
          <div className="text-xl font-bold text-foreground">{stats.total}</div>
          <div className="text-[10px] text-muted-foreground">Total</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-success">{stats.completed}</div>
          <div className="text-[10px] text-muted-foreground">Done</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-warning">{stats.pending}</div>
          <div className="text-[10px] text-muted-foreground">Pending</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-destructive">{stats.overdue}</div>
          <div className="text-[10px] text-muted-foreground">Overdue</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Completion</span>
          <span className="font-medium text-foreground">{stats.completionRate}%</span>
        </div>
        <Progress value={stats.completionRate} className="h-2" />
      </div>
    </div>
  );
}
