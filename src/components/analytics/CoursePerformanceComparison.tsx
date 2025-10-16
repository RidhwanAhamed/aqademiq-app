import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Award, TrendingUp, TrendingDown, Minus, BookOpen, Target } from "lucide-react";

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
        <div className="bg-card p-3 border border-border rounded-lg shadow-lg">
          <p className="font-medium mb-2">{data.courseName}</p>
          <div className="space-y-1">
            <p className="text-primary">
              <span className="font-medium">{data.performanceScore}%</span> performance score
            </p>
            <p className="text-sm text-muted-foreground">
              Avg Grade: {data.avgGrade}/10
            </p>
            <p className="text-sm text-muted-foreground">
              Completion: {data.completionRate}%
            </p>
            <p className="text-sm text-muted-foreground">
              Study Hours: {data.studyHours}h
            </p>
            <p className="text-sm text-muted-foreground">
              Workload: {data.totalWorkload} items
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-success" />;
      case 'declining': return <TrendingDown className="w-4 h-4 text-destructive" />;
      default: return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-success';
      case 'declining': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card className="bg-gradient-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          Course Performance Comparison
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {sortedCourses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No Course Data</p>
            <p className="text-sm">
              No courses with assignments or exams found for comparison.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Performance Chart */}
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sortedCourses} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="courseCode" 
                  className="text-sm"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  domain={[0, 100]}
                  className="text-sm"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Performance Score (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="performanceScore" radius={[4, 4, 0, 0]}>
                  {sortedCourses.map((course, index) => (
                    <Cell key={`cell-${index}`} fill={course.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Course Rankings */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Course Rankings</h4>
              <div className="space-y-2">
                {sortedCourses.map((course, index) => (
                  <div key={course.courseId} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{course.courseName}</span>
                          <Badge variant="outline" className="text-xs">
                            {course.courseCode}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Grade: {course.avgGrade}/10</span>
                          <span>Completion: {course.completionRate}%</span>
                          <span>Study: {course.studyHours}h</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-primary">
                        {course.performanceScore}%
                      </span>
                      <div className={`${getTrendColor(course.trend)}`}>
                        {getTrendIcon(course.trend)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {sortedCourses.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Active Courses
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {Math.round(sortedCourses.reduce((sum, course) => sum + course.avgGrade, 0) / sortedCourses.length * 100) / 100}
                </div>
                <div className="text-sm text-muted-foreground">
                  Avg Grade
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {Math.round(sortedCourses.reduce((sum, course) => sum + course.completionRate, 0) / sortedCourses.length)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Avg Completion
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {Math.round(sortedCourses.reduce((sum, course) => sum + course.studyHours, 0))}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Study Hours
                </div>
              </div>
            </div>

            {/* Performance Insights */}
            <div className="p-3 bg-muted/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Performance Insights</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                {sortedCourses.length > 0 && (
                  <>
                    <p>• Your strongest course is <strong>{sortedCourses[0].courseName}</strong> with {sortedCourses[0].performanceScore}% performance score</p>
                    {sortedCourses.length > 1 && (
                      <p>• Consider focusing more study time on <strong>{sortedCourses[sortedCourses.length - 1].courseName}</strong> to improve overall performance</p>
                    )}
                    <p>• Overall average performance across all courses: {Math.round(sortedCourses.reduce((sum, course) => sum + course.performanceScore, 0) / sortedCourses.length)}%</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


