import React, { useState, useCallback, useMemo } from 'react';
import { format, addDays, subDays, isSameDay, isToday } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarEvent } from '@/hooks/useRealtimeCalendar';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Clock, MapPin, Plus } from 'lucide-react';
import { AddCalendarEventDialog } from './AddCalendarEventDialog';

const DAY_START_HOUR = 6;
const DAY_END_HOUR = 22;
const HOURS_PER_DAY = DAY_END_HOUR - DAY_START_HOUR;
const HOUR_HEIGHT = 72; // Height of each hour slot in pixels

interface MobileWeekViewProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onEventUpdate: (event: CalendarEvent, updates: Partial<CalendarEvent>) => void;
  onTimeSlotClick: (date: Date, hour: number) => void;
  conflicts?: string[];
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
    return b.end.getTime() - a.end.getTime();
  });

  const positioned: PositionedEvent[] = [];
  const columns: { end: Date; events: CalendarEvent[] }[] = [];

  for (const event of sortedEvents) {
    let columnIndex = columns.findIndex(col => col.end <= event.start);
    
    if (columnIndex === -1) {
      columnIndex = columns.length;
      columns.push({ end: event.end, events: [event] });
    } else {
      columns[columnIndex].end = event.end;
      columns[columnIndex].events.push(event);
    }

    positioned.push({
      event,
      column: columnIndex,
      totalColumns: 0
    });
  }

  const totalCols = columns.length;
  return positioned.map(p => ({ ...p, totalColumns: totalCols }));
}

