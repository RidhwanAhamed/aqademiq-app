import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { CalendarEvent } from '@/hooks/useRealtimeCalendar';

interface MonthViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export function MonthView({ events, currentDate, onDateChange, onEventClick }: MonthViewProps) {
  const [viewDate, setViewDate] = useState(currentDate);
  
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDay = (date: Date) => {
    return events.filter(event => isSameDay(event.start, date));
  };

  const handlePrevMonth = () => setViewDate(prev => subMonths(prev, 1));
  const handleNextMonth = () => setViewDate(prev => addMonths(prev, 1));

  return (
    <Card className="p-6">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">
            {format(viewDate, 'MMMM yyyy')}
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day Headers */}
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        
        {/* Calendar Days */}
        {daysInMonth.map(date => {
          const dayEvents = getEventsForDay(date);
          const isToday = isSameDay(date, new Date());
          const isSelected = isSameDay(date, currentDate);
          
          return (
            <div
              key={date.toISOString()}
              onClick={() => onDateChange(date)}
              className={`
                min-h-[100px] p-2 border border-border rounded-lg cursor-pointer
                hover:bg-accent transition-colors
                ${isToday ? 'bg-primary/5 border-primary' : ''}
                ${isSelected ? 'bg-primary/10 border-primary' : ''}
              `}
            >
              <div className={`text-sm font-medium mb-1 ${
                isToday ? 'text-primary' : 'text-foreground'
              }`}>
                {format(date, 'd')}
              </div>
              
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => (
                  <Badge
                    key={event.id}
                    variant="secondary"
                    className="text-xs p-1 cursor-pointer hover:opacity-80 block truncate"
                    style={{ 
                      backgroundColor: `hsl(var(--${event.color}))`,
                      color: 'white'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                  >
                    {event.title}
                  </Badge>
                ))}
                
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}