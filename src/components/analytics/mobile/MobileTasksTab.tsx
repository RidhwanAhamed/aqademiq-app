import { useMemo } from "react";
import { ClipboardCheck, AlertTriangle, Clock, CheckCircle2, XCircle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TimeRange } from "./MobileTimeRangeSelector";
import { format, isAfter, isBefore, differenceInDays, addDays, subDays } from "date-fns";

interface MobileTasksTabProps {
  assignments: any[];
  exams: any[];
  courses: any[];
  timeRange: TimeRange;
}

export function MobileTasksTab({ assignments, exams, courses, timeRange }: MobileTasksTabProps) {
  const upcomingTasks = useMemo(() => {
    const now = new Date();
    const endDate = addDays(now, timeRange === "week" ? 7 : timeRange === "month" ? 30 : 90);

    const tasks = [
      ...assignments?.filter((a) => !a.is_completed && isAfter(new Date(a.due_date), now) && isBefore(new Date(a.due_date), endDate)).map((a) => ({
        id: a.id,
        title: a.title,
        type: "assignment" as const,
        dueDate: new Date(a.due_date),
        course: courses?.find((c) => c.id === a.course_id),
        priority: a.priority,
      })) || [],
      ...exams?.filter((e) => isAfter(new Date(e.exam_date), now) && isBefore(new Date(e.exam_date), endDate)).map((e) => ({
        id: e.id,
        title: e.title,
        type: "exam" as const,
        dueDate: new Date(e.exam_date),
        course: courses?.find((c) => c.id === e.course_id),
        priority: 3,
      })) || [],
    ].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()).slice(0, 10);

    return tasks;
  }, [assignments, exams, courses, timeRange]);

  const lateSubmissions = useMemo(() => {
    const completedAssignments = assignments?.filter((a) => a.is_completed) || [];
    const late = completedAssignments.filter((a) => a.updated_at && a.due_date && new Date(a.updated_at) > new Date(a.due_date)).length;
    const onTime = completedAssignments.length - late;
    const lateRate = completedAssignments.length > 0 ? Math.round((late / completedAssignments.length) * 100) : 0;

    // Late by course
    const byCourse = courses
      ?.map((course) => {
        const courseAssignments = completedAssignments.filter((a) => a.course_id === course.id);
        const courseLate = courseAssignments.filter((a) => a.updated_at && a.due_date && new Date(a.updated_at) > new Date(a.due_date)).length;
        return { name: course.name.length > 8 ? course.name.slice(0, 8) + "..." : course.name, fullName: course.name, color: course.color, late: courseLate, total: courseAssignments.length };
      })
      .filter((c) => c.late > 0)
      .sort((a, b) => b.late - a.late)
      .slice(0, 5) || [];

    return { late, onTime, lateRate, total: completedAssignments.length, byCourse };
  }, [assignments, courses]);

  const pieData = [
    { name: "On Time", value: lateSubmissions.onTime, color: "hsl(var(--success))" },
    { name: "Late", value: lateSubmissions.late, color: "hsl(var(--destructive))" },
  ].filter((d) => d.value > 0);

  const getDaysUntil = (date: Date) => {
    const days = differenceInDays(date, new Date());
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    return `${days} days`;
  };

  return (
    <div className="space-y-4 p-4 pb-24">
      {/* Upcoming Tasks */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-primary" />
            Upcoming Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-500/40 mb-2" />
              <p className="text-sm text-muted-foreground">No upcoming tasks!</p>
              <p className="text-xs text-muted-foreground/70">You're all caught up</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {upcomingTasks.map((task) => {
                const daysUntil = differenceInDays(task.dueDate, new Date());
                const isUrgent = daysUntil <= 2;
                return (
                  <div key={task.id} className={`p-3 rounded-lg border ${isUrgent ? "border-destructive/50 bg-destructive/5" : "border-border/50 bg-muted/20"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] h-5">
                            {task.type === "exam" ? "Exam" : "Assignment"}
                          </Badge>
                          {task.course && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: task.course.color }} />
                              <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{task.course.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-xs font-medium ${isUrgent ? "text-destructive" : "text-muted-foreground"}`}>{getDaysUntil(task.dueDate)}</p>
                        <p className="text-[10px] text-muted-foreground">{format(task.dueDate, "MMM d")}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Late Submissions */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            Submission Compliance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lateSubmissions.total === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertTriangle className="w-10 h-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No submission data yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative w-[80px] h-[80px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={22} outerRadius={36} dataKey="value" paddingAngle={3}>
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold">{100 - lateSubmissions.lateRate}%</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-muted-foreground">On Time</span>
                    </div>
                    <span className="text-sm font-medium">{lateSubmissions.onTime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-destructive" />
                      <span className="text-sm text-muted-foreground">Late</span>
                    </div>
                    <span className="text-sm font-medium">{lateSubmissions.late}</span>
                  </div>
                </div>
              </div>

              {lateSubmissions.byCourse.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Late Submissions by Course</p>
                  <div className="h-[60px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={lateSubmissions.byCourse} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number, n: string, p: any) => [`${v} late`, p.payload.fullName]} labelFormatter={() => ""} />
                        <Bar dataKey="late" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
