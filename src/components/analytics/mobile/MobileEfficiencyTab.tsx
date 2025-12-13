import { useMemo } from "react";
import { Zap, CheckCircle2, Clock, Target, BarChart2 } from "lucide-react";
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis, BarChart, Bar, XAxis, Tooltip, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TimeRange } from "./MobileTimeRangeSelector";
import { subDays, subMonths, isAfter, isBefore } from "date-fns";

interface MobileEfficiencyTabProps {
  studySessions: any[];
  assignments: any[];
  courses: any[];
  timeRange: TimeRange;
}

export function MobileEfficiencyTab({ studySessions, assignments, courses, timeRange }: MobileEfficiencyTabProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const start = timeRange === "week" ? subDays(now, 7) : timeRange === "month" ? subMonths(now, 1) : subMonths(now, 3);

    const sessionsInRange = studySessions?.filter((s) => isAfter(new Date(s.scheduled_start || s.created_at), start)) || [];
    const completed = sessionsInRange.filter((s) => s.status === "completed" || s.actual_end).length;
    const completionRate = sessionsInRange.length > 0 ? Math.round((completed / sessionsInRange.length) * 100) : 0;

    const focusScores = sessionsInRange.filter((s) => s.focus_score).map((s) => s.focus_score);
    const avgFocus = focusScores.length > 0 ? Math.round(focusScores.reduce((a, b) => a + b, 0) / focusScores.length) : 0;

    const completedAssignments = assignments?.filter((a) => a.is_completed) || [];
    const onTime = completedAssignments.filter((a) => !a.updated_at || !a.due_date || new Date(a.updated_at) <= new Date(a.due_date));
    const onTimeRate = completedAssignments.length > 0 ? Math.round((onTime.length / completedAssignments.length) * 100) : 0;

    const efficiency = Math.round((completionRate + avgFocus + onTimeRate) / 3);

    return { completionRate, completed, total: sessionsInRange.length, avgFocus, onTimeRate, efficiency };
  }, [studySessions, assignments, timeRange]);

  const courseCompletion = useMemo(() => {
    return courses
      ?.map((course) => {
        const courseAssignments = assignments?.filter((a) => a.course_id === course.id) || [];
        const completed = courseAssignments.filter((a) => a.is_completed).length;
        const rate = courseAssignments.length > 0 ? Math.round((completed / courseAssignments.length) * 100) : 0;
        return { name: course.name.length > 8 ? course.name.slice(0, 8) + "..." : course.name, fullName: course.name, color: course.color, rate, total: courseAssignments.length };
      })
      .filter((c) => c.total > 0)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5) || [];
  }, [courses, assignments]);

  const gaugeData = [{ value: stats.efficiency, fill: "hsl(var(--primary))" }];

  return (
    <div className="space-y-4 p-4 pb-24">
      {/* Efficiency Score */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Study Efficiency Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.total === 0 && stats.onTimeRate === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Zap className="w-10 h-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No efficiency data yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative w-[110px] h-[110px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={gaugeData} startAngle={180} endAngle={0}>
                      <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                      <RadialBar background={{ fill: "hsl(var(--muted))" }} dataKey="value" cornerRadius={10} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pt-3">
                    <span className="text-2xl font-bold">{stats.efficiency}%</span>
                    <span className="text-[10px] text-muted-foreground">Efficiency</span>
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Sessions</span>
                      <span className="font-medium">{stats.completionRate}%</span>
                    </div>
                    <Progress value={stats.completionRate} className="h-1.5" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground flex items-center gap-1"><Target className="w-3 h-3" /> Focus</span>
                      <span className="font-medium">{stats.avgFocus}%</span>
                    </div>
                    <Progress value={stats.avgFocus} className="h-1.5" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> On-Time</span>
                      <span className="font-medium">{stats.onTimeRate}%</span>
                    </div>
                    <Progress value={stats.onTimeRate} className="h-1.5" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completion by Course */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary" />
            Assignment Completion by Course
          </CardTitle>
        </CardHeader>
        <CardContent>
          {courseCompletion.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BarChart2 className="w-10 h-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No assignments found</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-[100px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={courseCompletion} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number, n: string, p: any) => [`${v}%`, p.payload.fullName]} labelFormatter={() => ""} />
                    <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                      {courseCompletion.map((entry, i) => (
                        <Cell key={i} fill={entry.color || "hsl(var(--primary))"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {courseCompletion.map((course, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: course.color || "hsl(var(--primary))" }} />
                      <span className="text-sm truncate max-w-[120px]">{course.fullName}</span>
                    </div>
                    <span className="text-sm font-medium">{course.rate}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
