/**
 * Calendar Event Service
 * 
 * Centralized CRUD operations for all calendar event types:
 * - schedule_blocks (classes)
 * - exams
 * - assignments  
 * - study_sessions
 * 
 * This service provides:
 * - Type-safe operations
 * - Consistent error handling
 * - Easy debugging with detailed logging
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================
// TYPES
// ============================================

export type EventType = 'schedule' | 'exam' | 'assignment' | 'study_session';

export interface EventUpdateResult {
  success: boolean;
  error?: string;
}

export interface ScheduleBlockUpdate {
  title?: string;
  start_time?: string;  // Format: "HH:mm:ss"
  end_time?: string;    // Format: "HH:mm:ss"
  day_of_week?: number; // 0-6 (Sunday-Saturday)
  location?: string;
  specific_date?: string; // Format: "YYYY-MM-DD"
}

export interface ExamUpdate {
  title?: string;
  exam_date?: string;     // ISO timestamp
  duration_minutes?: number;
  location?: string;
}

export interface AssignmentUpdate {
  title?: string;
  due_date?: string;      // ISO timestamp
}

export interface StudySessionUpdate {
  title?: string;
  scheduled_start?: string; // ISO timestamp
  scheduled_end?: string;   // ISO timestamp
}

// ============================================
// HELPERS
// ============================================

/**
 * Parse a composite event ID into its type and database ID
 * 
 * Event ID formats:
 * - "schedule-{uuid}"      -> type: "schedule", id: "{uuid}"
 * - "exam-{uuid}"          -> type: "exam", id: "{uuid}"
 * - "assignment-{uuid}"    -> type: "assignment", id: "{uuid}"
 * - "study-session-{uuid}" -> type: "study_session", id: "{uuid}"
 */
export function parseEventId(eventId: string): { type: EventType; id: string } | null {
  if (!eventId || typeof eventId !== 'string') {
    console.error('[CalendarService] Invalid event ID:', eventId);
    return null;
  }

  // Handle study-session special case (has hyphen in prefix)
  if (eventId.startsWith('study-session-')) {
    const id = eventId.slice('study-session-'.length);
    if (!id) {
      console.error('[CalendarService] Empty ID after parsing study-session:', eventId);
      return null;
    }
    return { type: 'study_session', id };
  }

  // Handle other types: schedule-{id}, exam-{id}, assignment-{id}
  const firstDash = eventId.indexOf('-');
  if (firstDash === -1) {
    console.error('[CalendarService] No dash found in event ID:', eventId);
    return null;
  }

  const prefix = eventId.substring(0, firstDash);
  const id = eventId.substring(firstDash + 1);

  if (!id) {
    console.error('[CalendarService] Empty ID after parsing:', eventId);
    return null;
  }

  const typeMap: Record<string, EventType> = {
    'schedule': 'schedule',
    'exam': 'exam',
    'assignment': 'assignment',
  };

  const type = typeMap[prefix];
  if (!type) {
    console.error('[CalendarService] Unknown event type prefix:', prefix);
    return null;
  }

  return { type, id };
}

// ============================================
// UPDATE OPERATIONS
// ============================================

export async function updateScheduleBlock(id: string, updates: ScheduleBlockUpdate): Promise<EventUpdateResult> {
  console.log('[CalendarService] Updating schedule block:', { id, updates });
  
  try {
    const { error } = await supabase
      .from('schedule_blocks')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('[CalendarService] Schedule block update failed:', error);
      return { success: false, error: error.message };
    }

    console.log('[CalendarService] Schedule block updated successfully');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CalendarService] Schedule block update exception:', err);
    return { success: false, error: message };
  }
}

export async function updateExam(id: string, updates: ExamUpdate): Promise<EventUpdateResult> {
  console.log('[CalendarService] Updating exam:', { id, updates });
  
  try {
    const { error } = await supabase
      .from('exams')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('[CalendarService] Exam update failed:', error);
      return { success: false, error: error.message };
    }

    console.log('[CalendarService] Exam updated successfully');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CalendarService] Exam update exception:', err);
    return { success: false, error: message };
  }
}

export async function updateAssignment(id: string, updates: AssignmentUpdate): Promise<EventUpdateResult> {
  console.log('[CalendarService] Updating assignment:', { id, updates });
  
  try {
    const { error } = await supabase
      .from('assignments')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('[CalendarService] Assignment update failed:', error);
      return { success: false, error: error.message };
    }

    console.log('[CalendarService] Assignment updated successfully');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CalendarService] Assignment update exception:', err);
    return { success: false, error: message };
  }
}

