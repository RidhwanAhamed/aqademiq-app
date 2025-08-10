import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, Plus } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, startOfMonth, endOfMonth, eachWeekOfInterval, isSameMonth, isToday, isSameDay, addHours, setHours, setMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScheduleBlock, Exam } from '@/hooks/useSchedule';
import { Assignment } from '@/hooks/useAssignments';
import { useCourses } from '@/hooks/useCourses';
import { useToast } from '@/hooks/use-toast';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface CalendarViewProps {
  scheduleBlocks: ScheduleBlock[];
  exams: Exam[];
  assignments: Assignment[];
  view: 'week' | 'month';
  onViewChange: (view: 'week' | 'month') => void;
  onUpdateScheduleBlock?: (id: string, updates: Partial<ScheduleBlock>) => Promise<boolean>;
  onAddScheduleBlock?: (data: Omit<ScheduleBlock, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
}

interface CalendarEvent {
  type: 'class' | 'exam' | 'assignment';
  id: string;
  title: string;
  time: string;
  location?: string;
  color: string;
  isCompleted?: boolean;
  examType?: string;
  duration?: number;
  startTime?: string;
  endTime?: string;
}

interface QuickAddData {
  title: string;
  type: 'class' | 'study' | 'meeting';
  location: string;
  description: string;
  course_id: string;
  duration: number;
}

export function EnhancedCalendarView({ 
  scheduleBlocks, 
  exams, 
  assignments, 
  view, 
  onViewChange,
  onUpdateScheduleBlock,
  onAddScheduleBlock 
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState<Date | null>(null);
  const [quickAddTime, setQuickAddTime] = useState('09:00');
  const [quickAddData, setQuickAddData] = useState<QuickAddData>({
    title: '',
    type: 'class',
    location: '',
    description: '',
    course_id: '',
    duration: 60
  });

  const { courses } = useCourses();
  const { toast } = useToast();

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (direction === 'prev' ? -1 : 1));
    setCurrentDate(newDate);
  };

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();

    const events: CalendarEvent[] = [];

    // Schedule blocks (recurring classes)
    scheduleBlocks.forEach(block => {
      if (block.is_recurring && block.day_of_week === dayOfWeek) {
        const course = courses.find(c => c.id === block.course_id);
        events.push({
          type: 'class',
          id: block.id,
          title: course?.name || block.title,
          time: `${format(new Date(`2000-01-01T${block.start_time}`), 'HH:mm')} - ${format(new Date(`2000-01-01T${block.end_time}`), 'HH:mm')}`,
          location: block.location,
          color: course?.color || 'blue',
          startTime: block.start_time,
          endTime: block.end_time,
        });
      } else if (!block.is_recurring && block.specific_date === dateStr) {
        const course = courses.find(c => c.id === block.course_id);
        events.push({
          type: 'class',
          id: block.id,
          title: course?.name || block.title,
          time: `${format(new Date(`2000-01-01T${block.start_time}`), 'HH:mm')} - ${format(new Date(`2000-01-01T${block.end_time}`), 'HH:mm')}`,
          location: block.location,
          color: course?.color || 'blue',
          startTime: block.start_time,
          endTime: block.end_time,
        });
      }
    });

    // Exams
    exams.forEach(exam => {
      if (format(new Date(exam.exam_date), 'yyyy-MM-dd') === dateStr) {
        const course = courses.find(c => c.id === exam.course_id);
        events.push({
          type: 'exam',
          id: exam.id,
          title: `${exam.title} (${course?.name || 'Exam'})`,
          time: format(new Date(exam.exam_date), 'HH:mm'),
          location: exam.location,
          color: course?.color || 'red',
          examType: exam.exam_type,
          duration: exam.duration_minutes,
        });
      }
    });

    // Assignment due dates
    assignments.forEach(assignment => {
      if (format(new Date(assignment.due_date), 'yyyy-MM-dd') === dateStr) {
        events.push({
          type: 'assignment',
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

  const handleQuickAdd = async (date: Date, hour: number) => {
    setQuickAddDate(date);
    setQuickAddTime(`${hour.toString().padStart(2, '0')}:00`);
    setQuickAddOpen(true);
  };

  const handleQuickAddSubmit = async () => {
    if (!quickAddDate || !quickAddData.title || !onAddScheduleBlock) return;

    const [hours, minutes] = quickAddTime.split(':').map(Number);
    const startTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
    const endDate = addHours(setMinutes(setHours(quickAddDate, hours), minutes), quickAddData.duration / 60);
    const endTime = format(endDate, 'HH:mm:ss');

    const success = await onAddScheduleBlock({
      title: quickAddData.title,
      description: quickAddData.description,
      start_time: startTime,
      end_time: endTime,
      day_of_week: quickAddDate.getDay(),
      location: quickAddData.location,
      course_id: quickAddData.course_id || null,
      is_recurring: false,
      specific_date: format(quickAddDate, 'yyyy-MM-dd'),
      rotation_type: 'none',
      is_active: true,
    });

    if (success) {
      toast({
        title: "Event added",
        description: "Your event has been added to the calendar"
      });
      setQuickAddOpen(false);
      setQuickAddData({
        title: '',
        type: 'class',
        location: '',
        description: '',
        course_id: '',
        duration: 60
      });
    }
  };

  const onDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination || !onUpdateScheduleBlock) return;

    const { draggableId, destination } = result;
    const [newDate, newHour] = destination.droppableId.split('-');
    
    // Find the schedule block being moved
    const block = scheduleBlocks.find(b => b.id === draggableId);
    if (!block) return;

    // Calculate new times
    const hour = parseInt(newHour);
    const currentDuration = block.end_time && block.start_time ? 
      (new Date(`2000-01-01T${block.end_time}`).getTime() - new Date(`2000-01-01T${block.start_time}`).getTime()) / (1000 * 60 * 60) : 1;
    
    const newStartTime = `${hour.toString().padStart(2, '0')}:00:00`;
    const newEndTime = `${(hour + currentDuration).toString().padStart(2, '0')}:00:00`;

    const success = await onUpdateScheduleBlock(draggableId, {
      start_time: newStartTime,
      end_time: newEndTime,
      day_of_week: parseInt(newDate),
      specific_date: format(new Date(newDate), 'yyyy-MM-dd')
    });

    if (success) {
      toast({
        title: "Event moved",
        description: "Your event has been moved successfully"
      });
    }
  }, [scheduleBlocks, onUpdateScheduleBlock, toast]);

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <DragDropContext onDragEnd={onDragEnd}>
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
                    if (event.startTime) {
                      const eventHour = parseInt(event.startTime.split(':')[0]);
                      return eventHour === hour;
                    }
                    const eventHour = parseInt(event.time.split(':')[0]);
                    return eventHour === hour;
                  });

                  const droppableId = `${day.getDay()}-${hour}`;

                   return (
                     <Droppable key={droppableId} droppableId={droppableId}>
                       {(provided, snapshot) => (
                         <div
                           ref={provided.innerRef}
                           {...provided.droppableProps}
                           className={cn(
                             "bg-background min-h-[3rem] p-1 border-t border-border cursor-pointer hover:bg-muted/30 transition-colors",
                             snapshot.isDraggingOver && "bg-primary/20 border-primary"
                           )}
                           onClick={() => handleQuickAdd(day, hour)}
                         >
                          {events.map((event, index) => (
                            <Draggable
                              key={event.id}
                              draggableId={event.id}
                              index={index}
                              isDragDisabled={event.type !== 'class'}
                            >
                              {(provided, snapshot) => (
                                 <div
                                   ref={provided.innerRef}
                                   {...provided.draggableProps}
                                   {...provided.dragHandleProps}
                                   className={cn(
                                     "text-xs p-2 rounded mb-1 border-l-4 cursor-grab active:cursor-grabbing shadow-sm",
                                     event.type === 'exam' ? "bg-red-50 dark:bg-red-950/50 border-red-500 text-red-900 dark:text-red-100" :
                                     event.type === 'assignment' ? "bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-900 dark:text-blue-100" :
                                     "bg-green-50 dark:bg-green-950/50 border-green-500 text-green-900 dark:text-green-100",
                                     snapshot.isDragging && "rotate-2 shadow-lg z-50"
                                   )}
                                   style={provided.draggableProps.style}
                                 >
                                   <div className="font-semibold text-xs">{event.title}</div>
                                   <div className="flex items-center gap-1 opacity-75">
                                     <Clock className="w-3 h-3" />
                                     <span className="text-xs">{event.time}</span>
                                   </div>
                                   {event.location && (
                                     <div className="flex items-center gap-1 opacity-75">
                                       <MapPin className="w-3 h-3" />
                                       <span className="text-xs">{event.location}</span>
                                     </div>
                                   )}
                                 </div>
                              )}
                            </Draggable>
                          ))}
                          {events.length === 0 && (
                            <div className="flex items-center justify-center h-full opacity-0 hover:opacity-50 transition-opacity">
                              <Plus className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
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
      </DragDropContext>
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
                    "bg-card min-h-[120px] p-2 space-y-1 cursor-pointer hover:bg-muted/50 transition-colors",
                    !isCurrentMonth && "opacity-50",
                    isToday(day) && "bg-primary/5 border border-primary"
                  )}
                  onClick={() => handleQuickAdd(day, 9)}
                >
                  <div className={cn(
                    "text-sm font-medium flex items-center justify-between",
                    isToday(day) && "text-primary"
                  )}>
                    <span>{format(day, 'd')}</span>
                    {events.length === 0 && (
                      <Plus className="w-3 h-3 opacity-0 hover:opacity-50 transition-opacity" />
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    {events.slice(0, 3).map(event => (
                       <div
                         key={event.id}
                         className={cn(
                           "text-xs p-2 rounded-md border-l-2 truncate font-medium shadow-sm",
                           event.type === 'exam' ? "bg-red-50 dark:bg-red-950/50 border-red-500 text-red-900 dark:text-red-100" :
                           event.type === 'assignment' ? "bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-900 dark:text-blue-100" :
                           "bg-green-50 dark:bg-green-950/50 border-green-500 text-green-900 dark:text-green-100"
                         )}
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
    <>
      <Card className="bg-gradient-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Enhanced Schedule
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

      {/* Quick Add Dialog */}
      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Add Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={quickAddData.title}
                onChange={(e) => setQuickAddData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Event title"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select 
                  value={quickAddData.type} 
                  onValueChange={(value) => setQuickAddData(prev => ({ ...prev, type: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="class">Class</SelectItem>
                    <SelectItem value="study">Study Session</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="course">Course (optional)</Label>
                <Select 
                  value={quickAddData.course_id} 
                  onValueChange={(value) => setQuickAddData(prev => ({ ...prev, course_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select course (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(course => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="time">Start Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={quickAddTime}
                  onChange={(e) => setQuickAddTime(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={quickAddData.duration}
                  onChange={(e) => setQuickAddData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  min="15"
                  step="15"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={quickAddData.location}
                onChange={(e) => setQuickAddData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Location (optional)"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={quickAddData.description}
                onChange={(e) => setQuickAddData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description (optional)"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setQuickAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleQuickAddSubmit} disabled={!quickAddData.title}>
                Add Event
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}