import { useMemo } from "react";
import { Award, TrendingUp, TrendingDown, Minus, BookOpen } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TimeRange } from "./MobileTimeRangeSelector";
import { format, subWeeks, subMonths, startOfWeek, isAfter } from "date-fns";

interface MobilePerformanceTabProps {
  assignments: any[];
  exams: any[];
  courses: any[];
  studySessions: any[];
  timeRange: TimeRange;
}

export function MobilePerformanceTab({ assignments, exams, courses, studySessions, timeRange }: MobilePerformanceTabProps) {
  const gradeData = useMemo(() => {
    const now = new Date();
    const weeksBack = timeRange === "week" ? 1 : timeRange === "month" ? 4 : 12;
    const startDate = subWeeks(now, weeksBack);

    const gradedItems = [
      ...assignments?.filter((a) => a.grade_points !== null && a.grade_total && isAfter(new Date(a.updated_at || a.created_at), startDate)) || [],
      ...exams?.filter((e) => e.grade_points !== null && e.grade_total && isAfter(new Date(e.updated_at || e.created_at), startDate)) || [],
    ];

    const weeklyGrades = new Map<string, number[]>();
    gradedItems.forEach((item) => {
      const weekKey = format(startOfWeek(new Date(item.updated_at || item.created_at)), "MMM d");
      if (!weeklyGrades.has(weekKey)) weeklyGrades.set(weekKey, []);
      weeklyGrades.get(weekKey)!.push((item.grade_points / item.grade_total) * 100);
    });

    const trendData = Array.from(weeklyGrades.entries())
      .map(([week, grades]) => ({
        week,
        grade: Math.round(grades.reduce((a, b) => a + b, 0) / grades.length),
      }))
      .slice(-6);

    const allGrades = gradedItems.map((item) => (item.grade_points / item.grade_total) * 100);
    const avgGrade = allGrades.length > 0 ? Math.round(allGrades.reduce((a, b) => a + b, 0) / allGrades.length) : null;

    let trend: "up" | "down" | "stable" = "stable";
    if (trendData.length >= 2) {
      const diff = trendData[trendData.length - 1].grade - trendData[trendData.length - 2].grade;
      trend = diff > 5 ? "up" : diff < -5 ? "down" : "stable";
    }

    return { trendData, avgGrade, totalGraded: gradedItems.length, trend };
  }, [assignments, exams, timeRange]);

  const coursePerformance = useMemo(() => {
    return courses
      ?.map((course) => {
        const courseItems = [
          ...assignments?.filter((a) => a.course_id === course.id && a.grade_points !== null && a.grade_total) || [],
          ...exams?.filter((e) => e.course_id === course.id && e.grade_points !== null && e.grade_total) || [],
        ];
        const grades = courseItems.map((i) => (i.grade_points / i.grade_total) * 100);
        const avg = grades.length > 0 ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length) : null;
        const studyHours = studySessions
          ?.filter((s) => s.course_id === course.id && s.actual_start && s.actual_end)
          .reduce((total, s) => total + (new Date(s.actual_end).getTime() - new Date(s.actual_start).getTime()) / (1000 * 60 * 60), 0) || 0;

        return { name: course.name, code: course.code || course.name.slice(0, 4), color: course.color, avg, studyHours: Math.round(studyHours * 10) / 10, count: courseItems.length };
      })
      .filter((c) => c.avg !== null)
      .sort((a, b) => (b.avg || 0) - (a.avg || 0))
      .slice(0, 5) || [];
  }, [courses, assignments, exams, studySessions]);

  return (
    <div className="space-y-4 p-4 pb-24">
      {/* Grade Trend */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            Grade Trend Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {gradeData.totalGraded === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Award className="w-10 h-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No graded items yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                <div>
                  <p className="text-xs text-muted-foreground">Average Grade</p>
                  <p className="text-2xl font-bold">{gradeData.avgGrade}%</p>
                </div>
                <div className="flex items-center gap-2">
                  {gradeData.trend === "up" && <TrendingUp className="w-5 h-5 text-green-500" />}
                  {gradeData.trend === "down" && <TrendingDown className="w-5 h-5 text-red-500" />}
                  {gradeData.trend === "stable" && <Minus className="w-5 h-5 text-muted-foreground" />}
                  <Badge variant="outline" className="text-xs capitalize">{gradeData.trend}</Badge>
                </div>
              </div>

              {gradeData.trendData.length > 1 && (
                <div className="h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={gradeData.trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="week" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [`${v}%`, "Grade"]} />
                      <Area type="monotone" dataKey="grade" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#gradeGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Course Performance */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Course Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {coursePerformance.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BookOpen className="w-10 h-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No course data yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-[100px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={coursePerformance} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                    <XAxis dataKey="code" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number, name: string, props: any) => [`${v}%`, props.payload.name]} labelFormatter={() => ""} />
                    <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                      {coursePerformance.map((entry, i) => (
                        <Cell key={i} fill={entry.color || "hsl(var(--primary))"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {coursePerformance.map((course, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border-l-2" style={{ borderLeftColor: course.color || "hsl(var(--primary))" }}>
                    <div className="truncate flex-1">
                      <p className="text-sm font-medium truncate">{course.name}</p>
                      <p className="text-xs text-muted-foreground">{course.studyHours}h studied</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{course.avg}%</p>
                      <p className="text-[10px] text-muted-foreground">{course.count} items</p>
                    </div>
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
