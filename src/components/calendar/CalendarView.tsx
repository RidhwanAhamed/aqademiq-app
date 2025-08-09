import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, startOfMonth, endOfMonth, eachWeekOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScheduleBlock, Exam } from '@/hooks/useSchedule';
import { Assignment } from '@/hooks/useAssignments';

interface CalendarViewProps {
  scheduleBlocks: ScheduleBlock[];
  exams: Exam[];
  assignments: Assignment[];
  view: 'week' | 'month';
  onViewChange: (view: 'week' | 'month') => void;
}

export function CalendarView({ scheduleBlocks, exams, assignments, view, onViewChange }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (direction === 'prev' ? -1 : 1));
    setCurrentDate(newDate);
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();

    const events = [];

    // Schedule blocks (recurring classes)
    scheduleBlocks.forEach(block => {
      if (block.is_recurring && block.day_of_week === dayOfWeek) {
        events.push({
          type: 'class' as const,
          id: block.id,
          title: block.courses?.name || block.title,
          time: `${format(new Date(`2000-01-01T${block.start_time}`), 'HH:mm')} - ${format(new Date(`2000-01-01T${block.end_time}`), 'HH:mm')}`,
          location: block.location,
          color: block.courses?.color || 'blue',
        });
      } else if (!block.is_recurring && block.specific_date === dateStr) {
        events.push({
          type: 'class' as const,
          id: block.id,
          title: block.courses?.name || block.title,
          time: `${format(new Date(`2000-01-01T${block.start_time}`), 'HH:mm')} - ${format(new Date(`2000-01-01T${block.end_time}`), 'HH:mm')}`,
          location: block.location,
          color: block.courses?.color || 'blue',
        });
      }
    });

    // Exams
    exams.forEach(exam => {
      if (format(new Date(exam.exam_date), 'yyyy-MM-dd') === dateStr) {
        events.push({
          type: 'exam' as const,
          id: exam.id,
          title: `${exam.title} (${exam.courses?.name})`,
          time: format(new Date(exam.exam_date), 'HH:mm'),
          location: exam.location,
          color: exam.courses?.color || 'red',
          examType: exam.exam_type,
        });
      }
    });

    // Assignment due dates
    assignments.forEach(assignment => {
      if (format(new Date(assignment.due_date), 'yyyy-MM-dd') === dateStr) {
        events.push({
          type: 'assignment' as const,
          id: assignment.id,
          title: assignment.title,
          time: 'Due',
          isCompleted: assignment.is_completed,
          color: assignment.is_completed ? 'green' : 'orange',
        });
      }
    });

    return events.sort((a, b) => {
      if (a.time === 'Due') return 1;
      if (b.time === 'Due') return -1;
      return a.time.localeCompare(b.time);
    });
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-8 gap-px bg-border rounded-lg overflow-hidden">
          {/* Time column header */}
          <div className="bg-card p-3 text-sm font-medium text-center">Time</div>
          
          {/* Day headers */}
          {days.map(day => (
            <div
              key={day.toISOString()}
              className={cn(
                "bg-card p-3 text-sm font-medium text-center",
                isToday(day) && "bg-primary text-primary-foreground"
              )}
            >
              <div>{format(day, 'EEE')}</div>
              <div className="text-lg">{format(day, 'd')}</div>
            </div>
          ))}

          {/* Time slots */}
          {Array.from({ length: 14 }, (_, i) => i + 7).map(hour => (
            <div key={hour} className="contents">
              {/* Time label */}
              <div className="bg-card p-2 text-xs text-muted-foreground text-center border-t border-border">
                {format(new Date().setHours(hour, 0), 'HH:mm')}
              </div>
              
              {/* Day columns */}
              {days.map(day => {
                const events = getEventsForDate(day).filter(event => {
                  if (event.type === 'assignment') return false;
                  const eventHour = parseInt(event.time.split(':')[0]);
                  return eventHour === hour;
                });

                return (
                  <div key={`${day.toISOString()}-${hour}`} className="bg-card min-h-[3rem] p-1 border-t border-border">
                    {events.map(event => (
                      <div
                        key={event.id}
                        className={cn(
                          "text-xs p-1 rounded mb-1 border-l-2",
                          `border-l-${event.color}`
                        )}
                        style={{ backgroundColor: `hsl(var(--${event.color}))`, opacity: 0.1 }}
                      >
                        <div className="font-medium text-foreground">{event.title}</div>
                        <div className="text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {event.time}
                        </div>
                        {event.location && (
                          <div className="text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Assignment due dates for the week */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assignments Due This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {days.flatMap(day => 
                getEventsForDate(day)
                  .filter(event => event.type === 'assignment')
                  .map(event => (
                    <div key={event.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant={event.isCompleted ? "secondary" : "destructive"}>
                          {format(day, 'MMM d')}
                        </Badge>
                        <span className={cn(
                          "font-medium",
                          event.isCompleted && "line-through text-muted-foreground"
                        )}>
                          {event.title}
                        </span>
                      </div>
                      {event.isCompleted && (
                        <Badge variant="secondary">Completed</Badge>
                      )}
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {/* Day headers */}
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="bg-card p-3 text-sm font-medium text-center">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {weeks.map(weekStart => {
            const days = eachDayOfInterval({ 
              start: weekStart, 
              end: endOfWeek(weekStart, { weekStartsOn: 1 })
            });

            return days.map(day => {
              const events = getEventsForDate(day);
              const isCurrentMonth = isSameMonth(day, currentDate);

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "bg-card min-h-[100px] p-2 space-y-1",
                    !isCurrentMonth && "opacity-50",
                    isToday(day) && "bg-primary/5 border border-primary"
                  )}
                >
                  <div className={cn(
                    "text-sm font-medium",
                    isToday(day) && "text-primary"
                  )}>
                    {format(day, 'd')}
                  </div>
                  
                  <div className="space-y-1">
                    {events.slice(0, 3).map(event => (
                      <div
                        key={event.id}
                        className={cn(
                          "text-xs p-1 rounded border-l-2 truncate",
                          `border-l-${event.color}`
                        )}
                        style={{ backgroundColor: `hsl(var(--${event.color}))`, opacity: 0.1 }}
                        title={event.title}
                      >
                        {event.type === 'exam' && '📝 '}
                        {event.type === 'assignment' && '📋 '}
                        {event.type === 'class' && '🎓 '}
                        {event.title}
                      </div>
                    ))}
                    {events.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{events.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            });
          })}
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-gradient-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Schedule
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={view === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewChange('week')}
            >
              Week
            </Button>
            <Button
              variant={view === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewChange('month')}
            >
              Month
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {view === 'week' ? renderWeekView() : renderMonthView()}
      </CardContent>
    </Card>
  );
}