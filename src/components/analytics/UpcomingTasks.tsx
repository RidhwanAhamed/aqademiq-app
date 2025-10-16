import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, differenceInDays, isToday, isTomorrow, isThisWeek } from "date-fns";
import { Target, Award, Clock, AlertTriangle, Calendar, BookOpen } from "lucide-react";

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
  isCompleted?: boolean;
  description?: string;
  estimatedHours?: number;
  examType?: string;
  location?: string;
}

export function UpcomingTasks({ assignments, exams, courses }: UpcomingTasksProps) {
  // Combine and sort upcoming tasks
  const upcomingTasks = useMemo(() => {
    const now = new Date();
    const tasks: TaskItem[] = [];

    // Add upcoming assignments
    assignments
      .filter(assignment => {
        const dueDate = new Date(assignment.due_date);
        return dueDate > now && !assignment.is_completed;
      })
      .forEach(assignment => {
        const course = courses.find(c => c.id === assignment.course_id);
        tasks.push({
          id: assignment.id,
          title: assignment.title,
          type: 'assignment',
          dueDate: new Date(assignment.due_date),
          course,
          priority: assignment.priority,
          isCompleted: assignment.is_completed,
          description: assignment.description,
          estimatedHours: assignment.estimated_hours,
        });
      });

    // Add upcoming exams
    exams
      .filter(exam => {
        const examDate = new Date(exam.exam_date);
        return examDate > now;
      })
      .forEach(exam => {
        const course = courses.find(c => c.id === exam.course_id);
        tasks.push({
          id: exam.id,
          title: exam.title,
          type: 'exam',
          dueDate: new Date(exam.exam_date),
          course,
          description: exam.notes,
          examType: exam.exam_type,
          location: exam.location,
        });
      });

    // Sort by due date
    return tasks.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [assignments, exams, courses]);

  // Get tasks for different time periods
  const todayTasks = upcomingTasks.filter(task => isToday(task.dueDate));
  const tomorrowTasks = upcomingTasks.filter(task => isTomorrow(task.dueDate));
  const thisWeekTasks = upcomingTasks.filter(task => isThisWeek(task.dueDate) && !isToday(task.dueDate) && !isTomorrow(task.dueDate));
  const nextWeekTasks = upcomingTasks.filter(task => {
    const daysDiff = differenceInDays(task.dueDate, new Date());
    return daysDiff > 7 && daysDiff <= 14;
  });

  const getPriorityColor = (priority?: number) => {
    if (!priority) return 'text-muted-foreground';
    switch (priority) {
      case 1: return 'text-destructive';
      case 2: return 'text-warning';
      case 3: return 'text-primary';
      default: return 'text-muted-foreground';
    }
  };

  const getPriorityBadge = (priority?: number) => {
    if (!priority) return null;
    switch (priority) {
      case 1: return <Badge variant="destructive" className="text-xs">High</Badge>;
      case 2: return <Badge variant="secondary" className="text-xs">Medium</Badge>;
      case 3: return <Badge variant="outline" className="text-xs">Low</Badge>;
      default: return null;
    }
  };

  const getDueDateBadge = (dueDate: Date) => {
    const daysDiff = differenceInDays(dueDate, new Date());
    
    if (isToday(dueDate)) {
      return <Badge variant="destructive" className="text-xs">Today</Badge>;
    } else if (isTomorrow(dueDate)) {
      return <Badge variant="secondary" className="text-xs">Tomorrow</Badge>;
    } else if (daysDiff <= 3) {
      return <Badge variant="outline" className="text-xs">{daysDiff} days</Badge>;
    } else if (daysDiff <= 7) {
      return <Badge variant="outline" className="text-xs">This week</Badge>;
    } else {
      return <Badge variant="outline" className="text-xs">{daysDiff} days</Badge>;
    }
  };

  const TaskCard = ({ task }: { task: TaskItem }) => (
    <div className="p-4 rounded-lg border bg-card hover:bg-muted/20 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {task.type === 'assignment' ? (
            <Target className="w-4 h-4 text-primary" />
          ) : (
            <Award className="w-4 h-4 text-warning" />
          )}
          <span className="font-medium text-sm">{task.title}</span>
        </div>
        <div className="flex items-center gap-1">
          {getDueDateBadge(task.dueDate)}
          {getPriorityBadge(task.priority)}
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="w-3 h-3" />
          <span>{task.course?.name || 'Unknown Course'}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-3 h-3" />
          <span>{format(task.dueDate, 'MMM d, yyyy • h:mm a')}</span>
        </div>

        {task.type === 'assignment' && task.estimatedHours && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>~{task.estimatedHours}h estimated</span>
          </div>
        )}

        {task.type === 'exam' && task.examType && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Award className="w-3 h-3" />
            <span>{task.examType}</span>
          </div>
        )}

        {task.type === 'exam' && task.location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="w-3 h-3" />
            <span>{task.location}</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Card className="bg-gradient-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Upcoming Tasks
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {upcomingTasks.length} total
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        {upcomingTasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No Upcoming Tasks</p>
            <p className="text-sm">
              All caught up! No assignments or exams due soon.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Today's Tasks */}
            {todayTasks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <h3 className="font-semibold text-destructive">Due Today</h3>
                  <Badge variant="destructive" className="text-xs">
                    {todayTasks.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {todayTasks.map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}

            {/* Tomorrow's Tasks */}
            {tomorrowTasks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-warning" />
                  <h3 className="font-semibold text-warning">Due Tomorrow</h3>
                  <Badge variant="secondary" className="text-xs">
                    {tomorrowTasks.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {tomorrowTasks.map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}

            {/* This Week's Tasks */}
            {thisWeekTasks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold">This Week</h3>
                  <Badge variant="outline" className="text-xs">
                    {thisWeekTasks.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {thisWeekTasks.map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}

            {/* Next Week's Tasks */}
            {nextWeekTasks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold text-muted-foreground">Next Week</h3>
                  <Badge variant="outline" className="text-xs">
                    {nextWeekTasks.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {nextWeekTasks.map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="pt-4 border-t">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {upcomingTasks.filter(t => t.type === 'assignment').length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Assignments
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {upcomingTasks.filter(t => t.type === 'exam').length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Exams
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

