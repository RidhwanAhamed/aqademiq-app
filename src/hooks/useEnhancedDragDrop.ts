import { useState, useCallback, useRef, useEffect } from 'react';
import { CalendarEvent } from '@/hooks/useRealtimeCalendar';
import { 
  DragState, 
  DragValidationResult, 
  DragBoundaries,
  validateEventDrop,
  calculateTimeSlotFromPosition,
  snapToGrid,
  createDragGhost,
  getDragFeedbackClass
} from '@/utils/dragAndDrop';
import { addDays, startOfWeek } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface UseEnhancedDragDropProps {
  events: CalendarEvent[];
  onEventUpdate: (event: CalendarEvent, updates: Partial<CalendarEvent>) => void;
  boundaries?: Partial<DragBoundaries>;
  selectedDate: Date;
  containerRef?: React.RefObject<HTMLElement>;
}

export function useEnhancedDragDrop({
  events,
  onEventUpdate,
  boundaries = {},
  selectedDate,
  containerRef
}: UseEnhancedDragDropProps) {
  const { toast } = useToast();
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedEvent: null,
    originalPosition: null,
    currentPosition: null,
    isValidDrop: false,
    targetSlot: null
  });
  
  const [dragHistory, setDragHistory] = useState<Array<{ event: CalendarEvent; from: Date; to: Date }>>([]);
  const ghostRef = useRef<HTMLElement | null>(null);
  const validationRef = useRef<DragValidationResult>({ isValid: false });

  // Create week days for position calculation
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Clean up ghost element on unmount
  useEffect(() => {
    return () => {
      if (ghostRef.current) {
        document.body.removeChild(ghostRef.current);
        ghostRef.current = null;
      }
    };
  }, []);

  const handleDragStart = useCallback((event: CalendarEvent, clientX: number, clientY: number) => {
    // Create ghost element
    const ghost = createDragGhost(event);
    document.body.appendChild(ghost);
    ghostRef.current = ghost;
    
    setDragState({
      isDragging: true,
      draggedEvent: event,
      originalPosition: { x: clientX, y: clientY },
      currentPosition: { x: clientX, y: clientY },
      isValidDrop: false,
      targetSlot: null
    });

    // Add visual feedback to original event
    const originalElement = document.querySelector(`[data-event-id="${event.id}"]`);
    if (originalElement) {
      originalElement.classList.add('opacity-50', 'scale-95');
    }

    // Prevent default drag behavior
    document.addEventListener('selectstart', preventSelection);
    document.body.style.userSelect = 'none';
  }, []);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!dragState.isDragging || !dragState.draggedEvent || !containerRef?.current) return;

    // Update ghost position
    if (ghostRef.current) {
      ghostRef.current.style.left = `${clientX}px`;
      ghostRef.current.style.top = `${clientY}px`;
    }

    // Calculate target slot
    const containerRect = containerRef.current.getBoundingClientRect();
    const timeSlot = calculateTimeSlotFromPosition(
      clientX, 
      clientY, 
      containerRect, 
      64, // timeSlotHeight
      containerRect.width / 8, // dayWidth (7 days + time column)
      6 // startHour
    );

    if (timeSlot && timeSlot.dayIndex >= 0 && timeSlot.dayIndex < 7) {
      const targetDate = weekDays[timeSlot.dayIndex];
      const targetSlot = { 
        date: targetDate, 
        hour: timeSlot.hour, 
        minute: timeSlot.minute 
      };

      // Validate the drop
      const validation = validateEventDrop(
        dragState.draggedEvent,
        targetDate,
        timeSlot.hour,
        timeSlot.minute,
        events.filter(e => e.id !== dragState.draggedEvent!.id),
        boundaries
      );

      validationRef.current = validation;

      // Update ghost styling based on validation
      if (ghostRef.current) {
        ghostRef.current.className = ghostRef.current.className.replace(
          /bg-success\/\d+|bg-destructive\/\d+|border-success|border-destructive|ring-\d+|ring-success\/\d+|ring-destructive\/\d+/g,
          ''
        );
        ghostRef.current.className += ` ${getDragFeedbackClass(validation)}`;
      }

      setDragState(prev => ({
        ...prev,
        currentPosition: { x: clientX, y: clientY },
        isValidDrop: validation.isValid,
        targetSlot
      }));

      // Update drop zone visual feedback
      updateDropZoneFeedback(timeSlot, validation.isValid);
    }
  }, [dragState.isDragging, dragState.draggedEvent, events, boundaries, weekDays, containerRef]);

  const handleDragEnd = useCallback(() => {
    if (!dragState.isDragging || !dragState.draggedEvent) return;

    // Clean up ghost element
    if (ghostRef.current) {
      document.body.removeChild(ghostRef.current);
      ghostRef.current = null;
    }

    // Remove visual feedback from original event
    const originalElement = document.querySelector(`[data-event-id="${dragState.draggedEvent.id}"]`);
    if (originalElement) {
      originalElement.classList.remove('opacity-50', 'scale-95');
    }

    // Clean up drop zone feedback
    clearDropZoneFeedback();

    // Process the drop if valid
    if (dragState.isValidDrop && dragState.targetSlot) {
      const { targetSlot, draggedEvent } = dragState;
      const newStart = new Date(targetSlot.date);
      newStart.setHours(targetSlot.hour, targetSlot.minute || 0, 0, 0);
      
      const duration = draggedEvent.end.getTime() - draggedEvent.start.getTime();
      const newEnd = new Date(newStart.getTime() + duration);

      // Add to history for undo functionality
      setDragHistory(prev => [...prev.slice(-9), {
        event: draggedEvent,
        from: draggedEvent.start,
        to: newStart
      }]);

      // Update the event
      onEventUpdate(draggedEvent, { start: newStart, end: newEnd });

      toast({
        title: "Event Moved",
        description: `${draggedEvent.title} moved to ${newStart.toLocaleDateString()} at ${newStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      });
    } else if (!dragState.isValidDrop && validationRef.current.reason) {
      // Show error message
      toast({
        title: "Invalid Drop",
        description: validationRef.current.reason,
        variant: "destructive"
      });

      // Show suggestion if available
      if (validationRef.current.suggestedSlot) {
        const suggestion = validationRef.current.suggestedSlot;
        setTimeout(() => {
          toast({
            title: "Suggested Time",
            description: `Try ${suggestion.date.toLocaleDateString()} at ${suggestion.hour}:${String(suggestion.minute || 0).padStart(2, '0')}`,
          });
        }, 1000);
      }
    }

    // Reset drag state
    setDragState({
      isDragging: false,
      draggedEvent: null,
      originalPosition: null,
      currentPosition: null,
      isValidDrop: false,
      targetSlot: null
    });

    // Clean up event listeners
    document.removeEventListener('selectstart', preventSelection);
    document.body.style.userSelect = '';
  }, [dragState, onEventUpdate, toast]);

  const undoLastMove = useCallback(() => {
    if (dragHistory.length === 0) return;

    const lastMove = dragHistory[dragHistory.length - 1];
    const duration = lastMove.event.end.getTime() - lastMove.event.start.getTime();
    const originalEnd = new Date(lastMove.from.getTime() + duration);

    onEventUpdate(lastMove.event, { 
      start: lastMove.from, 
      end: originalEnd 
    });

    setDragHistory(prev => prev.slice(0, -1));

    toast({
      title: "Move Undone",
      description: `${lastMove.event.title} moved back to original position`,
    });
  }, [dragHistory, onEventUpdate, toast]);

  // Helper functions
  const preventSelection = (e: Event) => e.preventDefault();

  const updateDropZoneFeedback = (timeSlot: { dayIndex: number; hour: number }, isValid: boolean) => {
    // Clear previous feedback
    clearDropZoneFeedback();

    // Add feedback to target slot
    const slotElement = document.querySelector(
      `[data-day-index="${timeSlot.dayIndex}"][data-hour="${timeSlot.hour}"]`
    );
    if (slotElement) {
      slotElement.classList.add(
        'ring-2',
        isValid ? 'ring-success/50' : 'ring-destructive/50',
        isValid ? 'bg-success/10' : 'bg-destructive/10'
      );
    }
  };

  const clearDropZoneFeedback = () => {
    document.querySelectorAll('[data-day-index][data-hour]').forEach(element => {
      element.classList.remove(
        'ring-2', 'ring-success/50', 'ring-destructive/50',
        'bg-success/10', 'bg-destructive/10'
      );
    });
  };

  return {
    dragState,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    undoLastMove,
    canUndo: dragHistory.length > 0,
    dragHistory
  };
}