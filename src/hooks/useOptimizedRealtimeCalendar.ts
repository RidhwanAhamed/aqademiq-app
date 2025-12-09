import { useToast } from '@/hooks/use-toast';
import { Assignment } from '@/hooks/useAssignments';
import { useAuth } from '@/hooks/useAuth';
import { Exam, ScheduleBlock } from '@/hooks/useSchedule';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { debounce } from 'lodash-es';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getTodayDayOfWeek, getTodayInTimezone, getUserTimezone } from '@/utils/timezone';

export interface CalendarEvent {
  id: string;
  type: 'schedule' | 'exam' | 'assignment';
  title: string;
  start: Date;
  end: Date;
  location?: string;
  color: string;
  course?: {
    name: string;
    color: string;
  };
  data: ScheduleBlock | Exam | Assignment;
}

interface OptimisticUpdate {
  eventId: string;
  updates: Partial<CalendarEvent>;
  timestamp: number;
}

export function useOptimizedRealtimeCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimisticUpdates, setOptimisticUpdates] = useState<OptimisticUpdate[]>([]);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const { user } = useAuth();
  const { toast } = useToast();

  // Memoized transform function to prevent unnecessary recalculations
  const transformToCalendarEvents = useMemo(() => (
    scheduleBlocks: ScheduleBlock[] = [],
    exams: Exam[] = [],
    assignments: any[] = [] // Use any[] for partial assignment data
  ): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    const now = Date.now();

    // Transform schedule blocks with better performance
    scheduleBlocks.forEach(block => {
      if (!block.is_active) return;
      
      let startDate: Date;
      
      // Check if this is a non-recurring event with a specific date
      if (block.specific_date && !block.is_recurring) {
        // Use the specific date directly for non-recurring events
        startDate = new Date(block.specific_date + 'T00:00:00');
      } else if (block.day_of_week !== undefined && block.day_of_week !== null) {
        // Calculate next occurrence for recurring events using timezone-aware day calculation
        const userTimezone = getUserTimezone();
        const zonedToday = getTodayInTimezone(userTimezone);
        const todayDayOfWeek = getTodayDayOfWeek(userTimezone);
        startDate = new Date(zonedToday);
        startDate.setDate(zonedToday.getDate() + (block.day_of_week - todayDayOfWeek + 7) % 7);
      } else {
        // Fallback: skip blocks with no valid date info
        console.warn('Schedule block has no valid date information:', block.id);
        return;
      }
      
      const start = new Date(startDate);
      const [startHour, startMinute] = block.start_time.split(':').map(Number);
      start.setHours(startHour, startMinute, 0, 0);
      
      const end = new Date(startDate);
      const [endHour, endMinute] = block.end_time.split(':').map(Number);
      end.setHours(endHour, endMinute, 0, 0);

      events.push({
        id: `schedule-${block.id}`,
        type: 'schedule',
        title: block.title,
        start,
        end,
        location: block.location,
        color: block.courses?.color || 'blue',
        course: block.courses,
        data: block
      });
    });

    // Transform exams
    exams.forEach(exam => {
      const start = new Date(exam.exam_date);
      const end = new Date(start.getTime() + (exam.duration_minutes * 60 * 1000));

      events.push({
        id: `exam-${exam.id}`,
        type: 'exam',
        title: exam.title,
        start,
        end,
        location: exam.location,
        color: exam.courses?.color || 'red',
        course: exam.courses,
        data: exam
      });
    });

    // Transform assignments (only upcoming)
    const sevenDaysFromNow = now + (7 * 24 * 60 * 60 * 1000);
    assignments.forEach(assignment => {
      if (assignment.is_completed) return;
      
      const dueDate = new Date(assignment.due_date);
      if (dueDate.getTime() > sevenDaysFromNow) return; // Only show assignments due within 7 days
      
      const start = new Date(dueDate.getTime() - (60 * 60 * 1000)); // 1 hour before
      const end = dueDate;

      events.push({
        id: `assignment-${assignment.id}`,
        type: 'assignment',
        title: `Due: ${assignment.title}`,
        start,
        end,
        color: 'orange',
        course: undefined,
        data: assignment as Assignment
      });
    });

    return events;
  }, []);

  // Optimized fetch function with caching
  const fetchCalendarData = useCallback(async (force: boolean = false) => {
    if (!user) return;

    const now = Date.now();
    // Avoid fetching if we just fetched recently (unless forced)
    if (!force && now - lastFetch < 30000) { // 30 seconds cache
      return;
    }

    try {
      logger.info('Fetching calendar data', { userId: user.id, force });

      const fetchData = async () => {
        const [scheduleResult, examsResult, assignmentsResult] = await Promise.all([
          supabase
            .from('schedule_blocks')
            .select(`*, courses(name, color)`)
            .eq('user_id', user.id)
            .eq('is_active', true),
          supabase
            .from('exams')
            .select(`*, courses(name, color)`)
            .eq('user_id', user.id)
            .gte('exam_date', new Date().toISOString()) // Only future exams
            .limit(50), // Limit to prevent large payloads
          supabase
            .from('assignments')
            .select(`id, title, due_date, is_completed, courses(name, color)`) // Select only needed fields
            .eq('user_id', user.id)
            .eq('is_completed', false)
            .gte('due_date', new Date().toISOString()) // Only future assignments
            .limit(100) // Limit to prevent large payloads
        ]);

        if (scheduleResult.error) throw scheduleResult.error;
        if (examsResult.error) throw examsResult.error;
        if (assignmentsResult.error) throw assignmentsResult.error;

        return {
          scheduleBlocks: (scheduleResult.data || []) as ScheduleBlock[],
          exams: (examsResult.data || []) as Exam[],
          assignments: (assignmentsResult.data || []) as any[] // Use any[] since we're only selecting specific fields
        };
      };

      const { scheduleBlocks, exams, assignments } = await fetchData();

      const calendarEvents = transformToCalendarEvents(scheduleBlocks, exams, assignments);
      setEvents(calendarEvents);
      setLastFetch(now);
      
      logger.info('Calendar data fetched successfully', { 
        eventCount: calendarEvents.length,
        scheduleCount: scheduleBlocks.length,
        examCount: exams.length,
        assignmentCount: assignments.length
      });

    } catch (error) {
      logger.error('Error fetching calendar data', { error, userId: user.id });
      toast({
        title: "Connection Issue",
        description: "Unable to sync calendar data. Please check your connection.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, transformToCalendarEvents, toast, lastFetch]);

  // Debounced refetch to prevent excessive calls
  const debouncedRefetch = useMemo(
    () => debounce(() => fetchCalendarData(true), 300),
    [fetchCalendarData]
  );

  // Set up consolidated real-time subscription
  useEffect(() => {
    if (!user) return;

    fetchCalendarData();

    logger.info('Setting up real-time subscriptions', { userId: user.id });

    // Consolidated channel for all calendar-related changes
    const calendarChannel = supabase
      .channel('calendar-all-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedule_blocks',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          logger.debug('Schedule block change detected', { payload });
          debouncedRefetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exams',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          logger.debug('Exam change detected', { payload });
          debouncedRefetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assignments',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          logger.debug('Assignment change detected', { payload });
          debouncedRefetch();
        }
      )
      .subscribe((status) => {
        logger.info('Calendar subscription status', { status });
      });

    return () => {
      logger.info('Cleaning up calendar subscriptions');
      supabase.removeChannel(calendarChannel);
      debouncedRefetch.cancel();
    };
  }, [user, fetchCalendarData, debouncedRefetch]);

  // Optimistic update system
  const applyOptimisticUpdate = useCallback((eventId: string, updates: Partial<CalendarEvent>) => {
    const timestamp = Date.now();
    setOptimisticUpdates(prev => [
      ...prev.filter(u => u.eventId !== eventId), // Remove existing update for this event
      { eventId, updates, timestamp }
    ]);

    // Auto-clear optimistic update after 5 seconds
    setTimeout(() => {
      setOptimisticUpdates(prev => prev.filter(u => !(u.eventId === eventId && u.timestamp === timestamp)));
    }, 5000);
  }, []);

  const clearOptimisticUpdate = useCallback((eventId: string) => {
    setOptimisticUpdates(prev => prev.filter(u => u.eventId !== eventId));
  }, []);

  // Optimized update functions with better error handling
  const updateScheduleBlock = useCallback(async (
    id: string, 
    updates: { start_time?: string; end_time?: string; day_of_week?: number; location?: string; title?: string }
  ) => {
    const eventId = `schedule-${id}`;
    
    try {
      // Apply optimistic update immediately
      applyOptimisticUpdate(eventId, {
        title: updates.title,
        location: updates.location,
      });

      const { error } = await supabase
        .from('schedule_blocks')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      clearOptimisticUpdate(eventId);
      toast({
        title: "Success",
        description: "Schedule updated",
      });
    } catch (error) {
      clearOptimisticUpdate(eventId);
      logger.error('Error updating schedule block', { error, id, updates });
      toast({
        title: "Error",
        description: "Failed to update schedule. Please try again.",
        variant: "destructive"
      });
    }
  }, [toast, applyOptimisticUpdate, clearOptimisticUpdate]);

  const updateExam = useCallback(async (
    id: string,
    updates: { exam_date?: string; duration_minutes?: number; location?: string; title?: string }
  ) => {
    const eventId = `exam-${id}`;
    
    try {
      applyOptimisticUpdate(eventId, {
        title: updates.title,
        location: updates.location,
      });

      const { error } = await supabase
        .from('exams')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      clearOptimisticUpdate(eventId);
      toast({
        title: "Success", 
        description: "Exam updated",
      });
    } catch (error) {
      clearOptimisticUpdate(eventId);
      logger.error('Error updating exam', { error, id, updates });
      toast({
        title: "Error",
        description: "Failed to update exam. Please try again.",
        variant: "destructive"
      });
    }
  }, [toast, applyOptimisticUpdate, clearOptimisticUpdate]);

  const updateAssignment = useCallback(async (
    id: string,
    updates: { due_date?: string; title?: string }
  ) => {
    const eventId = `assignment-${id}`;
    
    try {
      applyOptimisticUpdate(eventId, {
        title: updates.title ? `Due: ${updates.title}` : undefined,
      });

      const { error } = await supabase
        .from('assignments')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      clearOptimisticUpdate(eventId);
      toast({
        title: "Success",
        description: "Assignment updated",
      });
    } catch (error) {
      clearOptimisticUpdate(eventId);
      logger.error('Error updating assignment', { error, id, updates });
      toast({
        title: "Error", 
        description: "Failed to update assignment. Please try again.",
        variant: "destructive"
      });
    }
  }, [toast, applyOptimisticUpdate, clearOptimisticUpdate]);

  // Apply optimistic updates to events
  const eventsWithOptimistic = useMemo(() => {
    return events.map(event => {
      const optimisticUpdate = optimisticUpdates.find(u => u.eventId === event.id);
      return optimisticUpdate ? { ...event, ...optimisticUpdate.updates } : event;
    });
  }, [events, optimisticUpdates]);

  return {
    events: eventsWithOptimistic,
    loading,
    updateScheduleBlock,
    updateExam,
    updateAssignment,
    applyOptimisticUpdate,
    clearOptimisticUpdate,
    refetch: () => fetchCalendarData(true)
  };
}