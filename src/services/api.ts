/**
 * API abstraction layer for calendar, scheduling, and gamification operations.
 * Purpose: Isolate all mutations for easy backend swap.
 * Backend integration point: Replace mock implementations with actual API calls.
 * TODO: API -> /api/calendar/events, /api/calendar/conflicts, /api/achievements
 */

import { supabase } from '@/integrations/supabase/client';
import badgesData from '@/data/badges.json';
import type { Badge, UserBadge } from '@/types/badges';

// ============================================================================
// Achievement Badge Types & Service
// ============================================================================

/**
 * Fetches all available badges from mock data.
 * TODO: API -> GET /api/achievements/badges
 */
export const getBadges = (): Promise<Badge[]> => {
  return Promise.resolve(badgesData.badges as Badge[]);
};

/**
 * Fetches user's unlocked badges.
 * TODO: API -> GET /api/achievements/user/:userId
 */
export const getUserBadges = async (userId: string): Promise<UserBadge[]> => {
  // TODO: API -> GET /api/achievements/user/:userId
  // For now, using localStorage as mock storage until backend is ready
  const storedBadges = localStorage.getItem(`aqademiq_badges_${userId}`);
  if (storedBadges) {
    return Promise.resolve(JSON.parse(storedBadges));
  }
  return Promise.resolve([]);
};

/**
 * Awards a badge to the user.
 * TODO: API -> POST /api/achievements/award
 */
export const awardBadge = async (
  userId: string, 
  badgeId: string
): Promise<{ success: boolean; badge: Badge | null }> => {
  // TODO: API -> POST /api/achievements/award { userId, badgeId }
  const badges = await getBadges();
  const badge = badges.find(b => b.id === badgeId);
  
  if (!badge) {
    return { success: false, badge: null };
  }

  // Check if already awarded
  const userBadges = await getUserBadges(userId);
  if (userBadges.some(ub => ub.badge_id === badgeId)) {
    return { success: false, badge: null };
  }

  // Award badge (using localStorage until backend integration)
  const newUserBadge: UserBadge = {
    badge_id: badgeId,
    unlocked_at: new Date().toISOString()
  };
  
  const updatedBadges = [...userBadges, newUserBadge];
  localStorage.setItem(`aqademiq_badges_${userId}`, JSON.stringify(updatedBadges));

  return { success: true, badge };
};

/**
 * Checks if user qualifies for any new badges based on current stats.
 * TODO: API -> POST /api/achievements/check
 */
export const checkBadgeEligibility = async (
  userId: string,
  stats: {
    totalPomodoroSessions: number;
    currentStreak: number;
    assignmentsCompleted: number;
    adaChatMessages?: number;
    adaEventsCreated?: number;
  }
): Promise<Badge[]> => {
  const badges = await getBadges();
  const userBadges = await getUserBadges(userId);
  const unlockedIds = new Set(userBadges.map(ub => ub.badge_id));
  
  const eligibleBadges: Badge[] = [];
  
  for (const badge of badges) {
    if (unlockedIds.has(badge.id)) continue;
    
    let qualifies = false;
    
    switch (badge.criteria.type) {
      case 'first_pomodoro':
        qualifies = stats.totalPomodoroSessions >= badge.criteria.threshold;
        break;
      case 'streak_days':
        qualifies = stats.currentStreak >= badge.criteria.threshold;
        break;
      case 'assignments_completed':
        qualifies = stats.assignmentsCompleted >= badge.criteria.threshold;
        break;
      case 'ada_chat_messages':
        qualifies = (stats.adaChatMessages ?? 0) >= badge.criteria.threshold;
        break;
      case 'ada_events_created':
        qualifies = (stats.adaEventsCreated ?? 0) >= badge.criteria.threshold;
        break;
    }
    
    if (qualifies) {
      eligibleBadges.push(badge);
    }
  }
  
  return eligibleBadges;
};

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
 */
