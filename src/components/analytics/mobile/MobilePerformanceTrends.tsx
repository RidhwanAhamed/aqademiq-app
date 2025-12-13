import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, Award } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { TimeRange } from "./MobileTimeRangeSelector";
import { format, subWeeks, startOfWeek } from "date-fns";

interface MobilePerformanceTrendsProps {
  assignments: any[];
  exams: any[];
  courses: any[];
  timeRange: TimeRange;
}

export function MobilePerformanceTrends({ 
  assignments, 
  exams, 
  courses,
  timeRange 
}: MobilePerformanceTrendsProps) {
  const { stats, trendData, courseStats } = useMemo(() => {
    const now = new Date();
    let weeksBack: number;
    switch (timeRange) {
      case "week": weeksBack = 1; break;
      case "month": weeksBack = 4; break;
      case "3months": weeksBack = 12; break;
    }
    const startDate = subWeeks(now, weeksBack);

    // Filter graded items
    const gradedAssignments = assignments?.filter(a => 
      a.grade_points !== null && 
      a.grade_total !== null && 
      a.grade_total > 0 &&
      new Date(a.updated_at || a.created_at) >= startDate
    ) || [];
    
    const gradedExams = exams?.filter(e => 
      e.grade_points !== null && 
      e.grade_total !== null && 
      e.grade_total > 0 &&
      new Date(e.updated_at || e.created_at) >= startDate
    ) || [];

    // Calculate average grade
    const allGraded = [...gradedAssignments, ...gradedExams];
    const avgGrade = allGraded.length > 0
      ? allGraded.reduce((sum, item) => sum + (item.grade_points / item.grade_total) * 100, 0) / allGraded.length
      : null;

    // Build weekly trend data
    const weeklyGrades = new Map<string, number[]>();
    allGraded.forEach(item => {
      const weekKey = format(startOfWeek(new Date(item.updated_at || item.created_at)), 'MMM d');
      if (!weeklyGrades.has(weekKey)) {
        weeklyGrades.set(weekKey, []);
      }
      weeklyGrades.get(weekKey)!.push((item.grade_points / item.grade_total) * 100);
    });

    const trendData = Array.from(weeklyGrades.entries())
      .map(([week, grades]) => ({
        week,
        grade: Math.round(grades.reduce((a, b) => a + b, 0) / grades.length)
      }))
      .slice(-6);

    // Determine trend direction
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (trendData.length >= 2) {
      const diff = trendData[trendData.length - 1].grade - trendData[trendData.length - 2].grade;
      trend = diff > 5 ? 'up' : diff < -5 ? 'down' : 'stable';
    }

    // Get course performance
    const courseStats = courses?.map(course => {
      const courseAssignments = gradedAssignments.filter(a => a.course_id === course.id);
      const courseExams = gradedExams.filter(e => e.course_id === course.id);
      const allCourseGraded = [...courseAssignments, ...courseExams];
      
      const avg = allCourseGraded.length > 0
        ? allCourseGraded.reduce((sum, item) => sum + (item.grade_points / item.grade_total) * 100, 0) / allCourseGraded.length
        : null;
      
      return {
        name: course.name,
        color: course.color,
        avg,
        count: allCourseGraded.length
      };
    }).filter(c => c.avg !== null).sort((a, b) => (b.avg || 0) - (a.avg || 0)).slice(0, 4) || [];

    return {
      stats: { avgGrade, totalGraded: allGraded.length, trend },
      trendData,
      courseStats
    };
  }, [assignments, exams, courses, timeRange]);

  if (stats.totalGraded === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Award className="w-8 h-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">No graded items yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Complete assignments to see trends</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Average Grade Hero */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
        <div>
          <p className="text-xs text-muted-foreground">Average Grade</p>
          <p className="text-2xl font-bold text-foreground">
            {stats.avgGrade?.toFixed(1)}%
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stats.trend === 'up' && <TrendingUp className="w-5 h-5 text-green-500" />}
          {stats.trend === 'down' && <TrendingDown className="w-5 h-5 text-red-500" />}
          {stats.trend === 'stable' && <Minus className="w-5 h-5 text-muted-foreground" />}
          <span className="text-xs text-muted-foreground">{stats.totalGraded} graded</span>
        </div>
      </div>

      {/* Trend Chart */}
      {trendData.length > 1 && (
        <div className="h-[100px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="gradeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="week" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number) => [`${value}%`, 'Grade']}
              />
              <Area 
                type="monotone" 
                dataKey="grade" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                fill="url(#gradeGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Course Performance Grid */}
      {courseStats.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {courseStats.map((course, index) => (
            <div 
              key={index} 
              className="p-3 rounded-lg bg-muted/20 border-l-2"
              style={{ borderLeftColor: course.color || 'hsl(var(--primary))' }}
            >
              <p className="text-xs text-muted-foreground truncate">{course.name}</p>
              <p className="text-lg font-semibold">{course.avg?.toFixed(0)}%</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
