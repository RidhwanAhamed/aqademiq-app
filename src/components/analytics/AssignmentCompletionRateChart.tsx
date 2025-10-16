import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { addDays, format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { TrendingUp, Target } from "lucide-react";

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
    "#5C7AEA", "#FF9234", "#FFC93C", "#3DECB1", "#E85D75", 
    "#FFACC7", "#A8E6CF", "#FFD93D", "#B19CD9", "#FF6B6B"
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card p-4 border border-border rounded-lg shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm">
                {entry.dataKey}: {entry.value !== null ? `${entry.value}%` : 'No data'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-gradient-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Assignment Completion Rate Trends
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Last</span>
            <Select value={weeks.toString()} onValueChange={(value) => setWeeks(Number(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2, 4, 6, 8, 10, 12, 16, 20].map((weekCount) => (
                  <SelectItem key={weekCount} value={weekCount.toString()}>
                    {weekCount}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">weeks</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {courseData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No Assignment Data</p>
            <p className="text-sm">
              No assignments found for the selected time period.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="week" 
                  className="text-sm"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  domain={[0, 100]}
                  className="text-sm"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Completion Rate (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={(value, entry) => (
                    <span style={{ color: entry.color, fontSize: '12px' }}>
                      {value}
                    </span>
                  )}
                />
                
                {courseData.map(({ course }, index) => (
                  <Line
                    key={course.id}
                    type="monotone"
                    dataKey={course.name}
                    stroke={courseColors[index % courseColors.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>

            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {courseData.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Active Courses
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {Math.round(
                    courseData.reduce((sum, { points }) => {
                      const validRates = points.filter(p => p.rate !== null).map(p => p.rate!);
                      return sum + (validRates.length > 0 ? validRates.reduce((a, b) => a + b, 0) / validRates.length : 0);
                    }, 0) / courseData.length
                  )}%
                </div>
                <div className="text-sm text-muted-foreground">
                  Average Completion Rate
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {courseData.reduce((sum, { points }) => 
                    sum + points.reduce((pSum, point) => pSum + point.total, 0), 0
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Assignments
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

