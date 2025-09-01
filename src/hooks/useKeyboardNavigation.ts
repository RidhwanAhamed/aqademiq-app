import { useEffect, useCallback, useState } from 'react';
import { CalendarEvent } from '@/hooks/useRealtimeCalendar';
import { addDays, subDays, addWeeks, subWeeks, format } from 'date-fns';

interface UseKeyboardNavigationProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  events: CalendarEvent[];
  onEventSelect?: (event: CalendarEvent) => void;
  onEventEdit?: (event: CalendarEvent) => void;
  onEventDelete?: (event: CalendarEvent) => void;
  isEnabled?: boolean;
}

export function useKeyboardNavigation({
  selectedDate,
  onDateChange,
  events,
  onEventSelect,
  onEventEdit,
  onEventDelete,
  isEnabled = true
}: UseKeyboardNavigationProps) {
  const [selectedEventIndex, setSelectedEventIndex] = useState<number>(-1);
  const [focusedDate, setFocusedDate] = useState<Date>(selectedDate);
  const [announcementText, setAnnouncementText] = useState<string>('');

  // Get events for the currently focused date
  const dayEvents = events.filter(event => {
    return event.start.toDateString() === focusedDate.toDateString();
  }).sort((a, b) => a.start.getTime() - b.start.getTime());

  // Screen reader announcements
  const announce = useCallback((text: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncementText(text);
    
    // Clear announcement after a delay
    setTimeout(() => setAnnouncementText(''), 1000);
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isEnabled) return;

    // Don't interfere with form inputs
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement) {
      return;
    }

    const { key, ctrlKey, shiftKey, altKey } = event;
    let handled = false;

    switch (key) {
      // Date Navigation
      case 'ArrowLeft':
        if (ctrlKey) {
          // Previous week
          const newWeek = subWeeks(focusedDate, 1);
          setFocusedDate(newWeek);
          onDateChange(newWeek);
          announce(`Week of ${format(newWeek, 'MMMM d, yyyy')}`);
        } else {
          // Previous day
          const newDay = subDays(focusedDate, 1);
          setFocusedDate(newDay);
          announce(`${format(newDay, 'EEEE, MMMM d, yyyy')}`);
        }
        setSelectedEventIndex(-1);
        handled = true;
        break;

      case 'ArrowRight':
        if (ctrlKey) {
          // Next week
          const newWeek = addWeeks(focusedDate, 1);
          setFocusedDate(newWeek);
          onDateChange(newWeek);
          announce(`Week of ${format(newWeek, 'MMMM d, yyyy')}`);
        } else {
          // Next day
          const newDay = addDays(focusedDate, 1);
          setFocusedDate(newDay);
          announce(`${format(newDay, 'EEEE, MMMM d, yyyy')}`);
        }
        setSelectedEventIndex(-1);
        handled = true;
        break;

      case 'ArrowUp':
        if (dayEvents.length > 0) {
          const newIndex = Math.max(0, selectedEventIndex - 1);
          setSelectedEventIndex(newIndex);
          const event = dayEvents[newIndex];
          announce(`Selected: ${event.title} at ${format(event.start, 'h:mm a')}`);
          onEventSelect?.(event);
        }
        handled = true;
        break;

      case 'ArrowDown':
        if (dayEvents.length > 0) {
          const newIndex = Math.min(dayEvents.length - 1, selectedEventIndex + 1);
          setSelectedEventIndex(newIndex);
          const event = dayEvents[newIndex];
          announce(`Selected: ${event.title} at ${format(event.start, 'h:mm a')}`);
          onEventSelect?.(event);
        }
        handled = true;
        break;

      // Event Actions
      case 'Enter':
      case ' ':
        if (selectedEventIndex >= 0 && dayEvents[selectedEventIndex]) {
          const event = dayEvents[selectedEventIndex];
          onEventEdit?.(event);
          announce(`Editing ${event.title}`);
        }
        handled = true;
        break;

      case 'Delete':
      case 'Backspace':
        if (selectedEventIndex >= 0 && dayEvents[selectedEventIndex]) {
          const event = dayEvents[selectedEventIndex];
          onEventDelete?.(event);
          announce(`Deleted ${event.title}`, 'assertive');
          setSelectedEventIndex(-1);
        }
        handled = true;
        break;

      // Quick Navigation
      case 'Home':
        if (ctrlKey) {
          // Go to today
          const today = new Date();
          setFocusedDate(today);
          onDateChange(today);
          announce(`Today: ${format(today, 'EEEE, MMMM d, yyyy')}`);
        } else {
          // Go to first event of the day
          if (dayEvents.length > 0) {
            setSelectedEventIndex(0);
            const event = dayEvents[0];
            announce(`First event: ${event.title} at ${format(event.start, 'h:mm a')}`);
            onEventSelect?.(event);
          }
        }
        handled = true;
        break;

      case 'End':
        if (ctrlKey) {
          // Go to end of current month
          const endOfMonth = new Date(focusedDate.getFullYear(), focusedDate.getMonth() + 1, 0);
          setFocusedDate(endOfMonth);
          announce(`End of month: ${format(endOfMonth, 'EEEE, MMMM d, yyyy')}`);
        } else {
          // Go to last event of the day
          if (dayEvents.length > 0) {
            const lastIndex = dayEvents.length - 1;
            setSelectedEventIndex(lastIndex);
            const event = dayEvents[lastIndex];
            announce(`Last event: ${event.title} at ${format(event.start, 'h:mm a')}`);
            onEventSelect?.(event);
          }
        }
        handled = true;
        break;

      // View Navigation
      case '1':
        if (altKey) {
          announce('Week view activated');
          // This would be handled by parent component
        }
        handled = true;
        break;

      case '2':
        if (altKey) {
          announce('Month view activated');
          // This would be handled by parent component
        }
        handled = true;
        break;

      case '3':
        if (altKey) {
          announce('Agenda view activated');
          // This would be handled by parent component
        }
        handled = true;
        break;

      // Event Count Announcement
      case 'i':
      case 'I':
        if (ctrlKey) {
          const eventCount = dayEvents.length;
          const dateStr = format(focusedDate, 'EEEE, MMMM d, yyyy');
          
          if (eventCount === 0) {
            announce(`${dateStr}: No events scheduled`);
          } else {
            const eventTypes = dayEvents.reduce((acc, event) => {
              acc[event.type] = (acc[event.type] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);
            
            const typeDescriptions = Object.entries(eventTypes)
              .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
              .join(', ');
            
            announce(`${dateStr}: ${eventCount} event${eventCount > 1 ? 's' : ''} - ${typeDescriptions}`);
          }
        }
        handled = true;
        break;

      // Help
      case '?':
      case '/':
        if (ctrlKey) {
          announce(`Keyboard shortcuts: 
            Arrow keys: Navigate dates and events. 
            Ctrl + arrows: Navigate weeks. 
            Enter or Space: Edit selected event. 
            Delete: Remove selected event. 
            Home: Today or first event. 
            End: Last event. 
            Ctrl + I: Event information. 
            Alt + 1,2,3: Switch views`, 'assertive');
        }
        handled = true;
        break;
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, [
    isEnabled, 
    focusedDate, 
    selectedEventIndex, 
    dayEvents, 
    onDateChange, 
    onEventSelect, 
    onEventEdit, 
    onEventDelete,
    announce
  ]);

  // Update focused date when selected date changes externally
  useEffect(() => {
    setFocusedDate(selectedDate);
    setSelectedEventIndex(-1);
  }, [selectedDate]);

  // Attach keyboard event listener
  useEffect(() => {
    if (isEnabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, isEnabled]);

  // Focus management for screen readers
  useEffect(() => {
    if (selectedEventIndex >= 0 && dayEvents[selectedEventIndex]) {
      const eventElement = document.querySelector(`[data-event-id="${dayEvents[selectedEventIndex].id}"]`);
      if (eventElement && eventElement instanceof HTMLElement) {
        eventElement.focus();
      }
    }
  }, [selectedEventIndex, dayEvents]);

  return {
    focusedDate,
    selectedEventIndex,
    announcementText,
    selectedEvent: selectedEventIndex >= 0 ? dayEvents[selectedEventIndex] : null,
    dayEvents
  };
}