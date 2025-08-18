import React, { useState, useMemo, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachWeekOfInterval, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday, isSameDay, addMonths, subMonths } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarEvent } from '@/hooks/useRealtimeCalendar';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, MapPin } from 'lucide-react';
import { AddClassDialog } from './AddClassDialog';

interface EnhancedMonthViewProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDayClick: (date: Date) => void;
  conflicts?: string[];
}

export function EnhancedMonthView({
  selectedDate,
  onDateChange,
  events,
  onEventClick,
  onDayClick,
  conflicts = []
}: EnhancedMonthViewProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedDayForEvent, setSelectedDayForEvent] = useState<Date | null>(null);

  const currentMonth = useMemo(() => selectedDate, [selectedDate]);

  const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth]);
  const monthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonth]);
  
  const weeks = useMemo(() => 
    eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 }),
    [monthStart, monthEnd]
  );

  const handlePrevMonth = () => {
    const newMonth = subMonths(currentMonth, 1);
    onDateChange(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = addMonths(currentMonth, 1);
    onDateChange(newMonth);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const getEventsForDay = useCallback((day: Date) => {
    return events.filter(event => isSameDay(event.start, day));
  }, [events]);

  const handleDayClick = useCallback((day: Date) => {
    onDayClick(day);
    setSelectedDayForEvent(day);
    setShowAddDialog(true);
  }, [onDayClick]);

  const renderEventIndicator = (event: CalendarEvent) => {
    const hasConflict = conflicts.includes(event.id);
    const isAllDay = event.end.getTime() - event.start.getTime() >= 24 * 60 * 60 * 1000;

    return (
      <div
        key={event.id}
        className={cn(
          "text-xs p-1 rounded-sm border-l-2 cursor-pointer transition-all duration-200 hover:shadow-sm mb-1",
          "bg-gradient-to-r from-white/80 to-white/60 dark:from-card/80 dark:to-card/60",
          hasConflict && "ring-1 ring-destructive",
          isAllDay && "bg-gradient-to-r from-primary/20 to-primary/10"
        )}
        style={{
          borderLeftColor: `hsl(var(--${event.color || 'primary'}))`,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onEventClick(event);
        }}
        title={`${event.title} - ${format(event.start, 'HH:mm')} to ${format(event.end, 'HH:mm')}`}
      >
        <div className="font-medium text-foreground truncate leading-none">
          {event.type === 'exam' && '📝 '}
          {event.type === 'assignment' && '📋 '}
          {event.type === 'schedule' && '🎓 '}
          {event.title}
        </div>
        {!isAllDay && (
          <div className="text-[10px] text-muted-foreground leading-none mt-0.5">
            {format(event.start, 'HH:mm')}
          </div>
        )}
      </div>
    );
  };

  const renderDayAgenda = (day: Date, dayEvents: CalendarEvent[]) => (
    <PopoverContent className="w-80 p-0" align="start">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">{format(day, 'EEEE, MMMM d')}</h3>
        </div>
      </div>
      <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
        {dayEvents.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No events scheduled</p>
          </div>
        ) : (
          dayEvents.map(event => (
            <div
              key={event.id}
              className="p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onEventClick(event)}
              style={{
                borderLeftColor: `hsl(var(--${event.color || 'primary'}))`,
                borderLeftWidth: '4px'
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-foreground truncate">{event.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                    </span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground truncate">{event.location}</span>
                    </div>
                  )}
                </div>
                <Badge 
                  variant="secondary" 
                  className="text-[10px] px-1.5 py-0.5"
                  style={{ backgroundColor: `hsl(var(--${event.color || 'primary'})/0.1)` }}
                >
                  {event.type}
                </Badge>
              </div>
            </div>
          ))
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => handleDayClick(day)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Event
        </Button>
      </div>
    </PopoverContent>
  );

  return (
    <div className="space-y-4">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Month view grid */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 bg-gradient-card">
          {/* Day headers */}
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="p-3 text-sm font-medium text-center border-r border-b border-border bg-muted/30">
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

              return (
                <Popover key={day.toISOString()}>
                  <PopoverTrigger asChild>
                    <div
                      className={cn(
                        "min-h-[120px] p-2 border-r border-b border-border cursor-pointer transition-all duration-200 hover:bg-muted/30 group",
                        !isCurrentMonth && "opacity-50 bg-muted/10",
                        isToday_ && "bg-primary/5 ring-1 ring-primary/20",
                        hasEvents && "bg-gradient-to-br from-white to-muted/20 dark:from-card dark:to-muted/10"
                      )}
                      onClick={() => handleDayClick(day)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn(
                          "text-sm font-medium",
                          isToday_ && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs",
                          !isToday_ && isCurrentMonth && "text-foreground",
                          !isCurrentMonth && "text-muted-foreground"
                        )}>
                          {format(day, 'd')}
                        </span>
                        
                        {/* Add event button on hover */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="w-3 h-3 text-muted-foreground hover:text-primary" />
                        </div>
                      </div>
                      
                      {/* Events */}
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map(event => renderEventIndicator(event))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-muted-foreground text-center py-1 bg-muted/50 rounded">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  </PopoverTrigger>
                  {hasEvents && renderDayAgenda(day, dayEvents)}
                </Popover>
              );
            });
          })}
        </div>
      </Card>

      {/* Add Class Dialog */}
      {showAddDialog && (
        <AddClassDialog>
          <div />
        </AddClassDialog>
      )}
    </div>
  );
}