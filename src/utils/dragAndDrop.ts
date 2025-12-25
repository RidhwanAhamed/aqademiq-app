import { CalendarEvent } from '@/hooks/useRealtimeCalendar';
import { isWithinInterval, startOfDay, endOfDay, addMinutes } from 'date-fns';
import { toUserTimezone, fromUserTimezone } from './timezone';

export interface DragState {
  isDragging: boolean;
  draggedEvent: CalendarEvent | null;
  originalPosition: { x: number; y: number } | null;
  currentPosition: { x: number; y: number } | null;
  isValidDrop: boolean;
  targetSlot: { date: Date; hour: number; minute?: number } | null;
}

export interface DragValidationResult {
  isValid: boolean;
  reason?: string;
  suggestedSlot?: { date: Date; hour: number; minute?: number };
}

export interface DragBoundaries {
  earliestHour: number;
  latestHour: number;
  allowWeekends: boolean;
  allowPastDates: boolean;
  minDuration: number; // in minutes
  maxDuration: number; // in minutes
}

const DEFAULT_BOUNDARIES: DragBoundaries = {
  earliestHour: 6,
  latestHour: 22,
  allowWeekends: true,
  allowPastDates: false,
  minDuration: 15,
  maxDuration: 8 * 60, // 8 hours
};

/**
 * Validate if an event can be dropped at a specific time slot
 */
export function validateEventDrop(
  event: CalendarEvent,
  targetDate: Date,
  targetHour: number,
  targetMinute: number = 0,
  existingEvents: CalendarEvent[] = [],
  boundaries: Partial<DragBoundaries> = {}
): DragValidationResult {
  const bounds = { ...DEFAULT_BOUNDARIES, ...boundaries };
  
  // Create target start time
  const targetStart = new Date(targetDate);
  targetStart.setHours(targetHour, targetMinute, 0, 0);
  
  // Calculate event duration and end time
  const duration = event.end.getTime() - event.start.getTime();
  const targetEnd = new Date(targetStart.getTime() + duration);
  
  // Check if target is in the past
  if (!bounds.allowPastDates && targetStart < new Date()) {
    return {
      isValid: false,
      reason: 'Cannot schedule events in the past',
      suggestedSlot: findNextAvailableSlot(targetStart, duration, existingEvents, bounds)
    };
  }
  
  // Check if within allowed hours
  const startHour = targetStart.getHours();
  const endHour = targetEnd.getHours();
  const endMinutes = targetEnd.getMinutes();
  
  if (startHour < bounds.earliestHour || startHour >= bounds.latestHour) {
    return {
      isValid: false,
      reason: `Events must be between ${bounds.earliestHour}:00 and ${bounds.latestHour}:00`,
      suggestedSlot: findNextAvailableSlot(targetStart, duration, existingEvents, bounds)
    };
  }
  
  if (endHour > bounds.latestHour || (endHour === bounds.latestHour && endMinutes > 0)) {
    return {
      isValid: false,
      reason: `Event would extend beyond ${bounds.latestHour}:00`,
      suggestedSlot: findNextAvailableSlot(targetStart, duration, existingEvents, bounds)
    };
  }
  
  // Check weekend restrictions
  if (!bounds.allowWeekends && (targetDate.getDay() === 0 || targetDate.getDay() === 6)) {
    return {
      isValid: false,
      reason: 'Weekend scheduling is not allowed',
      suggestedSlot: findNextWeekdaySlot(targetStart, duration, existingEvents, bounds)
    };
  }
  
  // Check duration limits
  if (duration < bounds.minDuration * 60 * 1000) {
    return {
      isValid: false,
      reason: `Event duration must be at least ${bounds.minDuration} minutes`
    };
  }
  
  if (duration > bounds.maxDuration * 60 * 1000) {
    return {
      isValid: false,
      reason: `Event duration cannot exceed ${bounds.maxDuration / 60} hours`
    };
  }
  
  // Check for conflicts with existing events
  const conflicts = findConflictingEvents(targetStart, targetEnd, existingEvents, event.id);
  if (conflicts.length > 0) {
    return {
      isValid: false,
      reason: `Conflicts with: ${conflicts.map(e => e.title).join(', ')}`,
      suggestedSlot: findNextAvailableSlot(targetStart, duration, existingEvents, bounds)
    };
  }
  
  return { isValid: true };
}

/**
 * Find events that conflict with a given time slot
 */
export function findConflictingEvents(
  startTime: Date,
  endTime: Date,
  events: CalendarEvent[],
  excludeEventId?: string
): CalendarEvent[] {
  return events.filter(event => {
    if (excludeEventId && event.id === excludeEventId) return false;
    
    // Check if events overlap
    return (
      (startTime < event.end && endTime > event.start) ||
      (event.start < endTime && event.end > startTime)
    );
  });
}

/**
 * Find the next available time slot for an event
 */
