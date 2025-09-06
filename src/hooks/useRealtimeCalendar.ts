import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ScheduleBlock, Exam } from '@/hooks/useSchedule';
import { Assignment } from '@/hooks/useAssignments';
import { useToast } from '@/hooks/use-toast';

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

export function useRealtimeCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, CalendarEvent>>(new Map());
  const { user } = useAuth();
  const { toast } = useToast();

  // Convert database records to calendar events
  const transformToCalendarEvents = useCallback((
    scheduleBlocks: ScheduleBlock[] = [],
    exams: Exam[] = [],
    assignments: Assignment[] = []
  ): CalendarEvent[] => {
    const events: CalendarEvent[] = [];

    // Transform schedule blocks
    scheduleBlocks.forEach(block => {
      if (!block.is_active) return;
      
      // Calculate next occurrence for recurring events
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() + (block.day_of_week! - today.getDay() + 7) % 7);
      
      const start = new Date(startDate);
      const [startHour, startMinute] = block.start_time.split(':');
      start.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
      
      const end = new Date(startDate);
      const [endHour, endMinute] = block.end_time.split(':');
      end.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);

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

    // Transform assignments (show as due date events)
    assignments.forEach(assignment => {
      if (assignment.is_completed) return;
      
      const dueDate = new Date(assignment.due_date);
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
        data: assignment
      });
    });

    return events;
  }, []);

  // Fetch initial data
  const fetchCalendarData = useCallback(async () => {
    if (!user) return;

    try {
      const [scheduleResult, examsResult, assignmentsResult] = await Promise.all([
        supabase
          .from('schedule_blocks')
          .select(`*, courses(name, color)`)
          .eq('user_id', user.id)
          .eq('is_active', true),
        supabase
          .from('exams')
          .select(`*, courses(name, color)`)
          .eq('user_id', user.id),
        supabase
          .from('assignments')
          .select(`*, courses(name, color)`)
          .eq('user_id', user.id)
          .eq('is_completed', false)
      ]);

      if (scheduleResult.error) throw scheduleResult.error;
      if (examsResult.error) throw examsResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;

      const calendarEvents = transformToCalendarEvents(
        scheduleResult.data as ScheduleBlock[],
        examsResult.data as Exam[],
        assignmentsResult.data as Assignment[]
      );

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast({
        title: "Error",
        description: "Failed to load calendar events",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, transformToCalendarEvents, toast]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    fetchCalendarData();

    // Schedule blocks subscription
    const scheduleChannel = supabase
      .channel('schedule-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedule_blocks',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchCalendarData();
        }
      )
      .subscribe();

    // Exams subscription
    const examsChannel = supabase
      .channel('exams-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exams',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchCalendarData();
        }
      )
      .subscribe();

    // Assignments subscription
    const assignmentsChannel = supabase
      .channel('assignments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assignments',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchCalendarData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(scheduleChannel);
      supabase.removeChannel(examsChannel);
      supabase.removeChannel(assignmentsChannel);
    };
  }, [user, fetchCalendarData]);

  // Optimistic update for immediate UI feedback
  const applyOptimisticUpdate = useCallback((eventId: string, updates: Partial<CalendarEvent>) => {
    setOptimisticUpdates(prev => {
      const current = events.find(e => e.id === eventId);
      if (current) {
        const updated = { ...current, ...updates };
        return new Map(prev).set(eventId, updated);
      }
      return prev;
    });
  }, [events]);

  // Clear optimistic update
  const clearOptimisticUpdate = useCallback((eventId: string) => {
    setOptimisticUpdates(prev => {
      const newMap = new Map(prev);
      newMap.delete(eventId);
      return newMap;
    });
  }, []);

  // Update schedule block
  const updateScheduleBlock = useCallback(async (
    id: string, 
    updates: { start_time?: string; end_time?: string; day_of_week?: number; location?: string; title?: string }
  ) => {
    try {
      const { error } = await supabase
        .from('schedule_blocks')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Schedule updated",
      });
    } catch (error) {
      console.error('Error updating schedule block:', error);
      toast({
        title: "Error",
        description: "Failed to update schedule",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Update exam
  const updateExam = useCallback(async (
    id: string,
    updates: { exam_date?: string; duration_minutes?: number; location?: string; title?: string }
  ) => {
    try {
      const { error } = await supabase
        .from('exams')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success", 
        description: "Exam updated",
      });
    } catch (error) {
      console.error('Error updating exam:', error);
      toast({
        title: "Error",
        description: "Failed to update exam",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Update assignment
  const updateAssignment = useCallback(async (
    id: string,
    updates: { due_date?: string; title?: string }
  ) => {
    try {
      const { error } = await supabase
        .from('assignments')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Assignment updated",
      });
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast({
        title: "Error", 
        description: "Failed to update assignment",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Get events with optimistic updates applied
  const eventsWithOptimistic = events.map(event => {
    const optimistic = optimisticUpdates.get(event.id);
    return optimistic || event;
  });

  return {
    events: eventsWithOptimistic,
    loading,
    updateScheduleBlock,
    updateExam,
    updateAssignment,
    applyOptimisticUpdate,
    clearOptimisticUpdate,
    refetch: fetchCalendarData
  };
}