export const createScheduleBlock = async (
  payload: ScheduleBlockPayload
): Promise<CreateScheduleBlockResult> => {
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
 */
export const detectScheduleConflicts = async (
  payload: ConflictCheckPayload
): Promise<{ conflicts: ScheduleConflict[] }> => {
  try {
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

// =============================================================================
// Assignment CRUD
// =============================================================================

export interface AssignmentPayload {
  title: string;
  course_id: string;
  due_date: string;
  description?: string;
  priority?: number;
  estimated_hours?: number;
  assignment_type?: string;
  user_id: string;
}

export const createAssignment = async (payload: AssignmentPayload) => {
  const { data, error } = await supabase
    .from('assignments')
    .insert([{
      user_id: payload.user_id,
      course_id: payload.course_id,
      title: payload.title,
      description: payload.description || null,
      due_date: payload.due_date,
      priority: payload.priority ?? 2,
      estimated_hours: payload.estimated_hours || null,
      assignment_type: payload.assignment_type || 'homework',
      is_completed: false,
      completion_percentage: 0
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateAssignment = async (
  assignmentId: string,
  userId: string,
  updates: Partial<{
    title: string;
    due_date: string;
    priority: number;
    is_completed: boolean;
    description: string;
  }>
) => {
  const updateData: any = { ...updates };
  if (updates.is_completed !== undefined) {
    updateData.completion_percentage = updates.is_completed ? 100 : 0;
  }

  const { data, error } = await supabase
    .from('assignments')
    .update(updateData)
    .eq('id', assignmentId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteAssignment = async (assignmentId: string, userId: string) => {
  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('id', assignmentId)
    .eq('user_id', userId);

  if (error) throw error;
  return true;
};

export const completeAssignment = async (assignmentId: string, userId: string) => {
  return updateAssignment(assignmentId, userId, { is_completed: true });
};

// =============================================================================
// Exam CRUD
// =============================================================================

export interface ExamPayload {
  title: string;
  course_id: string;
  exam_date: string;
  duration_minutes?: number;
  location?: string;
  exam_type?: string;
  notes?: string;
  user_id: string;
}

export const createExam = async (payload: ExamPayload) => {
  const { data, error } = await supabase
    .from('exams')
    .insert([{
      user_id: payload.user_id,
      course_id: payload.course_id,
      title: payload.title,
      exam_date: payload.exam_date,
      duration_minutes: payload.duration_minutes || 60,
      location: payload.location || null,
      exam_type: payload.exam_type || 'midterm',
      notes: payload.notes || null
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateExam = async (
  examId: string,
  userId: string,
  updates: Partial<{
    title: string;
    exam_date: string;
    location: string;
    duration_minutes: number;
  }>
) => {
  const { data, error } = await supabase
    .from('exams')
    .update(updates)
    .eq('id', examId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteExam = async (examId: string, userId: string) => {
  const { error } = await supabase
    .from('exams')
    .delete()
    .eq('id', examId)
    .eq('user_id', userId);

  if (error) throw error;
  return true;
};

// =============================================================================
// Study Session CRUD
// =============================================================================

export interface StudySessionPayload {
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  course_id?: string;
  assignment_id?: string;
  exam_id?: string;
  notes?: string;
  user_id: string;
}

export const createStudySession = async (payload: StudySessionPayload) => {
  const { data, error } = await supabase
    .from('study_sessions')
    .insert([{
      user_id: payload.user_id,
      title: payload.title,
      scheduled_start: payload.scheduled_start,
      scheduled_end: payload.scheduled_end,
      course_id: payload.course_id || null,
      assignment_id: payload.assignment_id || null,
      exam_id: payload.exam_id || null,
      notes: payload.notes || null,
      status: 'scheduled'
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateStudySession = async (
  sessionId: string,
  userId: string,
  updates: Partial<{
    title: string;
    scheduled_start: string;
    scheduled_end: string;
    status: string;
    notes: string;
  }>
) => {
  const { data, error } = await supabase
    .from('study_sessions')
    .update(updates)
    .eq('id', sessionId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteStudySession = async (sessionId: string, userId: string) => {
  const { error } = await supabase
    .from('study_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId);

  if (error) throw error;
  return true;
};

// =============================================================================
// Course CRUD
// =============================================================================

export interface CoursePayload {
  name: string;
  code?: string;
  credits?: number;
  instructor?: string;
  color?: string;
  target_grade?: string;
  semester_id?: string;
  user_id: string;
}

export const createCourse = async (payload: CoursePayload) => {
  let semesterId = payload.semester_id;
  
  if (!semesterId) {
    const { data: semesters } = await supabase
      .from('semesters')
      .select('id')
      .eq('user_id', payload.user_id)
      .eq('is_active', true)
      .limit(1);
    
    if (semesters && semesters.length > 0) {
      semesterId = semesters[0].id;
    } else {
      const { data: newSemester } = await supabase
        .from('semesters')
        .insert({
          user_id: payload.user_id,
          name: 'Current Semester',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 120*24*60*60*1000).toISOString().split('T')[0],
          is_active: true
        })
        .select()
        .single();
      semesterId = newSemester?.id;
    }
  }

  const { data, error } = await supabase
    .from('courses')
    .insert([{
      user_id: payload.user_id,
      semester_id: semesterId,
      name: payload.name,
      code: payload.code || null,
      credits: payload.credits || 3,
      instructor: payload.instructor || null,
      color: payload.color || 'blue',
      target_grade: payload.target_grade || null,
      is_active: true
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateCourse = async (
  courseId: string,
  userId: string,
  updates: Partial<{
    name: string;
    code: string;
    credits: number;
    instructor: string;
    color: string;
    target_grade: string;
  }>
) => {
  const { data, error } = await supabase
    .from('courses')
    .update(updates)
    .eq('id', courseId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteCourse = async (courseId: string, userId: string) => {
  const { error } = await supabase
    .from('courses')
    .update({ is_active: false })
    .eq('id', courseId)
    .eq('user_id', userId);

  if (error) throw error;
  return true;
};