export function findNextAvailableSlot(
  preferredStart: Date,
  duration: number,
  existingEvents: CalendarEvent[],
  boundaries: DragBoundaries,
  maxSearchDays: number = 14
): { date: Date; hour: number; minute?: number } | undefined {
  const searchStart = new Date(preferredStart);
  const maxSearch = new Date(searchStart.getTime() + maxSearchDays * 24 * 60 * 60 * 1000);
  
  for (let current = new Date(searchStart); current <= maxSearch; current.setDate(current.getDate() + 1)) {
    // Skip weekends if not allowed
    if (!boundaries.allowWeekends && (current.getDay() === 0 || current.getDay() === 6)) {
      continue;
    }
    
    // Try each hour within the allowed range
    for (let hour = boundaries.earliestHour; hour < boundaries.latestHour; hour++) {
      const slotStart = new Date(current);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + duration);
      
      // Check if slot end is within bounds
      if (slotEnd.getHours() > boundaries.latestHour) continue;
      
      // Check for conflicts
      const conflicts = findConflictingEvents(slotStart, slotEnd, existingEvents);
      if (conflicts.length === 0) {
        return { date: current, hour, minute: 0 };
      }
    }
  }
  
  return undefined;
}

/**
 * Find the next available weekday slot
 */
export function findNextWeekdaySlot(
  preferredStart: Date,
  duration: number,
  existingEvents: CalendarEvent[],
  boundaries: DragBoundaries
): { date: Date; hour: number; minute?: number } | undefined {
  let current = new Date(preferredStart);
  
  // Move to next weekday if currently on weekend
  while (current.getDay() === 0 || current.getDay() === 6) {
    current.setDate(current.getDate() + 1);
  }
  
  return findNextAvailableSlot(current, duration, existingEvents, boundaries);
}

/**
 * Calculate snap-to-grid position for drag operations
 */
export function snapToGrid(
  x: number,
  y: number,
  gridSize: { width: number; height: number } = { width: 15, height: 15 }
): { x: number; y: number } {
  return {
    x: Math.round(x / gridSize.width) * gridSize.width,
    y: Math.round(y / gridSize.height) * gridSize.height
  };
}

/**
 * Calculate time slot from position
 */
export function calculateTimeSlotFromPosition(
  x: number,
  y: number,
  containerRect: DOMRect,
  timeSlotHeight: number,
  dayWidth: number,
  startHour: number = 6
): { dayIndex: number; hour: number; minute: number } | null {
  const relativeX = x - containerRect.left;
  const relativeY = y - containerRect.top;
  
  // Skip time column (first column)
  const dayIndex = Math.floor((relativeX - dayWidth) / dayWidth);
  if (dayIndex < 0 || dayIndex > 6) return null;
  
  const slotIndex = Math.floor(relativeY / timeSlotHeight);
  const hour = startHour + slotIndex;
  const minute = Math.floor(((relativeY % timeSlotHeight) / timeSlotHeight) * 60);
  
  if (hour < 0 || hour >= 24) return null;
  
  return { dayIndex, hour, minute };
}

/**
 * Get visual feedback class for drag state
 */
export function getDragFeedbackClass(validation: DragValidationResult): string {
  if (validation.isValid) {
    return 'bg-success/20 border-success ring-2 ring-success/50';
  } else {
    return 'bg-destructive/20 border-destructive ring-2 ring-destructive/50';
  }
}

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Create ghost element for drag preview
 * Uses safe DOM methods to prevent XSS
 */
export function createDragGhost(event: CalendarEvent): HTMLElement {
  const ghost = document.createElement('div');
  ghost.className = 'fixed z-50 pointer-events-none opacity-75 p-2 rounded-md border-l-4 bg-card shadow-lg transform -translate-x-1/2 -translate-y-1/2';
  ghost.style.borderLeftColor = `hsl(var(--${event.color || 'primary'}))`;
  ghost.style.minWidth = '200px';
  
  // Create title element safely using textContent
  const titleDiv = document.createElement('div');
  titleDiv.className = 'font-medium text-foreground text-sm';
  titleDiv.textContent = event.title;
  ghost.appendChild(titleDiv);
  
  // Create time element safely
  const timeDiv = document.createElement('div');
  timeDiv.className = 'text-xs text-muted-foreground flex items-center gap-1';
  const timeIcon = document.createElement('span');
  timeIcon.textContent = '⏰';
  timeDiv.appendChild(timeIcon);
  const timeText = document.createTextNode(
    ` ${event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${event.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  );
  timeDiv.appendChild(timeText);
  ghost.appendChild(timeDiv);
  
  // Create location element safely if present
  if (event.location) {
    const locationDiv = document.createElement('div');
    locationDiv.className = 'text-xs text-muted-foreground flex items-center gap-1';
    const locationIcon = document.createElement('span');
    locationIcon.textContent = '📍';
    locationDiv.appendChild(locationIcon);
    const locationText = document.createTextNode(event.location);
    locationDiv.appendChild(locationText);
    ghost.appendChild(locationDiv);
  }
  
  return ghost;
}