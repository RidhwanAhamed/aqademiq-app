import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import { addDays, format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { TrendingUp, Target, CheckCircle2 } from "lucide-react";

interface AssignmentCompletionRateChartProps {
  assignments: any[];
  courses: any[];
}

interface CourseData {
  course: any;
  points: Array<{
    week: string;
    rate: number | null;
    total: number;
    completed: number;
  }>;
}

export function AssignmentCompletionRateChart({ assignments, courses }: AssignmentCompletionRateChartProps) {
  const [weeks, setWeeks] = useState<number>(6);

  // Generate week start dates from now, going backward
  const weekStarts = useMemo(() => {
    const now = new Date();
    return Array.from({ length: weeks }, (_, i) => {
      const weekStart = startOfWeek(subWeeks(now, weeks - 1 - i));
      return weekStart;
    });
  }, [weeks]);

  // Calculate completion rate per course for each week
  const courseData: CourseData[] = useMemo(() => {
    return courses.map((course) => {
      const points = weekStarts.map((weekStart) => {
        const weekEnd = endOfWeek(weekStart);

        // Find assignments for this course in this week
        const assignmentsInWeek = assignments.filter((assignment) => {
          const dueDate = new Date(assignment.due_date);
          return (
            assignment.course_id === course.id &&
            dueDate >= weekStart &&
            dueDate <= weekEnd
          );
        });

        const total = assignmentsInWeek.length;
        const completed = assignmentsInWeek.filter((a) => a.is_completed).length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : null;

        return {
          week: format(weekStart, "MMM d"),
          rate,
          total,
          completed,
        };
      });

      return { course, points };
    }).filter(courseData =>
      // Only include courses that have assignments in the selected period
      courseData.points.some(point => point.total > 0)
    );
  }, [assignments, courses, weekStarts]);

  // Prepare data for Recharts
  const chartData = useMemo(() => {
    return weekStarts.map((weekStart, index) => {
      const item: any = {
        week: format(weekStart, "MMM d"),
        weekIndex: index
      };

      courseData.forEach(({ course, points }) => {
        const point = points[index];
        item[course.name] = point.rate !== null ? point.rate : null;
      });

      return item;
    });
  }, [weekStarts, courseData]);

  // Generate colors for each course
  const courseColors = [
    "#8B5CF6", "#EC4899", "#10B981", "#3B82F6", "#F59E0B"
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/90 backdrop-blur-md p-3 border border-border rounded-lg shadow-lg">
          <p className="font-medium mb-1 text-xs text-muted-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
              <div
                className="w-2 h-2 rounded-full ring-2 ring-opacity-20"
                style={{ backgroundColor: entry.color, '--tw-ring-color': entry.color } as any}
              />
              <span className="text-sm font-medium">
                {entry.name}: <span style={{ color: entry.color }}>{entry.value}%</span>
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const avgCompletion = useMemo(() => {
    if (courseData.length === 0) return 0;
    return Math.round(
      courseData.reduce((sum, { points }) => {
        const validRates = points.filter(p => p.rate !== null).map(p => p.rate!);
        return sum + (validRates.length > 0 ? validRates.reduce((a, b) => a + b, 0) / validRates.length : 0);
      }, 0) / courseData.length
    );
  }, [courseData]);

  return (
    <Card className="bg-gradient-to-br from-card/50 to-muted/20 border-border/50 backdrop-blur-sm overflow-hidden h-full flex flex-col hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Completion Rate
          </CardTitle>
          <div className="flex gap-1.5">
            {[4, 8, 12].map((w) => (
              <Button
                key={w}
                variant={weeks === w ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setWeeks(w)}
                className={`h-6 px-2 text-[10px] rounded-full ${weeks === w ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
              >
                {w}W
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between">
        {/* Big Number Stat */}
        <div className="mb-4 flex items-baseline gap-2">
          <span className="text-3xl font-bold">{avgCompletion}%</span>
          <span className="text-xs text-muted-foreground">Average completion rate</span>
        </div>

        {courseData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-8">
            <Target className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm font-medium">No Data</p>
          </div>
        ) : (
          <div className="flex-1 min-h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  {courseData.map((_, index) => (
                    <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={courseColors[index % courseColors.length]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={courseColors[index % courseColors.length]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="week"
                  className="text-xs"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  domain={[0, 100]}
                  className="text-xs"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />

                {courseData.map(({ course }, index) => (
                  <Area
                    key={course.id}
                    type="monotone"
                    dataKey={course.name}
                    stroke={courseColors[index % courseColors.length]}
                    strokeWidth={2}
                    fill={`url(#gradient-${index})`}
                    fillOpacity={1}
                    connectNulls={false}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
