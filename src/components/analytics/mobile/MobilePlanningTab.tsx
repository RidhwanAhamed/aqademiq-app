import { useMemo } from "react";
import { CalendarDays, FileText, BookOpen, AlertTriangle, Layers } from "lucide-react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, Cell, PieChart, Pie } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TimeRange } from "./MobileTimeRangeSelector";
import { addDays, addMonths, isAfter, isBefore, differenceInDays, format } from "date-fns";

interface MobilePlanningTabProps {
  assignments: any[];
  exams: any[];
  courses: any[];
  studySessions: any[];
  timeRange: TimeRange;
}

export function MobilePlanningTab({ assignments, exams, courses, studySessions, timeRange }: MobilePlanningTabProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const endDate = timeRange === "week" ? addDays(now, 7) : timeRange === "month" ? addMonths(now, 1) : addMonths(now, 3);

    const upcomingAssignments = assignments?.filter((a) => !a.is_completed && isAfter(new Date(a.due_date), now) && isBefore(new Date(a.due_date), endDate)) || [];
    const upcomingExams = exams?.filter((e) => isAfter(new Date(e.exam_date), now) && isBefore(new Date(e.exam_date), endDate)) || [];
    const overdueCount = assignments?.filter((a) => !a.is_completed && isBefore(new Date(a.due_date), now)).length || 0;

    const urgentItems = [...upcomingAssignments, ...upcomingExams].filter((item) => {
      const dueDate = new Date(item.due_date || item.exam_date);
      return differenceInDays(dueDate, now) <= 3;
    }).length;

    const courseWorkload = courses
      ?.map((course) => {
        const count = upcomingAssignments.filter((a) => a.course_id === course.id).length + upcomingExams.filter((e) => e.course_id === course.id).length;
        return { name: course.name.length > 6 ? course.name.slice(0, 6) : course.name, fullName: course.name, color: course.color, count };
      })
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5) || [];

    const totalItems = upcomingAssignments.length + upcomingExams.length;
    const workloadIntensity = Math.min(totalItems * 10, 100);

    return { upcomingAssignments: upcomingAssignments.length, upcomingExams: upcomingExams.length, overdueCount, urgentItems, courseWorkload, totalItems, workloadIntensity };
  }, [assignments, exams, courses, timeRange]);

  const scheduleOptimization = useMemo(() => {
    const scheduledSessions = studySessions?.filter((s) => s.status === "scheduled" && isAfter(new Date(s.scheduled_start), new Date())).length || 0;
    const studyHoursPlanned = studySessions
      ?.filter((s) => s.status === "scheduled" && isAfter(new Date(s.scheduled_start), new Date()))
      .reduce((total, s) => total + (new Date(s.scheduled_end).getTime() - new Date(s.scheduled_start).getTime()) / (1000 * 60 * 60), 0) || 0;

    return { scheduledSessions, studyHoursPlanned: Math.round(studyHoursPlanned * 10) / 10 };
  }, [studySessions]);

  return (
    <div className="space-y-4 p-4 pb-24">
      {/* Workload Overview */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Workload Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-2 rounded-lg bg-muted/20">
                <FileText className="w-4 h-4 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">{stats.upcomingAssignments}</p>
                <p className="text-[10px] text-muted-foreground">Tasks</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/20">
                <BookOpen className="w-4 h-4 mx-auto mb-1 text-chart-2" />
                <p className="text-lg font-bold">{stats.upcomingExams}</p>
                <p className="text-[10px] text-muted-foreground">Exams</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-yellow-500/10">
                <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-yellow-500" />
                <p className="text-lg font-bold text-yellow-600">{stats.urgentItems}</p>
                <p className="text-[10px] text-muted-foreground">Urgent</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-destructive" />
                <p className="text-lg font-bold text-destructive">{stats.overdueCount}</p>
                <p className="text-[10px] text-muted-foreground">Overdue</p>
              </div>
            </div>

            {stats.courseWorkload.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">By Course</p>
                <div className="h-[80px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.courseWorkload} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number, n: string, p: any) => [`${v} items`, p.payload.fullName]} labelFormatter={() => ""} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {stats.courseWorkload.map((entry, i) => (
                          <Cell key={i} fill={entry.color || "hsl(var(--primary))"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="p-3 rounded-lg bg-muted/20">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-muted-foreground">Workload Intensity</span>
                <span className="font-medium">{stats.workloadIntensity}%</span>
              </div>
              <Progress value={stats.workloadIntensity} className="h-2" />
              <p className="text-[10px] text-muted-foreground mt-1">{stats.totalItems <= 3 ? "Light" : stats.totalItems <= 7 ? "Moderate" : "Heavy"} workload</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Optimization */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            Schedule Planning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-muted/30 text-center">
              <p className="text-3xl font-bold">{scheduleOptimization.scheduledSessions}</p>
              <p className="text-xs text-muted-foreground">Planned Sessions</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/30 text-center">
              <p className="text-3xl font-bold">{scheduleOptimization.studyHoursPlanned}</p>
              <p className="text-xs text-muted-foreground">Hours Planned</p>
            </div>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-4">
            {scheduleOptimization.scheduledSessions > 0 ? "You have study sessions scheduled. Stay on track!" : "No study sessions scheduled. Plan your study time!"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