export function MobileWeekView({
  selectedDate,
  onDateChange,
  events,
  onEventClick,
  onEventUpdate,
  onTimeSlotClick,
  conflicts = []
}: MobileWeekViewProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ date: Date; hour: number } | null>(null);

  const timeSlots = useMemo(() => 
    Array.from({ length: HOURS_PER_DAY }, (_, i) => i + DAY_START_HOUR), 
    []
  );

  // Get 5 days centered on selected date for quick navigation
  const dayNavigation = useMemo(() => {
    const days = [];
    for (let i = -2; i <= 2; i++) {
      days.push(addDays(selectedDate, i));
    }
    return days;
  }, [selectedDate]);

  const handlePrevDay = () => onDateChange(subDays(selectedDate, 1));
  const handleNextDay = () => onDateChange(addDays(selectedDate, 1));
  const handleToday = () => onDateChange(new Date());

  const handleTimeSlotClick = useCallback((hour: number, e: React.MouseEvent) => {
    // Don't open dialog if clicking on an event
    const target = e.target as HTMLElement;
    if (target.closest('[data-event-card]')) {
      return;
    }
    
    setSelectedTimeSlot({ date: selectedDate, hour });
    setShowAddDialog(true);
    onTimeSlotClick(selectedDate, hour);
  }, [selectedDate, onTimeSlotClick]);

  const dayEvents = useMemo(() => 
    events.filter(event => isSameDay(event.start, selectedDate)),
    [events, selectedDate]
  );

  // Calculate positions for all day events
  const positionedEvents = useMemo(() => 
    calculateEventPositions(dayEvents),
    [dayEvents]
  );

  const getEventsForHour = useCallback((hour: number) => {
    return positionedEvents.filter(pe => {
      const eventHour = pe.event.start.getHours();
      return eventHour === hour;
    });
  }, [positionedEvents]);

  const renderEventCard = (positionedEvent: PositionedEvent) => {
    const { event, column, totalColumns } = positionedEvent;
    const hasConflict = conflicts.includes(event.id);
    const isAdaCreated = (event.data as any)?.rotation_group === 'ada-ai';
    
    // Calculate vertical positioning
    const startHour = event.start.getHours();
    const startMinute = event.start.getMinutes();
    const durationHours = (event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60);
    
    const top = (startHour - DAY_START_HOUR) * HOUR_HEIGHT + (startMinute / 60) * HOUR_HEIGHT;
    const height = Math.max(durationHours * HOUR_HEIGHT - 4, 48);

    // Calculate horizontal positioning for overlapping events
    const leftOffset = 56; // Space for time label
    const rightPadding = 8;
    const availableWidth = `calc(100% - ${leftOffset}px - ${rightPadding}px)`;
    
    const width = totalColumns > 1 
      ? `calc((100% - ${leftOffset}px - ${rightPadding}px) / ${totalColumns} - 4px)`
      : `calc(100% - ${leftOffset}px - ${rightPadding}px)`;
    
    const left = totalColumns > 1 
      ? `calc(${leftOffset}px + (100% - ${leftOffset}px - ${rightPadding}px) * ${column} / ${totalColumns} + 2px)`
      : `${leftOffset}px`;

    return (
      <div
        key={event.id}
        data-event-card="true"
        className={cn(
          "absolute rounded-lg px-3 py-2 shadow-sm border-l-4 z-10 overflow-hidden",
          "bg-gradient-to-r from-card to-card/90",
          hasConflict && "ring-2 ring-destructive animate-pulse"
        )}
        style={{
          borderLeftColor: `hsl(var(--${event.color || 'primary'}))`,
          top: `${top}px`,
          height: `${height}px`,
          width,
          left,
          zIndex: 10 + column,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onEventClick(event);
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm text-foreground truncate">{event.title}</span>
              {isAdaCreated && (
                <span className="flex-shrink-0 px-1 py-0.5 text-[9px] font-semibold bg-primary/10 text-primary rounded">
                  Ada
                </span>
              )}
            </div>
            {height > 48 && (
              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                <Clock className="w-3 h-3" />
                <span className="text-xs">
                  {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
                </span>
              </div>
            )}
            {event.location && height > 72 && (
              <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                <MapPin className="w-3 h-3" />
                <span className="text-xs truncate">{event.location}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Compact Header with Day Navigation */}
      <div className="space-y-3">
        {/* Month/Year + Today Button */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {format(selectedDate, 'MMMM yyyy')}
          </h2>
          <Button variant="outline" size="sm" onClick={handleToday} className="h-8">
            Today
          </Button>
        </div>

        {/* Day Navigation Strip */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handlePrevDay} className="h-9 w-9">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex-1 flex justify-between gap-1">
            {dayNavigation.map((day) => (
              <button
                key={day.toISOString()}
                onClick={() => onDateChange(day)}
                className={cn(
                  "flex-1 flex flex-col items-center py-2 px-1 rounded-lg transition-colors min-w-[48px]",
                  isSameDay(day, selectedDate) && "bg-primary text-primary-foreground",
                  !isSameDay(day, selectedDate) && isToday(day) && "bg-primary/10",
                  !isSameDay(day, selectedDate) && !isToday(day) && "hover:bg-muted"
                )}
              >
                <span className="text-[10px] font-medium opacity-75">{format(day, 'EEE')}</span>
                <span className="text-sm font-semibold">{format(day, 'd')}</span>
              </button>
            ))}
          </div>
          
          <Button variant="ghost" size="icon" onClick={handleNextDay} className="h-9 w-9">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Day View - Single Column Timeline */}
      <Card className="overflow-hidden">
        <div className="relative" style={{ height: `${HOURS_PER_DAY * HOUR_HEIGHT}px` }}>
          {/* Time slots background */}
          {timeSlots.map((hour, index) => (
            <div
              key={hour}
              className="absolute left-0 right-0 border-b border-border hover:bg-primary/5 transition-colors cursor-pointer"
              style={{ 
                top: `${index * HOUR_HEIGHT}px`, 
                height: `${HOUR_HEIGHT}px` 
              }}
              onClick={(e) => handleTimeSlotClick(hour, e)}
            >
              {/* Time label */}
              <div className="absolute left-2 top-1 text-xs text-muted-foreground font-medium w-12">
                {format(new Date().setHours(hour, 0), 'h a')}
              </div>
              
              {/* Hour line */}
              <div className="absolute left-14 right-0 top-0 border-t border-border/50" />
            </div>
          ))}

          {/* Events layer - rendered above time slots */}
          {positionedEvents.map(pe => renderEventCard(pe))}
        </div>
      </Card>

      {/* Floating Add Button */}
      <Button
        size="lg"
        className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg bg-gradient-primary z-40"
        onClick={() => {
          setSelectedTimeSlot({ date: selectedDate, hour: new Date().getHours() });
          setShowAddDialog(true);
        }}
      >
        <Plus className="w-6 h-6" />
      </Button>

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
