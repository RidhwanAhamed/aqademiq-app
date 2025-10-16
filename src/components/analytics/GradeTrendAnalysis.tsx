import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { format, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { TrendingUp, TrendingDown, Minus, Award, Target } from "lucide-react";

interface GradeTrendAnalysisProps {
  assignments: any[];
  exams: any[];
  courses: any[];
}

interface GradeDataPoint {
  date: string;
  week: string;
  grade: number;
  courseName: string;
  type: 'assignment' | 'exam';
  weight: number;
}

export function GradeTrendAnalysis({ assignments, exams, courses }: GradeTrendAnalysisProps) {
  // Calculate grade trends over time
  const gradeTrendData = useMemo(() => {
    const allGrades: GradeDataPoint[] = [];
    const now = new Date();
    
    // Process assignments with grades
    assignments
      .filter(assignment => assignment.grade_points !== null && assignment.grade_points !== undefined)
      .forEach(assignment => {
        const course = courses.find(c => c.id === assignment.course_id);
        if (course) {
          allGrades.push({
            date: assignment.updated_at || assignment.created_at,
            week: format(startOfWeek(new Date(assignment.updated_at || assignment.created_at)), 'MMM d'),
            grade: assignment.grade_points,
            courseName: course.name,
            type: 'assignment',
            weight: 1 // Default weight for assignments
          });
        }
      });

    // Process exams with grades
    exams
      .filter(exam => exam.grade_points !== null && exam.grade_points !== undefined)
      .forEach(exam => {
        const course = courses.find(c => c.id === exam.course_id);
        if (course) {
          allGrades.push({
            date: exam.updated_at || exam.created_at,
            week: format(startOfWeek(new Date(exam.updated_at || exam.created_at)), 'MMM d'),
            grade: exam.grade_points,
            courseName: course.name,
            type: 'exam',
            weight: 2 // Higher weight for exams
          });
        }
      });

    // Sort by date
    allGrades.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Group by week and calculate weighted averages
    const weeklyData = new Map<string, { week: string; grades: GradeDataPoint[]; avgGrade: number; trend: string }>();
    
    allGrades.forEach(grade => {
      const weekKey = grade.week;
      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, {
          week: weekKey,
          grades: [],
          avgGrade: 0,
          trend: 'stable'
        });
      }
      weeklyData.get(weekKey)!.grades.push(grade);
    });

    // Calculate weekly averages and trends
    const weeklyArray = Array.from(weeklyData.values()).map(weekData => {
      const totalWeight = weekData.grades.reduce((sum, grade) => sum + grade.weight, 0);
      const weightedSum = weekData.grades.reduce((sum, grade) => sum + (grade.grade * grade.weight), 0);
      weekData.avgGrade = totalWeight > 0 ? weightedSum / totalWeight : 0;
      
      return weekData;
    });

    // Calculate trend direction
    weeklyArray.forEach((weekData, index) => {
      if (index === 0) {
        weekData.trend = 'stable';
      } else {
        const prevWeek = weeklyArray[index - 1];
        const diff = weekData.avgGrade - prevWeek.avgGrade;
        if (diff > 0.5) {
          weekData.trend = 'improving';
        } else if (diff < -0.5) {
          weekData.trend = 'declining';
        } else {
          weekData.trend = 'stable';
        }
      }
    });

    return weeklyArray.slice(-12); // Last 12 weeks
  }, [assignments, exams, courses]);

  // Calculate overall statistics
  const stats = useMemo(() => {
    const allGrades = gradeTrendData.flatMap(week => week.grades);
    const totalGrades = allGrades.length;
    const avgGrade = totalGrades > 0 ? allGrades.reduce((sum, grade) => sum + grade.grade, 0) / totalGrades : 0;
    
    const improvingWeeks = gradeTrendData.filter(week => week.trend === 'improving').length;
    const decliningWeeks = gradeTrendData.filter(week => week.trend === 'declining').length;
    const stableWeeks = gradeTrendData.filter(week => week.trend === 'stable').length;

    const recentTrend = gradeTrendData.length >= 2 
      ? gradeTrendData[gradeTrendData.length - 1].avgGrade - gradeTrendData[gradeTrendData.length - 2].avgGrade
      : 0;

    return {
      totalGrades,
      avgGrade: Math.round(avgGrade * 100) / 100,
      improvingWeeks,
      decliningWeeks,
      stableWeeks,
      recentTrend: Math.round(recentTrend * 100) / 100,
      trendDirection: recentTrend > 0.3 ? 'improving' : recentTrend < -0.3 ? 'declining' : 'stable'
    };
  }, [gradeTrendData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card p-3 border border-border rounded-lg shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-primary">
              <span className="font-medium">{data.avgGrade.toFixed(2)}</span> average grade
            </p>
            <p className="text-sm text-muted-foreground">
              {data.grades.length} grade{data.grades.length !== 1 ? 's' : ''} recorded
            </p>
            <div className="flex items-center gap-1">
              {data.trend === 'improving' && <TrendingUp className="w-3 h-3 text-success" />}
              {data.trend === 'declining' && <TrendingDown className="w-3 h-3 text-destructive" />}
              {data.trend === 'stable' && <Minus className="w-3 h-3 text-muted-foreground" />}
              <span className="text-xs capitalize">{data.trend}</span>
            </div>
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
      case 'improving': return '#10B981';
      case 'declining': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <Card className="bg-gradient-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Grade Trend Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            {getTrendIcon(stats.trendDirection)}
            <Badge variant="outline" className="text-xs">
              {stats.trendDirection}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {gradeTrendData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No Grade Data</p>
            <p className="text-sm">
              No graded assignments or exams found to analyze trends.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={gradeTrendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="week" 
                  className="text-sm"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  domain={[0, 10]}
                  className="text-sm"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Grade (10.0 scale)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={7.0} stroke="#10B981" strokeDasharray="5 5" label="Good (7.0)" />
                <ReferenceLine y={8.5} stroke="#059669" strokeDasharray="5 5" label="Excellent (8.5)" />
                <Line
                  type="monotone"
                  dataKey="avgGrade"
                  stroke="#5183F5"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#5183F5' }}
                  activeDot={{ r: 7, fill: '#5183F5' }}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Summary Statistics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {stats.avgGrade}
                </div>
                <div className="text-sm text-muted-foreground">
                  Average Grade
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {stats.totalGrades}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Grades
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success">
                  {stats.improvingWeeks}
                </div>
                <div className="text-sm text-muted-foreground">
                  Improving Weeks
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive">
                  {stats.decliningWeeks}
                </div>
                <div className="text-sm text-muted-foreground">
                  Declining Weeks
                </div>
              </div>
            </div>

            {/* Trend Analysis */}
            <div className="p-3 bg-muted/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {getTrendIcon(stats.trendDirection)}
                <span className="text-sm font-medium">Recent Trend Analysis</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {stats.trendDirection === 'improving' && `Your grades are improving! Recent trend shows +${stats.recentTrend} points.`}
                {stats.trendDirection === 'declining' && `Your grades are declining. Recent trend shows ${stats.recentTrend} points. Consider reviewing study strategies.`}
                {stats.trendDirection === 'stable' && `Your grades are stable. Recent trend shows minimal change (${stats.recentTrend} points).`}
              </div>
            </div>

            {/* Weekly Breakdown */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Weekly Performance</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {gradeTrendData.slice(-6).map((week, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/20">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{week.week}</span>
                      <Badge variant="outline" className="text-xs">
                        {week.grades.length} grades
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {week.avgGrade.toFixed(2)}
                      </span>
                      {getTrendIcon(week.trend)}
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


