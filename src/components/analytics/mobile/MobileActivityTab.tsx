import { useMemo } from "react";
import { Clock, Target, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TimeRange } from "./MobileTimeRangeSelector";
import { subWeeks, subMonths, isAfter, isBefore } from "date-fns";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

interface MobileActivityTabProps {
  studySessions: any[];
  assignments: any[];
  courses: any[];
  timeRange: TimeRange;
}

export function MobileActivityTab({ studySessions, assignments, courses, timeRange }: MobileActivityTabProps) {
  const studyData = useMemo(() => {
    const now = new Date();
    const start = timeRange === "week" ? subWeeks(now, 1) : timeRange === "month" ? subMonths(now, 1) : subMonths(now, 3);

    const byCourse: Record<string, number> = {};
    let totalMinutes = 0;

    studySessions?.forEach((session) => {
      if (!session.actual_end || !session.actual_start) return;
      const sessionEnd = new Date(session.actual_end);
      if (!isAfter(sessionEnd, start) || !isBefore(sessionEnd, now)) return;

      const duration = (sessionEnd.getTime() - new Date(session.actual_start).getTime()) / (1000 * 60);
      const courseId = session.course_id || "general";
      byCourse[courseId] = (byCourse[courseId] || 0) + duration;
      totalMinutes += duration;
    });

    const pieData = Object.entries(byCourse)
      .map(([courseId, minutes]) => {
        const course = courses?.find((c) => c.id === courseId);
        return {
          name: course?.name || "General",
          value: Math.round((minutes / 60) * 10) / 10,
          color: course?.color || COLORS[0],
        };
      })
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return { pieData, totalHours: Math.round((totalMinutes / 60) * 10) / 10 };
  }, [studySessions, courses, timeRange]);

  const assignmentStats = useMemo(() => {
    const now = new Date();
    const start = timeRange === "week" ? subWeeks(now, 1) : timeRange === "month" ? subMonths(now, 1) : subMonths(now, 3);

    const filtered = assignments?.filter((a) => isAfter(new Date(a.due_date), start)) || [];
    const completed = filtered.filter((a) => a.is_completed).length;
    const pending = filtered.filter((a) => !a.is_completed && isAfter(new Date(a.due_date), now)).length;
    const overdue = filtered.filter((a) => !a.is_completed && isBefore(new Date(a.due_date), now)).length;
    const total = filtered.length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, overdue, rate };
  }, [assignments, timeRange]);

  const assignmentPieData = [
    { name: "Completed", value: assignmentStats.completed, color: "hsl(var(--success))" },
    { name: "Pending", value: assignmentStats.pending, color: "hsl(var(--primary))" },
    { name: "Overdue", value: assignmentStats.overdue, color: "hsl(var(--destructive))" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-4 p-4 pb-24">
      {/* Study Hours Distribution */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Study Hours Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {studyData.pieData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="w-10 h-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No study data for this period</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative w-[100px] h-[100px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={studyData.pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={45} dataKey="value" paddingAngle={2}>
                        {studyData.pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold">{studyData.totalHours}</span>
                    <span className="text-[10px] text-muted-foreground">hours</span>
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  {studyData.pieData.slice(0, 4).map((course, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: course.color || COLORS[i] }} />
                      <span className="truncate flex-1 text-muted-foreground">{course.name}</span>
                      <span className="font-medium">{course.value}h</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignments Overview */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Assignments Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignmentStats.total === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Target className="w-10 h-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No assignments for this period</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative w-[80px] h-[80px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={assignmentPieData} cx="50%" cy="50%" innerRadius={22} outerRadius={36} dataKey="value" paddingAngle={3}>
                        {assignmentPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold">{assignmentStats.rate}%</span>
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-muted/30 text-center">
                    <p className="text-lg font-bold">{assignmentStats.total}</p>
                    <p className="text-[10px] text-muted-foreground">Total</p>
                  </div>
                  <div className="p-2 rounded-lg bg-green-500/10 text-center">
                    <p className="text-lg font-bold text-green-500">{assignmentStats.completed}</p>
                    <p className="text-[10px] text-muted-foreground">Done</p>
                  </div>
                  <div className="p-2 rounded-lg bg-primary/10 text-center">
                    <p className="text-lg font-bold text-primary">{assignmentStats.pending}</p>
                    <p className="text-[10px] text-muted-foreground">Pending</p>
                  </div>
                  <div className="p-2 rounded-lg bg-destructive/10 text-center">
                    <p className="text-lg font-bold text-destructive">{assignmentStats.overdue}</p>
                    <p className="text-[10px] text-muted-foreground">Overdue</p>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Completion Rate</span>
                  <span className="font-medium">{assignmentStats.rate}%</span>
                </div>
                <Progress value={assignmentStats.rate} className="h-2" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
