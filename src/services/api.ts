/**
 * API abstraction layer for calendar and scheduling operations.
 * Purpose: Isolate all calendar mutations for easy backend swap.
 * Backend integration point: Replace mock implementations with actual API calls.
 * TODO: API -> /api/calendar/events, /api/calendar/conflicts
 */

import { supabase } from '@/integrations/supabase/client';

export interface ScheduleBlockPayload {
  title: string;
  specific_date: string;
  start_time: string;
  end_time: string;
  day_of_week?: number;
  location?: string;
  notes?: string;
  is_recurring?: boolean;
  course_id?: string;
  source?: 'manual' | 'ada-ai' | 'import';
  user_id: string;
}

export interface ConflictCheckPayload {
  start_time: string;
  end_time: string;
  specific_date: string;
  exclude_id?: string;
  user_id: string;
}

export interface ScheduleConflict {
  conflict_type: string;
  conflict_id: string;
  conflict_title: string;
  conflict_start: string;
  conflict_end: string;
}

export interface CreateScheduleBlockResult {
  id: string;
  title: string;
  specific_date: string;
  start_time: string;
  end_time: string;
  source: string;
}

/**
 * Creates a new schedule block in the calendar.
 * TODO: API -> POST /api/calendar/events
 */
export const createScheduleBlock = async (
  payload: ScheduleBlockPayload
): Promise<CreateScheduleBlockResult> => {
  // Calculate day_of_week from specific_date if not provided
  const dayOfWeek = payload.day_of_week ?? new Date(payload.specific_date).getDay();
  
  const { data, error } = await supabase
    .from('schedule_blocks')
    .insert([{
      title: payload.title,
      specific_date: payload.specific_date,
      start_time: payload.start_time,
      end_time: payload.end_time,
      day_of_week: dayOfWeek,
      location: payload.location || null,
      description: payload.notes || null,
      is_recurring: payload.is_recurring ?? false,
      is_active: true,
      course_id: payload.course_id || null,
      user_id: payload.user_id,
      // Store source in rotation_group field as workaround (or add migration)
      rotation_group: payload.source || 'manual'
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating schedule block:', error);
    throw error;
  }

  return {
    id: data.id,
    title: data.title,
    specific_date: data.specific_date,
    start_time: data.start_time,
    end_time: data.end_time,
    source: data.rotation_group || 'manual'
  };
};

/**
 * Detects scheduling conflicts for a given time slot.
 * TODO: API -> POST /api/calendar/conflicts
 */
export const detectScheduleConflicts = async (
  payload: ConflictCheckPayload
): Promise<{ conflicts: ScheduleConflict[] }> => {
  try {
    // Construct full datetime strings for conflict detection
    const startDateTime = `${payload.specific_date}T${payload.start_time}:00`;
    const endDateTime = `${payload.specific_date}T${payload.end_time}:00`;

    const { data, error } = await supabase.rpc('detect_schedule_conflicts', {
      p_user_id: payload.user_id,
      p_start_time: startDateTime,
      p_end_time: endDateTime,
      p_exclude_id: payload.exclude_id || null
    });

    if (error) {
      console.error('Error detecting conflicts:', error);
      return { conflicts: [] };
    }

    return { conflicts: data || [] };
  } catch (error) {
    console.error('Failed to detect conflicts:', error);
    return { conflicts: [] };
  }
};

/**
 * Deletes/deactivates a schedule block (for undo functionality).
 * TODO: API -> DELETE /api/calendar/events/:id
 */
export const deleteScheduleBlock = async (
  blockId: string,
  userId: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('schedule_blocks')
    .update({ is_active: false })
    .eq('id', blockId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting schedule block:', error);
    return false;
  }

  return true;
};

/**
 * Restores a previously deleted schedule block (undo).
 * TODO: API -> PATCH /api/calendar/events/:id/restore
 */
export const restoreScheduleBlock = async (
  blockId: string,
  userId: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('schedule_blocks')
    .update({ is_active: true })
    .eq('id', blockId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error restoring schedule block:', error);
    return false;
  }

  return true;
};

/**
 * Updates an existing schedule block.
 * TODO: API -> PATCH /api/calendar/events/:id
 */
export const updateScheduleBlock = async (
  blockId: string,
  userId: string,
  updates: Partial<ScheduleBlockPayload>
): Promise<boolean> => {
  const { error } = await supabase
    .from('schedule_blocks')
    .update({
      ...(updates.title && { title: updates.title }),
      ...(updates.specific_date && { specific_date: updates.specific_date }),
      ...(updates.start_time && { start_time: updates.start_time }),
      ...(updates.end_time && { end_time: updates.end_time }),
      ...(updates.location && { location: updates.location }),
      ...(updates.notes && { description: updates.notes }),
    })
    .eq('id', blockId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating schedule block:', error);
    return false;
  }

  return true;
};
