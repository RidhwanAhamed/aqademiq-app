import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isToday, isTomorrow, differenceInDays } from "date-fns";
import { Calendar as CalendarIcon, Clock, Target, Award, AlertTriangle } from "lucide-react";

interface UpcomingTasksProps {
  assignments: any[];
  exams: any[];
  courses: any[];
}

interface TaskItem {
  id: string;
  title: string;
  type: 'assignment' | 'exam';
  dueDate: Date;
  course: any;
  priority?: number;
  description?: string;
  estimatedHours?: number;
}

export function UpcomingTasks({ assignments, exams, courses }: UpcomingTasksProps) {
  const upcomingTasks = useMemo(() => {
    const now = new Date();
    const tasks: TaskItem[] = [];

    assignments
      .filter(assignment => new Date(assignment.due_date) > now && !assignment.is_completed)
      .forEach(assignment => {
        tasks.push({
          id: assignment.id,
          title: assignment.title,
          type: 'assignment',
          dueDate: new Date(assignment.due_date),
          course: courses.find(c => c.id === assignment.course_id),
          priority: assignment.priority,
          description: assignment.description,
          estimatedHours: assignment.estimated_hours,
        });
      });

    exams
      .filter(exam => new Date(exam.exam_date) > now)
      .forEach(exam => {
        tasks.push({
          id: exam.id,
          title: exam.title,
          type: 'exam',
          dueDate: new Date(exam.exam_date),
          course: courses.find(c => c.id === exam.course_id),
          description: exam.notes,
        });
      });

    return tasks.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()).slice(0, 5); // Show top 5
  }, [assignments, exams, courses]);

  const getDayLabel = (date: Date) => {
    if (isToday(date)) return "TODAY";
    if (isTomorrow(date)) return "TMRW";
    return format(date, "MMM d").toUpperCase();
  }

  const getPriorityColor = (priority?: number) => {
    if (priority === 1) return "text-destructive border-destructive/20 bg-destructive/10";
    if (priority === 2) return "text-amber-500 border-amber-500/20 bg-amber-500/10";
    return "text-muted-foreground border-border/50 bg-secondary/50";
  }

  return (
    <Card className="bg-gradient-to-br from-card/50 to-muted/20 border-border/50 backdrop-blur-sm overflow-hidden h-full flex flex-col hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Upcoming
          </CardTitle>
          <Badge variant="outline" className="text-xs">{upcomingTasks.length}</Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto pr-1 space-y-2">
        {upcomingTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <CalendarIcon className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-sm">No upcoming tasks</p>
          </div>
        ) : (
          upcomingTasks.map(task => (
            <div key={task.id} className="group relative flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-border/30">
              {/* Date Block */}
              <div className={`
                    flex flex-col items-center justify-center w-12 h-12 rounded-lg border text-xs font-bold leading-none shrink-0
                    ${isToday(task.dueDate) ? 'bg-destructive/10 border-destructive/30 text-destructive' : 'bg-background/40 border-border/40 text-muted-foreground'}
               `}>
                <span>{getDayLabel(task.dueDate)}</span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium text-sm truncate pr-2">{task.title}</h4>
                  {task.type === 'exam' && <Badge variant="secondary" className="text-[10px] h-4 px-1">Exam</Badge>}
                </div>
                <p className="text-xs text-muted-foreground truncate">{task.course?.name}</p>

                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {format(task.dueDate, "h:mm a")}
                  </div>
                  {task.estimatedHours && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Target className="w-3 h-3" />
                      {task.estimatedHours}h
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
