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
import { EnhancedEventContextMenu } from './EnhancedEventContextMenu';

const DAY_START_HOUR = 0;
const DAY_END_HOUR = 24;
const HOURS_PER_DAY = DAY_END_HOUR - DAY_START_HOUR;
const HOUR_HEIGHT = 64; // Height of each hour slot in pixels

interface EnhancedWeekViewProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onEventUpdate: (event: CalendarEvent, updates: Partial<CalendarEvent>) => void;
  onTimeSlotClick: (date: Date, hour: number) => void;
  conflicts?: string[];
  onEventEdit?: (event: CalendarEvent) => void;
  onEventDelete?: (event: CalendarEvent) => Promise<boolean>;
  onEventDuplicate?: (event: CalendarEvent) => void;
  onEventReschedule?: (event: CalendarEvent) => void;
}

// Helper to calculate overlapping event positions
interface PositionedEvent {
  event: CalendarEvent;
  column: number;
  totalColumns: number;
}

function calculateEventPositions(events: CalendarEvent[]): PositionedEvent[] {
  if (events.length === 0) return [];
  
  // Sort by start time, then by end time (longer events first)
  const sortedEvents = [...events].sort((a, b) => {
    const startDiff = a.start.getTime() - b.start.getTime();
    if (startDiff !== 0) return startDiff;
    return b.end.getTime() - a.end.getTime(); // Longer events first
  });

  const positioned: PositionedEvent[] = [];
  const columns: { end: Date; events: CalendarEvent[] }[] = [];

  for (const event of sortedEvents) {
    // Find first available column
    let columnIndex = columns.findIndex(col => col.end <= event.start);
    
    if (columnIndex === -1) {
      // Need a new column
      columnIndex = columns.length;
      columns.push({ end: event.end, events: [event] });
    } else {
      // Use existing column
      columns[columnIndex].end = event.end;
      columns[columnIndex].events.push(event);
    }

    positioned.push({
      event,
      column: columnIndex,
      totalColumns: 0 // Will be updated after all events are placed
    });
  }

  // Update totalColumns for all events
  const totalCols = columns.length;
  return positioned.map(p => ({ ...p, totalColumns: totalCols }));
}

export function EnhancedWeekView({
  selectedDate,
  onDateChange,
  events,
  onEventClick,
  onEventUpdate,
  onTimeSlotClick,
  conflicts = [],
  onEventEdit,
  onEventDelete,
  onEventDuplicate,
  onEventReschedule
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

  // Pre-calculate events for each day with positions for overlapping events
  const eventsByDay = useMemo(() => {
    const dayEvents = new Map<string, PositionedEvent[]>();
    
    for (const day of weekDays) {
      const dayKey = format(day, 'yyyy-MM-dd');
      const dayEvts = events.filter(event => isSameDay(event.start, day));
      dayEvents.set(dayKey, calculateEventPositions(dayEvts));
    }
    
    return dayEvents;
  }, [events, weekDays]);

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

  const handleTimeSlotClick = useCallback((day: Date, hour: number, e: React.MouseEvent) => {
    // Only open add dialog if clicking on empty space, not on an event
    const target = e.target as HTMLElement;
    if (target.closest('[data-event-card]')) {
      return; // Don't open dialog if clicking on an event
    }
    
    setSelectedTimeSlot({ date: day, hour });
    setShowAddDialog(true);
    onTimeSlotClick(day, hour);
  }, [onTimeSlotClick]);

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

  const renderEventCard = (positionedEvent: PositionedEvent, dayIndex: number) => {
    const { event, column, totalColumns } = positionedEvent;
    const hasConflict = conflicts.includes(event.id);
    const isAllDay = event.end.getTime() - event.start.getTime() >= 24 * 60 * 60 * 1000;
    // Check if event was created by Ada AI (stored in rotation_group field)
    const isAdaCreated = (event.data as any)?.rotation_group === 'ada-ai';

    // Calculate position
    const startHour = event.start.getHours();
    const startMinute = event.start.getMinutes();
    const endHour = event.end.getHours();
    const endMinute = event.end.getMinutes();

    const startSlot = startHour - DAY_START_HOUR + (startMinute / 60);
    const duration = (endHour - startHour) + ((endMinute - startMinute) / 60);
    
    const top = startSlot * HOUR_HEIGHT + 2;
    const height = Math.max(duration * HOUR_HEIGHT - 4, 32);

    // Calculate width and left position for overlapping events
    const width = totalColumns > 1 ? `calc(${100 / totalColumns}% - 4px)` : 'calc(100% - 8px)';
    const left = totalColumns > 1 ? `calc(${(column * 100) / totalColumns}% + 2px)` : '4px';

    const eventCard = (
      <div
        key={event.id}
        data-event-card="true"
        className={cn(
          "absolute rounded-md px-2 py-1 text-xs cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md hover:z-20",
          "border-l-4 bg-gradient-to-r from-white/90 to-white/70 dark:from-card/90 dark:to-card/70",
          hasConflict && "ring-2 ring-destructive animate-pulse",
          isAllDay && "bg-gradient-to-r from-primary/20 to-primary/10"
        )}
        style={{
          top: `${top}px`,
          height: `${height}px`,
          width,
          left,
          borderLeftColor: `hsl(var(--${event.color || 'primary'}))`,
          zIndex: 10 + column,
        }}
        onClick={(e) => {
          e.stopPropagation(); // Prevent time slot click
          onEventClick(event);
        }}
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
        {event.location && height > 50 && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span className="text-[10px] truncate">{event.location}</span>
          </div>
        )}
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
                const dayKey = format(day, 'yyyy-MM-dd');
                const dayPositionedEvents = eventsByDay.get(dayKey) || [];
                // Get events that START in this hour slot
                const hourEvents = dayPositionedEvents.filter(pe => {
                  const startHour = pe.event.start.getHours();
                  return startHour === hour;
                });
                
                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className={cn(
                      "relative h-16 border-t border-r border-border hover:bg-primary/5 transition-colors cursor-pointer group",
                      isToday(day) && "bg-primary/[0.02]"
                    )}
                    onClick={(e) => handleTimeSlotClick(day, hour, e)}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleEventDrop(day, hour);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    {/* Add event button on hover - only show if no events in this slot */}
                    {hourEvents.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <Plus className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}

                    {/* Events - rendered at the first hour slot they appear in */}
                    {hourEvents.map(positionedEvent => renderEventCard(positionedEvent, dayIndex))}
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