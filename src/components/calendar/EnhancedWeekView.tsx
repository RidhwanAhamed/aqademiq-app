// Week view grid responsible for rendering realtime events; replace mock
// useRealtimeCalendar data via services/api -> /api/calendar/events in backend.
// TODO: API -> /api/calendar/events
import React, { useState, useCallback, useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks, isToday } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarEvent } from '@/hooks/useRealtimeCalendar';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Clock, MapPin, Plus } from 'lucide-react';
import { AddCalendarEventDialog } from './AddCalendarEventDialog';

const DAY_START_HOUR = 0;
const DAY_END_HOUR = 24;
const HOURS_PER_DAY = DAY_END_HOUR - DAY_START_HOUR;

interface EnhancedWeekViewProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onEventUpdate: (event: CalendarEvent, updates: Partial<CalendarEvent>) => void;
  onTimeSlotClick: (date: Date, hour: number) => void;
  conflicts?: string[];
}

export function EnhancedWeekView({
  selectedDate,
  onDateChange,
  events,
  onEventClick,
  onEventUpdate,
  onTimeSlotClick,
  conflicts = []
}: EnhancedWeekViewProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ date: Date; hour: number } | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);

  const currentWeek = useMemo(() => 
    startOfWeek(selectedDate, { weekStartsOn: 1 }), 
    [selectedDate]
  );

  const weekDays = useMemo(() => 
    Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i)), 
    [currentWeek]
  );

  const timeSlots = useMemo(() => 
    Array.from({ length: HOURS_PER_DAY }, (_, i) => i + DAY_START_HOUR), 
    []
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

  const handleTimeSlotClick = useCallback((day: Date, hour: number) => {
    setSelectedTimeSlot({ date: day, hour });
    setShowAddDialog(true);
    onTimeSlotClick(day, hour);
  }, [onTimeSlotClick]);

  const getEventsForSlot = useCallback((day: Date, hour: number) => {
    return events.filter(event => {
      if (!isSameDay(event.start, day)) return false;
      const startHourPosition = event.start.getHours() + event.start.getMinutes() / 60;
      return startHourPosition >= hour && startHourPosition < hour + 1;
    });
  }, [events]);

  const handleEventDragStart = (event: CalendarEvent) => {
    setDraggedEvent(event);
  };

  const handleEventDrop = (targetDay: Date, targetHour: number) => {
    if (!draggedEvent) return;

    const duration = draggedEvent.end.getTime() - draggedEvent.start.getTime();
    const newStart = new Date(targetDay);
    newStart.setHours(targetHour, 0, 0, 0);
    const newEnd = new Date(newStart.getTime() + duration);

    onEventUpdate(draggedEvent, { start: newStart, end: newEnd });
    setDraggedEvent(null);
  };

  const renderEventCard = (event: CalendarEvent, style?: React.CSSProperties) => {
    const hasConflict = conflicts.includes(event.id);
    const isAllDay = event.end.getTime() - event.start.getTime() >= 24 * 60 * 60 * 1000;
    // Check if event was created by Ada AI (stored in rotation_group field)
    const isAdaCreated = (event.data as any)?.rotation_group === 'ada-ai';

    return (
      <div
        key={event.id}
        className={cn(
          "absolute left-1 right-1 rounded-md px-2 py-1 text-xs cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md z-10",
          "border-l-4 bg-gradient-to-r from-white/90 to-white/70 dark:from-card/90 dark:to-card/70",
          hasConflict && "ring-2 ring-destructive animate-pulse",
          isAllDay && "bg-gradient-to-r from-primary/20 to-primary/10"
        )}
        style={{
          ...style,
          borderLeftColor: `hsl(var(--${event.color || 'primary'}))`,
        }}
        onClick={() => onEventClick(event)}
        onDragStart={() => handleEventDragStart(event)}
        draggable
        title={`${event.title} - ${format(event.start, 'HH:mm')} to ${format(event.end, 'HH:mm')}`}
      >
        <div className="flex items-center gap-1">
          <span className="font-medium text-foreground truncate flex-1">{event.title}</span>
          {isAdaCreated && (
            <span className="flex-shrink-0 px-1 py-0.5 text-[8px] font-semibold bg-gradient-to-r from-primary/20 to-secondary/20 text-primary rounded">
              Ada
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span className="text-[10px]">
            {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
          </span>
        </div>
        {event.location && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span className="text-[10px] truncate">{event.location}</span>
          </div>
        )}
      </div>
    );
  };

  const calculateEventPosition = (event: CalendarEvent, dayIndex: number) => {
    const startHour = event.start.getHours();
    const startMinute = event.start.getMinutes();
    const endHour = event.end.getHours();
    const endMinute = event.end.getMinutes();

    const startSlot = startHour - DAY_START_HOUR + (startMinute / 60);
    const duration = (endHour - startHour) + ((endMinute - startMinute) / 60);
    
    const HOUR_HEIGHT = 64; // Height of each hour slot
    const top = startSlot * HOUR_HEIGHT + 2;
    const height = Math.max(duration * HOUR_HEIGHT - 4, 32);

    return { top, height };
  };

  return (
    <div className="space-y-4">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">
            {format(currentWeek, 'MMM d')} - {format(addDays(currentWeek, 6), 'MMM d, yyyy')}
          </h2>
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

      {/* Week view grid */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-8 bg-gradient-card">
          {/* Time column header */}
          <div className="p-3 text-sm font-medium text-center border-r border-border bg-muted/50">
            Time
          </div>
          
          {/* Day headers */}
          {weekDays.map((day, index) => (
            <div
              key={day.toISOString()}
              className={cn(
                "p-3 text-sm font-medium text-center border-r border-border transition-colors",
                isToday(day) && "bg-primary text-primary-foreground",
                !isToday(day) && "bg-muted/30 hover:bg-muted/50"
              )}
            >
              <div className="text-xs opacity-75">{format(day, 'EEE')}</div>
              <div className={cn(
                "text-lg font-semibold",
                isToday(day) && "bg-white/20 rounded-full w-8 h-8 flex items-center justify-center mx-auto mt-1"
              )}>
                {format(day, 'd')}
              </div>
            </div>
          ))}

          {/* Time slots */}
          {timeSlots.map(hour => (
            <React.Fragment key={hour}>
              {/* Time label */}
              <div className="relative border-t border-border bg-muted/20">
                <div className="absolute -top-2 left-2 bg-background px-1 text-xs text-muted-foreground">
                  {format(new Date().setHours(hour, 0), 'h a')}
                </div>
                <div className="h-16"></div>
              </div>
              
              {/* Day columns */}
              {weekDays.map((day, dayIndex) => {
                const slotEvents = getEventsForSlot(day, hour);
                
                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className={cn(
                      "relative h-16 border-t border-r border-border hover:bg-primary/5 transition-colors cursor-pointer group",
                      isToday(day) && "bg-primary/[0.02]"
                    )}
                    onClick={() => handleTimeSlotClick(day, hour)}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleEventDrop(day, hour);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    {/* Add event button on hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="w-4 h-4 text-muted-foreground" />
                    </div>

                    {/* Events */}
                    {slotEvents.map(event => {
                      const { top, height } = calculateEventPosition(event, dayIndex);
                      return renderEventCard(event, {
                        top: top - (hour - DAY_START_HOUR) * 64,
                        height
                      });
                    })}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </Card>

      {/* Add Calendar Event Dialog */}
      <AddCalendarEventDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        initialDate={selectedTimeSlot?.date}
        initialHour={selectedTimeSlot?.hour}
        onEventCreated={() => setSelectedTimeSlot(null)}
      />
    </div>
  );
}