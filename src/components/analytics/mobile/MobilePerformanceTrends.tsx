import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { TimeRange } from "./MobileTimeRangeSelector";

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
  const stats = useMemo(() => {
    // Filter graded items
    const gradedAssignments = assignments?.filter(a => 
      a.grade_points !== null && a.grade_total !== null && a.grade_total > 0
    ) || [];
    
    const gradedExams = exams?.filter(e => 
      e.grade_points !== null && e.grade_total !== null && e.grade_total > 0
    ) || [];

    // Calculate average grade
    const allGraded = [...gradedAssignments, ...gradedExams];
    const avgGrade = allGraded.length > 0
      ? allGraded.reduce((sum, item) => sum + (item.grade_points / item.grade_total) * 100, 0) / allGraded.length
      : null;

    // Get course performance
    const coursePerformance = courses?.map(course => {
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
      avgGrade,
      totalGraded: allGraded.length,
      coursePerformance
    };
  }, [assignments, exams, courses]);

  if (stats.totalGraded === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground text-sm">No graded items yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Complete assignments to see trends</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Average Grade */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
        <div>
          <p className="text-xs text-muted-foreground">Average Grade</p>
          <p className="text-2xl font-bold text-foreground">
            {stats.avgGrade?.toFixed(1)}%
          </p>
        </div>
        <div className="flex items-center gap-1">
          {stats.avgGrade && stats.avgGrade >= 70 ? (
            <TrendingUp className="w-5 h-5 text-green-500" />
          ) : stats.avgGrade && stats.avgGrade >= 50 ? (
            <Minus className="w-5 h-5 text-yellow-500" />
          ) : (
            <TrendingDown className="w-5 h-5 text-red-500" />
          )}
          <span className="text-xs text-muted-foreground">{stats.totalGraded} graded</span>
        </div>
      </div>

      {/* Course Performance List */}
      {stats.coursePerformance.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">By Course</p>
          {stats.coursePerformance.map((course, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: course.color || 'hsl(var(--primary))' }}
                />
                <span className="text-sm text-foreground truncate max-w-[150px]">
                  {course.name}
                </span>
              </div>
              <span className="text-sm font-medium text-foreground">
                {course.avg?.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
