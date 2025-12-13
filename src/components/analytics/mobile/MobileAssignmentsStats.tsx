import { useMemo } from "react";
import { CheckCircle2, Clock, AlertCircle, Target } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Progress } from "@/components/ui/progress";
import { TimeRange } from "./MobileTimeRangeSelector";
import { subDays, subMonths, isAfter, isBefore } from "date-fns";

interface MobileAssignmentsStatsProps {
  assignments: any[];
  timeRange: TimeRange;
}

export function MobileAssignmentsStats({ assignments, timeRange }: MobileAssignmentsStatsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const startDate = timeRange === 'week' ? subDays(now, 7) :
                      timeRange === 'month' ? subMonths(now, 1) : subMonths(now, 3);

    const filtered = assignments.filter(a => {
      const dueDate = new Date(a.due_date);
      return isAfter(dueDate, startDate);
    });

    const completed = filtered.filter(a => a.is_completed).length;
    const pending = filtered.filter(a => !a.is_completed && isAfter(new Date(a.due_date), now)).length;
    const overdue = filtered.filter(a => !a.is_completed && isBefore(new Date(a.due_date), now)).length;
    const total = filtered.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, overdue, completionRate };
  }, [assignments, timeRange]);

  const pieData = [
    { name: 'Completed', value: stats.completed, color: 'hsl(var(--success))' },
    { name: 'Pending', value: stats.pending, color: 'hsl(var(--primary))' },
    { name: 'Overdue', value: stats.overdue, color: 'hsl(var(--destructive))' }
  ].filter(d => d.value > 0);

  if (stats.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Target className="w-10 h-10 mb-2 opacity-40" />
        <p className="text-sm">No assignments for this period</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {/* Mini Pie Chart */}
        <div className="relative w-[90px] h-[90px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={40}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-bold">{stats.completionRate}%</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/20">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <div>
              <p className="text-sm font-semibold">{stats.completed}</p>
              <p className="text-[10px] text-muted-foreground">Done</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/20">
            <Clock className="w-4 h-4 text-primary" />
            <div>
              <p className="text-sm font-semibold">{stats.pending}</p>
              <p className="text-[10px] text-muted-foreground">Pending</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/20">
            <Target className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-destructive">{stats.overdue}</p>
              <p className="text-[10px] text-muted-foreground">Overdue</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">Completion Progress</span>
          <span className="font-medium">{stats.completed}/{stats.total}</span>
        </div>
        <Progress value={stats.completionRate} className="h-2" />
      </div>
    </div>
  );
}