export async function updateStudySession(id: string, updates: StudySessionUpdate): Promise<EventUpdateResult> {
  console.log('[CalendarService] Updating study session:', { id, updates });
  
  try {
    const { error } = await supabase
      .from('study_sessions')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('[CalendarService] Study session update failed:', error);
      return { success: false, error: error.message };
    }

    console.log('[CalendarService] Study session updated successfully');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CalendarService] Study session update exception:', err);
    return { success: false, error: message };
  }
}

// ============================================
// DELETE OPERATIONS
// ============================================

export async function deleteScheduleBlock(id: string): Promise<EventUpdateResult> {
  console.log('[CalendarService] Deleting schedule block:', id);
  
  try {
    const { error } = await supabase
      .from('schedule_blocks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[CalendarService] Schedule block delete failed:', error);
      return { success: false, error: error.message };
    }

    console.log('[CalendarService] Schedule block deleted successfully');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CalendarService] Schedule block delete exception:', err);
    return { success: false, error: message };
  }
}

export async function deleteExam(id: string): Promise<EventUpdateResult> {
  console.log('[CalendarService] Deleting exam:', id);
  
  try {
    const { error } = await supabase
      .from('exams')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[CalendarService] Exam delete failed:', error);
      return { success: false, error: error.message };
    }

    console.log('[CalendarService] Exam deleted successfully');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CalendarService] Exam delete exception:', err);
    return { success: false, error: message };
  }
}

export async function deleteAssignment(id: string): Promise<EventUpdateResult> {
  console.log('[CalendarService] Deleting assignment:', id);
  
  try {
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[CalendarService] Assignment delete failed:', error);
      return { success: false, error: error.message };
    }

    console.log('[CalendarService] Assignment deleted successfully');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CalendarService] Assignment delete exception:', err);
    return { success: false, error: message };
  }
}

export async function deleteStudySession(id: string): Promise<EventUpdateResult> {
  console.log('[CalendarService] Deleting study session:', id);
  
  try {
    const { error } = await supabase
      .from('study_sessions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[CalendarService] Study session delete failed:', error);
      return { success: false, error: error.message };
    }

    console.log('[CalendarService] Study session deleted successfully');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CalendarService] Study session delete exception:', err);
    return { success: false, error: message };
  }
}

// ============================================
// UNIFIED OPERATIONS
// ============================================

/**
 * Update any calendar event by its composite ID
 * Automatically routes to the correct table based on event type
 */
export async function updateEvent(
  eventId: string, 
  updates: ScheduleBlockUpdate | ExamUpdate | AssignmentUpdate | StudySessionUpdate
): Promise<EventUpdateResult> {
  const parsed = parseEventId(eventId);
  
  if (!parsed) {
    return { success: false, error: 'Invalid event ID format' };
  }

  console.log('[CalendarService] Updating event:', { eventId, type: parsed.type, id: parsed.id });

  switch (parsed.type) {
    case 'schedule':
      return updateScheduleBlock(parsed.id, updates as ScheduleBlockUpdate);
    case 'exam':
      return updateExam(parsed.id, updates as ExamUpdate);
    case 'assignment':
      return updateAssignment(parsed.id, updates as AssignmentUpdate);
    case 'study_session':
      return updateStudySession(parsed.id, updates as StudySessionUpdate);
    default:
      return { success: false, error: `Unknown event type: ${parsed.type}` };
  }
}

/**
 * Delete any calendar event by its composite ID
 * Automatically routes to the correct table based on event type
 */
export async function deleteEvent(eventId: string): Promise<EventUpdateResult> {
  const parsed = parseEventId(eventId);
  
  if (!parsed) {
    return { success: false, error: 'Invalid event ID format' };
  }

  console.log('[CalendarService] Deleting event:', { eventId, type: parsed.type, id: parsed.id });

  switch (parsed.type) {
    case 'schedule':
      return deleteScheduleBlock(parsed.id);
    case 'exam':
      return deleteExam(parsed.id);
    case 'assignment':
      return deleteAssignment(parsed.id);
    case 'study_session':
      return deleteStudySession(parsed.id);
    default:
      return { success: false, error: `Unknown event type: ${parsed.type}` };
  }
}

/**
 * Get human-readable label for event type
 */
export function getEventTypeLabel(type: EventType): string {
  const labels: Record<EventType, string> = {
    schedule: 'Class',
    exam: 'Exam',
    assignment: 'Assignment',
    study_session: 'Study Session',
  };
  return labels[type] || 'Event';
}
