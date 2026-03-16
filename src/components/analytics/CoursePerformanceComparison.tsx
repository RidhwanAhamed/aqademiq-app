import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Award, TrendingUp, TrendingDown, Minus, BookOpen, Crown, Zap } from "lucide-react";

interface CoursePerformanceComparisonProps {
  courses: any[];
  assignments: any[];
  exams: any[];
  studySessions: any[];
}

interface CoursePerformance {
  courseId: string;
  courseName: string;
  courseCode: string;
  color: string;
  avgGrade: number;
  completionRate: number;
  studyHours: number;
  assignmentCount: number;
  examCount: number;
  totalWorkload: number;
  performanceScore: number;
  trend: 'improving' | 'declining' | 'stable';
}

export function CoursePerformanceComparison({ courses, assignments, exams, studySessions }: CoursePerformanceComparisonProps) {
  // Calculate performance metrics for each course
  const coursePerformance = useMemo(() => {
    return courses.map(course => {
      // Get assignments and exams for this course
      const courseAssignments = assignments.filter(a => a.course_id === course.id);
      const courseExams = exams.filter(e => e.course_id === course.id);

      // Calculate average grade
      const allGrades = [
        ...courseAssignments.filter(a => a.grade_points !== null).map(a => a.grade_points),
        ...courseExams.filter(e => e.grade_points !== null).map(e => e.grade_points)
      ];

      const avgGrade = allGrades.length > 0
        ? allGrades.reduce((sum, grade) => sum + grade, 0) / allGrades.length
        : 0;

      // Calculate completion rate
      const totalAssignments = courseAssignments.length;
      const completedAssignments = courseAssignments.filter(a => a.is_completed).length;
      const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

      // Calculate study hours
      const courseStudySessions = studySessions.filter(s =>
        s.course_id === course.id && s.status === 'completed' && s.actual_start && s.actual_end
      );

      const studyHours = courseStudySessions.reduce((total, session) => {
        const duration = new Date(session.actual_end).getTime() - new Date(session.actual_start).getTime();
        return total + (duration / (1000 * 60 * 60)); // Convert to hours
      }, 0);

      // Calculate total workload
      const totalWorkload = totalAssignments + courseExams.length;

      // Calculate performance score (weighted combination of metrics)
      const performanceScore = (
        (avgGrade / 10) * 40 + // 40% weight for grades
        (completionRate / 100) * 30 + // 30% weight for completion
        Math.min(studyHours / 20, 1) * 20 + // 20% weight for study hours (capped at 20 hours)
        Math.min(totalWorkload / 10, 1) * 10 // 10% weight for workload (capped at 10 items)
      ) * 100;

      // Determine trend (simplified - could be enhanced with time-based analysis)
      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      if (avgGrade > 8) trend = 'improving';
      else if (avgGrade < 6) trend = 'declining';

      return {
        courseId: course.id,
        courseName: course.name,
        courseCode: course.code || course.name.substring(0, 6),
        color: course.color || '#5183F5',
        avgGrade: Math.round(avgGrade * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100,
        studyHours: Math.round(studyHours * 100) / 100,
        assignmentCount: totalAssignments,
        examCount: courseExams.length,
        totalWorkload,
        performanceScore: Math.round(performanceScore * 100) / 100,
        trend
      } as CoursePerformance;
    }).filter(course => course.totalWorkload > 0); // Only show courses with actual work
  }, [courses, assignments, exams, studySessions]);

  // Sort courses by performance score
  const sortedCourses = useMemo(() => {
    return [...coursePerformance].sort((a, b) => b.performanceScore - a.performanceScore);
  }, [coursePerformance]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card/90 backdrop-blur-md p-3 border border-border rounded-lg shadow-lg">
          <p className="font-medium mb-2">{data.courseName}</p>
          <div className="space-y-1">
            <p className="text-primary font-bold">
              {data.performanceScore} <span className="text-xs font-normal text-muted-foreground">Score</span>
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Grade: <span className="text-foreground">{data.avgGrade}</span></span>
              <span>Hours: <span className="text-foreground">{data.studyHours}</span></span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-3 h-3 text-emerald-500" />;
      case 'declining': return <TrendingDown className="w-3 h-3 text-rose-500" />;
      default: return <Minus className="w-3 h-3 text-muted-foreground" />;
    }
  };

  return (
    <Card className="bg-gradient-to-br from-card/50 to-muted/20 border-border/50 backdrop-blur-sm overflow-hidden h-full flex flex-col hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="w-5 h-5 text-primary" />
          Course Performance
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 flex flex-col">
        {sortedCourses.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-8">
            <BookOpen className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm font-medium">No Course Data</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Performer Highlight */}
            {sortedCourses.length > 0 && (
              <div className="bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-transparent p-3 rounded-xl border border-yellow-500/20 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs uppercase text-yellow-600/80 font-bold tracking-wide">Top Performer</p>
                  <p className="font-bold text-foreground">{sortedCourses[0].courseName}</p>
                </div>
                <div className="ml-auto text-right">
                  <span className="text-2xl font-black text-yellow-600/90">{sortedCourses[0].performanceScore}</span>
                  <span className="text-xs text-yellow-600/60 ml-1">Score</span>
                </div>
              </div>
            )}

            {/* Performance Chart */}
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedCourses} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="courseCode"
                    className="text-xs"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    dy={5}
                  />
                  <YAxis
                    domain={[0, 100]}
                    className="text-xs"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar dataKey="performanceScore" radius={[6, 6, 6, 6]} barSize={32}>
                    {sortedCourses.map((course, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#EAB308' : '#3B82F6'} fillOpacity={index === 0 ? 1 : 0.6} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Compact Rankings List */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Leaderboard</h4>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin">
                {sortedCourses.map((course, index) => (
                  <div key={course.courseId} className="flex items-center justify-between p-2 rounded-lg bg-background/40 hover:bg-background/60 transition-colors border border-border/30">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${index < 3 ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}>
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium leading-none">{course.courseName}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Grade: {course.avgGrade}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-bold">{course.performanceScore}</p>
                      </div>
                      {getTrendIcon(course.trend)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
