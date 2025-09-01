import React from 'react';
import { CalendarEvent } from '@/hooks/useRealtimeCalendar';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { formatInUserTimezone } from '@/utils/timezone';

interface AccessibleCalendarViewProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  events: CalendarEvent[];
  onEventSelect?: (event: CalendarEvent) => void;
  onEventEdit?: (event: CalendarEvent) => void;
  onEventDelete?: (event: CalendarEvent) => void;
  children: (props: {
    focusedDate: Date;
    selectedEventIndex: number;
    selectedEvent: CalendarEvent | null;
    dayEvents: CalendarEvent[];
  }) => React.ReactNode;
}

export function AccessibleCalendarView({
  selectedDate,
  onDateChange,
  events,
  onEventSelect,
  onEventEdit,
  onEventDelete,
  children
}: AccessibleCalendarViewProps) {
  const {
    focusedDate,
    selectedEventIndex,
    selectedEvent,
    dayEvents,
    announcementText
  } = useKeyboardNavigation({
    selectedDate,
    onDateChange,
    events,
    onEventSelect,
    onEventEdit,
    onEventDelete,
    isEnabled: true
  });

  return (
    <div 
      role="application" 
      aria-label="Academic Calendar" 
      aria-describedby="calendar-instructions"
    >
      {/* Screen reader instructions */}
      <div 
        id="calendar-instructions" 
        className="sr-only"
        aria-live="polite"
      >
        Use arrow keys to navigate dates and events. 
        Press Enter to edit selected event. 
        Press Delete to remove selected event. 
        Press Ctrl+I for event information. 
        Press Ctrl+? for help.
      </div>

      {/* Live region for announcements */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      >
        {announcementText}
      </div>

      {/* Calendar content */}
      <div role="grid" aria-label="Calendar grid">
        {children({
          focusedDate,
          selectedEventIndex,
          selectedEvent,
          dayEvents
        })}
      </div>

      {/* Additional accessibility info */}
      <div className="sr-only" aria-live="polite">
        Currently viewing {formatInUserTimezone(focusedDate, 'EEEE, MMMM d, yyyy')}
        {dayEvents.length > 0 && (
          <span>
            . {dayEvents.length} event{dayEvents.length > 1 ? 's' : ''} scheduled.
            {selectedEvent && (
              <span> Selected: {selectedEvent.title} at {formatInUserTimezone(selectedEvent.start, 'h:mm a')}</span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

// Accessible event card component
interface AccessibleEventCardProps {
  event: CalendarEvent;
  isSelected?: boolean;
  isFocused?: boolean;
  onClick?: (event: CalendarEvent) => void;
  onKeyDown?: (event: React.KeyboardEvent, calendarEvent: CalendarEvent) => void;
  children?: React.ReactNode;
}

export function AccessibleEventCard({
  event,
  isSelected = false,
  isFocused = false,
  onClick,
  onKeyDown,
  children
}: AccessibleEventCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(event);
    }
    onKeyDown?.(e, event);
  };

  const getEventTypeDescription = () => {
    switch (event.type) {
      case 'schedule':
        return 'Class';
      case 'exam':
        return 'Exam';
      case 'assignment':
        return 'Assignment';
      default:
        return 'Event';
    }
  };

  const getAriaLabel = () => {
    const type = getEventTypeDescription();
    const date = formatInUserTimezone(event.start, 'EEEE, MMM d');
    const startTime = formatInUserTimezone(event.start, 'h:mm a');
    const endTime = formatInUserTimezone(event.end, 'h:mm a');
    const duration = Math.round((event.end.getTime() - event.start.getTime()) / (1000 * 60));
    
    let label = `${type}: ${event.title}. ${date} from ${startTime} to ${endTime}, ${duration} minutes`;
    
    if (event.location) {
      label += `. Location: ${event.location}`;
    }
    
    return label;
  };

  return (
    <div
      role="gridcell"
      tabIndex={isFocused ? 0 : -1}
      aria-selected={isSelected}
      aria-label={getAriaLabel()}
      data-event-id={event.id}
      onClick={() => onClick?.(event)}
      onKeyDown={handleKeyDown}
      className={`
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 
        ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
        ${isFocused ? 'z-10' : ''}
      `}
    >
      {children}
    </div>
  );
}

// Accessible time slot component
interface AccessibleTimeSlotProps {
  date: Date;
  hour: number;
  events: CalendarEvent[];
  onClick?: (date: Date, hour: number) => void;
  onKeyDown?: (e: React.KeyboardEvent, date: Date, hour: number) => void;
  children?: React.ReactNode;
  isToday?: boolean;
}

export function AccessibleTimeSlot({
  date,
  hour,
  events,
  onClick,
  onKeyDown,
  children,
  isToday = false
}: AccessibleTimeSlotProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(date, hour);
    }
    onKeyDown?.(e, date, hour);
  };

  const getAriaLabel = () => {
    const dayName = formatInUserTimezone(date, 'EEEE');
    const dateStr = formatInUserTimezone(date, 'MMM d');
    const timeDate = new Date();
    timeDate.setHours(hour, 0, 0, 0);
    const timeStr = timeDate.toLocaleTimeString([], { 
      hour: 'numeric', 
      hour12: true 
    });
    
    let label = `${dayName} ${dateStr} at ${timeStr}`;
    
    if (isToday) {
      label += ' (today)';
    }
    
    if (events.length > 0) {
      label += `. ${events.length} event${events.length > 1 ? 's' : ''}: ${events.map(e => e.title).join(', ')}`;
    } else {
      label += '. No events. Press Enter to add event.';
    }
    
    return label;
  };

  return (
    <div
      role="gridcell"
      tabIndex={0}
      aria-label={getAriaLabel()}
      data-day-index={date.getDay()}
      data-hour={hour}
      onClick={() => onClick?.(date, hour)}
      onKeyDown={handleKeyDown}
      className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
    >
      {children}
    </div>
  );
}