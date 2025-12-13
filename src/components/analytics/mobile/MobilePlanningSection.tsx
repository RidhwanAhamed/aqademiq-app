import { useMemo } from "react";
import { CalendarDays, BookOpen, FileText, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { Progress } from "@/components/ui/progress";
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

    // Overdue count
    const overdueCount = assignments?.filter(a => 
      !a.is_completed && new Date(a.due_date) < now
    ).length || 0;

    // Urgent items (due within 3 days)
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const urgentItems = [...upcomingAssignments, ...upcomingExams].filter(item => {
      const dueDate = new Date(item.due_date || item.exam_date);
      return dueDate <= threeDaysFromNow;
    }).length;

    // Workload by course
    const courseWorkload = courses?.map(course => {
      const courseAssignments = upcomingAssignments.filter(a => a.course_id === course.id);
      const courseExams = upcomingExams.filter(e => e.course_id === course.id);
      return {
        name: course.name.length > 6 ? course.name.substring(0, 6) : course.name,
        fullName: course.name,
        color: course.color || 'hsl(var(--primary))',
        count: courseAssignments.length + courseExams.length
      };
    }).filter(c => c.count > 0).sort((a, b) => b.count - a.count).slice(0, 5) || [];

    // High priority items
    const highPriority = upcomingAssignments.filter(a => a.priority === 3).length;

    const totalItems = upcomingAssignments.length + upcomingExams.length;
    const workloadIntensity = Math.min(totalItems * 10, 100);

    return {
      totalUpcoming: totalItems,
      upcomingAssignments: upcomingAssignments.length,
      upcomingExams: upcomingExams.length,
      courseWorkload,
      highPriority,
      overdueCount,
      urgentItems,
      workloadIntensity
    };
  }, [assignments, exams, courses, timeRange]);

  if (stats.totalUpcoming === 0 && stats.overdueCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <CalendarDays className="w-8 h-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">No upcoming work</p>
        <p className="text-xs text-muted-foreground/70 mt-1">You're all caught up!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center p-2 rounded-lg bg-muted/20">
          <FileText className="w-4 h-4 mx-auto mb-1 text-primary" />
          <p className="text-lg font-bold">{stats.upcomingAssignments}</p>
          <p className="text-[10px] text-muted-foreground">Tasks</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/20">
          <BookOpen className="w-4 h-4 mx-auto mb-1 text-chart-2" />
          <p className="text-lg font-bold">{stats.upcomingExams}</p>
          <p className="text-[10px] text-muted-foreground">Exams</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-yellow-500/10">
          <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-yellow-500" />
          <p className="text-lg font-bold text-yellow-600">{stats.urgentItems}</p>
          <p className="text-[10px] text-muted-foreground">Urgent</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-destructive/10">
          <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-destructive" />
          <p className="text-lg font-bold text-destructive">{stats.overdueCount}</p>
          <p className="text-[10px] text-muted-foreground">Overdue</p>
        </div>
      </div>

      {/* Workload Bar Chart */}
      {stats.courseWorkload.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Workload by Course</p>
          <div className="h-[80px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.courseWorkload} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    `${value} items`, 
                    props.payload.fullName
                  ]}
                  labelFormatter={() => ''}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {stats.courseWorkload.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Workload Intensity */}
      <div className="p-3 rounded-lg bg-muted/20">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-muted-foreground">Workload Intensity</span>
          <span className="font-medium">{stats.workloadIntensity}%</span>
        </div>
        <Progress value={stats.workloadIntensity} className="h-2" />
        <p className="text-[10px] text-muted-foreground mt-1">
          {stats.totalUpcoming <= 3 ? 'Light' : stats.totalUpcoming <= 7 ? 'Moderate' : 'Heavy'} workload
        </p>
      </div>
    </div>
  );
}
