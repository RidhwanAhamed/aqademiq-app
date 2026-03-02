import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { format, startOfWeek } from "date-fns";
import { TrendingUp, TrendingDown, Minus, Award, GraduationCap, Crown, Target } from "lucide-react";

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

  // Calculate overall statistics and insights
  const stats = useMemo(() => {
    const allGrades = gradeTrendData.flatMap(week => week.grades);
    const totalGrades = allGrades.length;
    const avgGrade = totalGrades > 0 ? allGrades.reduce((sum, grade) => sum + grade.grade, 0) / totalGrades : 0;

    const recentTrend = gradeTrendData.length >= 2
      ? gradeTrendData[gradeTrendData.length - 1].avgGrade - gradeTrendData[gradeTrendData.length - 2].avgGrade
      : 0;

    const trendDirection = recentTrend > 0.3 ? 'improving' : recentTrend < -0.3 ? 'declining' : 'stable';

    // Forecast / Insight Logic
    let insight = "Keep logging grades to see your mastery forecast.";
    let masteryLevel = "Novice";
    let forecastColor = "text-muted-foreground";

    if (avgGrade >= 9) {
      masteryLevel = "Grandmaster";
      insight = "You are performing at an elite level. Maintenance is key.";
      forecastColor = "text-yellow-500";
    } else if (avgGrade >= 7.5) {
      masteryLevel = "Scholar";
      insight = trendDirection === 'improving'
        ? "Your trajectory suggests you'll hit 'Grandmaster' tier soon."
        : "Solid performance, but watch out for small dips.";
      forecastColor = "text-purple-500";
    } else if (avgGrade >= 5) {
      masteryLevel = "Apprentice";
      insight = "You're building foundations. Focus on consistency to level up.";
      forecastColor = "text-blue-500";
    }

    return {
      totalGrades,
      avgGrade: Math.round(avgGrade * 100) / 100,
      recentTrend: Math.round(recentTrend * 100) / 100,
      trendDirection,
      masteryLevel,
      insight,
      forecastColor,
      projectedGrade: Math.min(10, avgGrade + (trendDirection === 'improving' ? 0.5 : 0))
    };
  }, [gradeTrendData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card/90 backdrop-blur-md p-3 border border-border rounded-lg shadow-lg">
          <p className="font-medium mb-1">{label}</p>
          <div className="space-y-1">
            <p className="text-primary font-bold text-lg">
              {data.avgGrade.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              {data.grades.length} items graded
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-gradient-to-br from-card/50 to-muted/20 border-border/50 backdrop-blur-sm overflow-hidden h-full flex flex-col group hover:shadow-lg hover:border-primary/20 transition-all">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="w-5 h-5 text-primary" />
            Academic Mastery
          </CardTitle>
          <Badge variant="outline" className={`capitalize ${stats.trendDirection === 'improving' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-secondary'}`}>
            {stats.trendDirection}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0">
        {gradeTrendData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-8">
            <Award className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm font-medium">Log grades to unlock mastery insights</p>
          </div>
        ) : (
          <>
            {/* Mastery Header */}
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Current Tier</p>
                <div className="flex items-center gap-2">
                  <h3 className={`text-2xl font-black ${stats.forecastColor} drop-shadow-sm`}>
                    {stats.masteryLevel}
                  </h3>
                  {stats.masteryLevel === 'Grandmaster' && <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500" />}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">GPA Est.</p>
                <p className="text-2xl font-bold">{stats.avgGrade.toFixed(1)}<span className="text-sm text-muted-foreground">/10</span></p>
              </div>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-[160px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={gradeTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAvgGrade" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={stats.trendDirection === 'improving' ? '#10B981' : '#8B5CF6'} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={stats.trendDirection === 'improving' ? '#10B981' : '#8B5CF6'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  {/* Target Line Description */}
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)' }} />
                  <ReferenceLine y={stats.projectedGrade} strokeDasharray="3 3" strokeOpacity={0.5} stroke="currentColor" />

                  <Area
                    type="monotone"
                    dataKey="avgGrade"
                    stroke={stats.trendDirection === 'improving' ? '#10B981' : '#8B5CF6'}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorAvgGrade)"
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/50 backdrop-blur px-2 py-1 rounded text-[10px] text-muted-foreground border border-border/30">
                <Target className="w-3 h-3" /> Target: {stats.projectedGrade.toFixed(1)}
              </div>
            </div>

            {/* Impact/Insight Footer */}
            <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10 flex items-start gap-3">
              <div className="p-1.5 bg-background rounded-full border border-border/20 shadow-sm shrink-0">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Forecast</p>
                <p className="text-xs text-muted-foreground leading-tight">{stats.insight}</p>
              </div>
            </div>

          </>
        )}
      </CardContent>
    </Card>
  );
}
