import { useMemo } from "react";
import { TimeRange } from "./MobileTimeRangeSelector";

interface MobilePlanningSectionProps {
  assignments: any[];
  exams: any[];
  courses: any[];
  timeRange: TimeRange;
}

export function MobilePlanningSection({ 
  assignments, 
  exams,
  courses,
  timeRange 
}: MobilePlanningSectionProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const daysAhead = timeRange === "week" ? 7 : timeRange === "month" ? 30 : 90;
    const endDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    // Upcoming assignments
    const upcomingAssignments = assignments?.filter(a => {
      if (a.is_completed) return false;
      const dueDate = new Date(a.due_date);
      return dueDate >= now && dueDate <= endDate;
    }) || [];

    // Upcoming exams
    const upcomingExams = exams?.filter(e => {
      const examDate = new Date(e.exam_date);
      return examDate >= now && examDate <= endDate;
    }) || [];

    // Workload by course
    const courseWorkload = courses?.map(course => {
      const courseAssignments = upcomingAssignments.filter(a => a.course_id === course.id);
      const courseExams = upcomingExams.filter(e => e.course_id === course.id);
      return {
        name: course.name,
        color: course.color,
        assignments: courseAssignments.length,
        exams: courseExams.length,
        total: courseAssignments.length + courseExams.length
      };
    }).filter(c => c.total > 0).sort((a, b) => b.total - a.total).slice(0, 4) || [];

    // High priority items
    const highPriority = upcomingAssignments.filter(a => a.priority === 3).length;

    return {
      totalUpcoming: upcomingAssignments.length + upcomingExams.length,
      upcomingAssignments: upcomingAssignments.length,
      upcomingExams: upcomingExams.length,
      courseWorkload,
      highPriority
    };
  }, [assignments, exams, courses, timeRange]);

  if (stats.totalUpcoming === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground text-sm">No upcoming work</p>
        <p className="text-xs text-muted-foreground/70 mt-1">You're all caught up!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 rounded-xl bg-muted/30">
          <p className="text-xl font-bold text-foreground">{stats.upcomingAssignments}</p>
          <p className="text-xs text-muted-foreground">Assignments</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-muted/30">
          <p className="text-xl font-bold text-foreground">{stats.upcomingExams}</p>
          <p className="text-xs text-muted-foreground">Exams</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-red-500/10">
          <p className="text-xl font-bold text-red-500">{stats.highPriority}</p>
          <p className="text-xs text-muted-foreground">High Priority</p>
        </div>
      </div>

      {/* Course Workload */}
      {stats.courseWorkload.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Workload by Course</p>
          {stats.courseWorkload.map((course, index) => (
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
              <span className="text-sm text-muted-foreground">
                {course.assignments}A / {course.exams}E
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
