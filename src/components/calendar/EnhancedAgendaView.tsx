import React, { useMemo, useState } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CalendarEvent } from '@/hooks/useRealtimeCalendar';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import { EnhancedEventContextMenu } from './EnhancedEventContextMenu';

interface EnhancedAgendaViewProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  conflicts?: string[];
  onOpenConflictPanel?: () => void;
  onEventEdit?: (event: CalendarEvent) => void;
  onEventDelete?: (event: CalendarEvent) => Promise<boolean>;
  onEventDuplicate?: (event: CalendarEvent) => void;
  onEventReschedule?: (event: CalendarEvent) => void;
}

export function EnhancedAgendaView({
  selectedDate,
  onDateChange,
  events,
  onEventClick,
  conflicts = [],
  onOpenConflictPanel,
  onEventEdit,
  onEventDelete,
  onEventDuplicate,
  onEventReschedule
}: EnhancedAgendaViewProps) {
  const currentWeek = useMemo(() => 
    startOfWeek(selectedDate, { weekStartsOn: 1 }), 
    [selectedDate]
  );

  const weekStart = useMemo(() => startOfWeek(currentWeek, { weekStartsOn: 1 }), [currentWeek]);
  const weekEnd = useMemo(() => endOfWeek(currentWeek, { weekStartsOn: 1 }), [currentWeek]);
  
  const weekDays = useMemo(() => 
    eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd]
  );

  const handlePrevWeek = () => {
    const newWeek = subWeeks(currentWeek, 1);
    onDateChange(newWeek);
  };

  const handleNextWeek = () => {
    const newWeek = addWeeks(currentWeek, 1);
    onDateChange(newWeek);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const getEventsForDay = (day: Date) => {
    return events
      .filter(event => isSameDay(event.start, day))
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'exam':
        return '📝';
      case 'assignment':
        return '📋';
      case 'class':
        return '🎓';
      default:
        return '📅';
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'exam':
        return 'destructive';
      case 'assignment':
        return 'warning';
      case 'class':
        return 'primary';
      default:
        return 'secondary';
    }
  };

  const renderEventCard = (event: CalendarEvent) => {
    const hasConflict = conflicts.includes(event.id);
    const isCompleted = event.type === 'assignment' && (event as any).isCompleted;
    const isPast = event.end < new Date();

    const eventCard = (
      <div
        key={event.id}
        className={cn(
          "p-4 rounded-lg border border-border cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]",
          "bg-gradient-to-r from-card to-card/80",
          hasConflict && "ring-2 ring-destructive bg-destructive/5",
          isPast && !isCompleted && "opacity-60",
          isCompleted && "bg-success/5 border-success/20"
        )}
        style={{
          borderLeftColor: `hsl(var(--${event.color || 'primary'}))`,
          borderLeftWidth: '4px'
        }}
        onClick={() => onEventClick(event)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{getEventIcon(event.type)}</span>
              <h3 className={cn(
                "font-semibold text-foreground",
                isCompleted && "line-through text-muted-foreground"
              )}>
                {event.title}
              </h3>
              {hasConflict && (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
              {isCompleted && (
                <CheckCircle className="w-4 h-4 text-success" />
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                </span>
                <span className="text-xs">
                  ({Math.round((event.end.getTime() - event.start.getTime()) / (1000 * 60))} min)
                </span>
              </div>
              
              {event.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{event.location}</span>
                </div>
              )}
              
              {event.course && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {typeof event.course === 'string' ? event.course : event.course.name}
                  </Badge>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <Badge 
              variant={getEventTypeColor(event.type) as any}
              className="text-xs"
            >
              {event.type}
            </Badge>
            {isPast && !isCompleted && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Past
              </Badge>
            )}
          </div>
        </div>
      </div>
    );

    // Wrap with context menu if handlers are provided
    if (onEventEdit && onEventDelete && onEventDuplicate && onEventReschedule) {
      return (
        <EnhancedEventContextMenu
          key={event.id}
          event={event}
          onEdit={onEventEdit}
          onDelete={onEventDelete}
          onDuplicate={onEventDuplicate}
          onReschedule={onEventReschedule}
        >
          {eventCard}
        </EnhancedEventContextMenu>
      );
    }

    return eventCard;
  };

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter(event => event.start >= now)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 5);
  }, [events]);

  const conflictEvents = useMemo(() => {
    return events.filter(event => conflicts.includes(event.id));
  }, [events, conflicts]);

  return (
    <div className="space-y-6">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">Weekly Agenda</h2>
          <span className="text-sm text-muted-foreground">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrevWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main agenda */}
        <div className="lg:col-span-2 space-y-4">
          {/* Conflicts alert */}
          {conflictEvents.length > 0 && (
            <Card 
              className="border-destructive/20 bg-destructive/5 cursor-pointer transition-all hover:shadow-md hover:bg-destructive/10"
              onClick={onOpenConflictPanel}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="w-5 h-5" />
                  Schedule Conflicts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {conflictEvents.map(event => (
                  <div key={event.id} className="text-sm">
                    <span className="font-medium">{event.title}</span>
                    <span className="text-muted-foreground ml-2">
                      {format(event.start, 'MMM d, HH:mm')}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Daily agenda */}
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-6">
              {weekDays.map(day => {
                const dayEvents = getEventsForDay(day);
                const isToday_ = isToday(day);

                return (
                  <div key={day.toISOString()}>
                    <div className={cn(
                      "flex items-center gap-3 mb-4 pb-2 border-b",
                      isToday_ && "border-primary"
                    )}>
                      <div className={cn(
                        "flex flex-col items-center justify-center w-12 h-12 rounded-lg",
                        isToday_ ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        <span className="text-xs font-medium">
                          {format(day, 'EEE')}
                        </span>
                        <span className="text-lg font-bold">
                          {format(day, 'd')}
                        </span>
                      </div>
                      <div>
                        <h3 className={cn(
                          "font-semibold",
                          isToday_ && "text-primary"
                        )}>
                          {format(day, 'EEEE, MMMM d')}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 ml-16">
                      {dayEvents.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No events scheduled</p>
                        </div>
                      ) : (
                        dayEvents.map(event => renderEventCard(event))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Upcoming events */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming events
                  </p>
                ) : (
                  upcomingEvents.map((event, index) => (
                    <div key={event.id}>
                      <div 
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => onEventClick(event)}
                      >
                        <div className="text-lg">{getEventIcon(event.type)}</div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(event.start, 'MMM d, HH:mm')}
                          </p>
                        </div>
                      </div>
                      {index < upcomingEvents.length - 1 && <Separator className="my-2" />}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Events</span>
                  <span className="font-medium">{events.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Classes</span>
                <span className="font-medium">
                  {events.filter(e => e.type === 'schedule').length}
                </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Exams</span>
                  <span className="font-medium">
                    {events.filter(e => e.type === 'exam').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Assignments</span>
                  <span className="font-medium">
                    {events.filter(e => e.type === 'assignment').length}
                  </span>
                </div>
                {conflicts.length > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span className="text-sm">Conflicts</span>
                    <span className="font-medium">{conflicts.length}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}