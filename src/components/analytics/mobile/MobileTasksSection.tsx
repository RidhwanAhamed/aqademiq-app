import { useMemo } from "react";
import { format, differenceInDays, isPast } from "date-fns";

interface MobileTasksSectionProps {
  assignments: any[];
  exams: any[];
  courses: any[];
}

export function MobileTasksSection({ 
  assignments, 
  exams,
  courses
}: MobileTasksSectionProps) {
  const tasks = useMemo(() => {
    const now = new Date();
    const upcomingItems: Array<{
      id: string;
      title: string;
      type: 'assignment' | 'exam';
      dueDate: Date;
      courseName: string;
      courseColor: string;
      daysUntil: number;
      isOverdue: boolean;
    }> = [];

    // Add pending assignments
    assignments?.forEach(a => {
      if (a.is_completed) return;
      const dueDate = new Date(a.due_date);
      const course = courses?.find(c => c.id === a.course_id);
      upcomingItems.push({
        id: a.id,
        title: a.title,
        type: 'assignment',
        dueDate,
        courseName: course?.name || 'Unknown',
        courseColor: course?.color || 'hsl(var(--primary))',
        daysUntil: differenceInDays(dueDate, now),
        isOverdue: isPast(dueDate)
      });
    });

    // Add upcoming exams
    exams?.forEach(e => {
      const examDate = new Date(e.exam_date);
      if (isPast(examDate)) return;
      const course = courses?.find(c => c.id === e.course_id);
      upcomingItems.push({
        id: e.id,
        title: e.title,
        type: 'exam',
        dueDate: examDate,
        courseName: course?.name || 'Unknown',
        courseColor: course?.color || 'hsl(var(--primary))',
        daysUntil: differenceInDays(examDate, now),
        isOverdue: false
      });
    });

    // Sort by due date and take top 5
    return upcomingItems
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .slice(0, 5);
  }, [assignments, exams, courses]);

  if (tasks.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground text-sm">No upcoming tasks</p>
        <p className="text-xs text-muted-foreground/70 mt-1">You're all caught up!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div 
          key={task.id} 
          className={`flex items-center justify-between p-3 rounded-xl ${
            task.isOverdue ? 'bg-red-500/10' : 'bg-muted/30'
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full flex-shrink-0" 
                style={{ backgroundColor: task.courseColor }}
              />
              <p className="text-sm font-medium text-foreground truncate">
                {task.title}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground truncate">
                {task.courseName}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                task.type === 'exam' 
                  ? 'bg-purple-500/20 text-purple-400' 
                  : 'bg-blue-500/20 text-blue-400'
              }`}>
                {task.type === 'exam' ? 'Exam' : 'Due'}
              </span>
            </div>
          </div>
          <div className="text-right flex-shrink-0 ml-2">
            <p className={`text-sm font-medium ${
              task.isOverdue 
                ? 'text-red-500' 
                : task.daysUntil <= 2 
                  ? 'text-yellow-500' 
                  : 'text-foreground'
            }`}>
              {task.isOverdue 
                ? 'Overdue' 
                : task.daysUntil === 0 
                  ? 'Today' 
                  : task.daysUntil === 1 
                    ? 'Tomorrow' 
                    : `${task.daysUntil}d`
              }
            </p>
            <p className="text-xs text-muted-foreground">
              {format(task.dueDate, 'MMM d')}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
