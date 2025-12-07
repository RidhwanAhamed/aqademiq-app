import React, { useState, useMemo, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachWeekOfInterval, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday, isSameDay, addMonths, subMonths } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarEvent } from '@/hooks/useRealtimeCalendar';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AddCalendarEventDialog } from './AddCalendarEventDialog';

interface MobileMonthViewProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDayClick: (date: Date) => void;
  conflicts?: string[];
}

export function MobileMonthView({
  selectedDate,
  onDateChange,
  events,
  onEventClick,
  onDayClick,
  conflicts = []
}: MobileMonthViewProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedDayForEvent, setSelectedDayForEvent] = useState<Date | null>(null);
  const [showDaySheet, setShowDaySheet] = useState(false);
  const [sheetDay, setSheetDay] = useState<Date | null>(null);

  const currentMonth = useMemo(() => selectedDate, [selectedDate]);
  const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth]);
  const monthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonth]);
  
  const weeks = useMemo(() => 
    eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 }),
    [monthStart, monthEnd]
  );

  const handlePrevMonth = () => onDateChange(subMonths(currentMonth, 1));
  const handleNextMonth = () => onDateChange(addMonths(currentMonth, 1));
  const handleToday = () => onDateChange(new Date());

  const getEventsForDay = useCallback((day: Date) => {
    return events.filter(event => isSameDay(event.start, day));
  }, [events]);

  const handleDayTap = useCallback((day: Date) => {
    const dayEvents = getEventsForDay(day);
    if (dayEvents.length > 0) {
      setSheetDay(day);
      setShowDaySheet(true);
    } else {
      setSelectedDayForEvent(day);
      setShowAddDialog(true);
    }
    onDayClick(day);
  }, [getEventsForDay, onDayClick]);

  const handleAddEventFromSheet = useCallback(() => {
    if (sheetDay) {
      setSelectedDayForEvent(sheetDay);
      setShowDaySheet(false);
      setShowAddDialog(true);
    }
  }, [sheetDay]);

  const sheetDayEvents = sheetDay ? getEventsForDay(sheetDay) : [];

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[140px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={handleToday} className="h-8">
          Today
        </Button>
      </div>

      {/* Compact Month Grid */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-7">
          {/* Day headers */}
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
            <div key={i} className="p-2 text-[10px] font-medium text-center text-muted-foreground bg-muted/30">
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
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday_ = isToday(day);
              const hasEvents = dayEvents.length > 0;
              const hasConflict = dayEvents.some(e => conflicts.includes(e.id));

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDayTap(day)}
                  className={cn(
                    "relative aspect-square p-1 flex flex-col items-center justify-start border-r border-b border-border/50 transition-colors min-h-[44px]",
                    !isCurrentMonth && "opacity-40",
                    isToday_ && "bg-primary/10",
                    hasEvents && "bg-muted/20"
                  )}
                >
                  {/* Day number */}
                  <span className={cn(
                    "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                    isToday_ && "bg-primary text-primary-foreground",
                  )}>
                    {format(day, 'd')}
                  </span>

                  {/* Event dots */}
                  {hasEvents && (
                    <div className="flex items-center gap-0.5 mt-0.5 flex-wrap justify-center max-w-full">
                      {dayEvents.slice(0, 3).map((event, i) => (
                        <div
                          key={event.id}
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            hasConflict && conflicts.includes(event.id) && "animate-pulse"
                          )}
                          style={{
                            backgroundColor: `hsl(var(--${event.color || 'primary'}))`
                          }}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[8px] text-muted-foreground">+{dayEvents.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            });
          })}
        </div>
      </Card>

      {/* Floating Add Button */}
      <Button
        size="lg"
        className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg bg-gradient-primary z-40"
        onClick={() => {
          setSelectedDayForEvent(new Date());
          setShowAddDialog(true);
        }}
      >
        <Plus className="w-6 h-6" />
      </Button>

      {/* Day Agenda Bottom Sheet */}
      <Sheet open={showDaySheet} onOpenChange={setShowDaySheet}>
        <SheetContent side="bottom" className="h-[60vh] rounded-t-2xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-left">
              {sheetDay && format(sheetDay, 'EEEE, MMMM d')}
            </SheetTitle>
          </SheetHeader>
          
          <div className="space-y-3 overflow-y-auto max-h-[calc(60vh-120px)]">
            {sheetDayEvents.map(event => (
              <div
                key={event.id}
                className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                onClick={() => {
                  setShowDaySheet(false);
                  onEventClick(event);
                }}
                style={{
                  borderLeftWidth: '4px',
                  borderLeftColor: `hsl(var(--${event.color || 'primary'}))`
                }}
              >
                <h4 className="font-semibold text-foreground">{event.title}</h4>
                <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">
                    {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
                  </span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{event.location}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="pt-4">
            <Button className="w-full" onClick={handleAddEventFromSheet}>
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AddCalendarEventDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        initialDate={selectedDayForEvent || undefined}
        onEventCreated={() => setSelectedDayForEvent(null)}
      />
    </div>
  );
}
