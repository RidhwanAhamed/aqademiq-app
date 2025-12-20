/**
 * Ada Master Agent - Orchestrator for all worker agents
 * Handles intent classification, routing, transactions, and audit logging
 */
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =============================================================================
// TYPES
// =============================================================================

interface AgentRequest {
  user_id: string;
  intent: string;
  entity_type: 'event' | 'assignment' | 'exam' | 'study_session' | 'course' | 'cornell_notes';
  action: 'create' | 'read' | 'update' | 'delete';
  payload: Record<string, any>;
  request_id: string;
  idempotency_key?: string;
  transaction_id?: string;
}

interface AgentResponse {
  success: boolean;
  data?: any;
  error?: string;
  error_code?: string;
  entity_id?: string;
  audit_log_id?: string;
}

interface TransactionContext {
  transaction_id: string;
  operations: Array<{
    request: AgentRequest;
    response?: AgentResponse;
    rollback_data?: any;
  }>;
  status: 'pending' | 'committed' | 'rolled_back';
}

// =============================================================================
// AUDIT LOGGING
// =============================================================================

async function createAuditLog(
  supabase: any,
  userId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  beforeState: any,
  afterState: any,
  source: string,
  requestId?: string,
  transactionId?: string,
  idempotencyKey?: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .insert({
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        before_state: beforeState,
        after_state: afterState,
        source,
        request_id: requestId,
        transaction_id: transactionId,
        idempotency_key: idempotencyKey
      })
      .select('id')
      .single();

    if (error) {
      console.error('Audit log creation failed:', error);
      return null;
    }
    return data?.id;
  } catch (e) {
    console.error('Audit log error:', e);
    return null;
  }
}

// =============================================================================
// IDEMPOTENCY CHECK
// =============================================================================

async function checkIdempotency(
  supabase: any,
  idempotencyKey: string
): Promise<{ exists: boolean; result?: any }> {
  if (!idempotencyKey) return { exists: false };

  const { data } = await supabase
    .from('audit_log')
    .select('after_state, entity_id')
    .eq('idempotency_key', idempotencyKey)
    .single();

  if (data) {
    return { 
      exists: true, 
      result: { 
        success: true, 
        data: data.after_state,
        entity_id: data.entity_id,
        cached: true
      }
    };
  }
  return { exists: false };
}

// =============================================================================
// WORKER AGENT ROUTING
// =============================================================================

async function routeToWorker(
  supabase: any,
  request: AgentRequest
): Promise<AgentResponse> {
  const { entity_type, action, payload, user_id } = request;

  console.log(`Routing to ${entity_type} worker for ${action}:`, payload);

  try {
    switch (entity_type) {
      case 'event':
        return await handleEventAction(supabase, user_id, action, payload, request);
      case 'assignment':
        return await handleAssignmentAction(supabase, user_id, action, payload, request);
      case 'exam':
        return await handleExamAction(supabase, user_id, action, payload, request);
      case 'study_session':
        return await handleStudySessionAction(supabase, user_id, action, payload, request);
      case 'course':
        return await handleCourseAction(supabase, user_id, action, payload, request);
      case 'cornell_notes':
        return await handleCornellNotesAction(supabase, user_id, action, payload, request);
      default:
        return { success: false, error: `Unknown entity type: ${entity_type}`, error_code: 'UNKNOWN_ENTITY' };
    }
  } catch (error) {
    console.error(`Worker error for ${entity_type}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', error_code: 'WORKER_ERROR' };
  }
}

// =============================================================================
// EVENT WORKER (Schedule Blocks)
// =============================================================================

async function handleEventAction(
  supabase: any,
  userId: string,
  action: string,
  payload: any,
  request: AgentRequest
): Promise<AgentResponse> {
  switch (action) {
    case 'create': {
      // Parse dates
      const startDate = new Date(payload.start_iso);
      const endDate = new Date(payload.end_iso);
      const specificDate = startDate.toISOString().split('T')[0];
      const startTime = startDate.toTimeString().slice(0, 8);
      const endTime = endDate.toTimeString().slice(0, 8);
      const dayOfWeek = startDate.getDay();

      const insertData = {
        user_id: userId,
        title: payload.title,
        specific_date: specificDate,
        start_time: startTime,
        end_time: endTime,
        day_of_week: dayOfWeek,
        location: payload.location || null,
        description: payload.notes || null,
        is_recurring: payload.is_recurring ?? false,
        is_active: true,
        course_id: payload.course_id || null,
        source: 'ada-ai'
      };

      const { data, error } = await supabase
        .from('schedule_blocks')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      await createAuditLog(
        supabase, userId, 'create', 'event', data.id,
        null, data, 'ada-ai', request.request_id, 
        request.transaction_id, request.idempotency_key
      );

      return { success: true, data, entity_id: data.id };
    }

    case 'update': {
      // Get before state
      const { data: beforeData } = await supabase
        .from('schedule_blocks')
        .select('*')
        .eq('id', payload.id)
        .eq('user_id', userId)
        .single();

      if (!beforeData) {
        return { success: false, error: 'Event not found', error_code: 'NOT_FOUND' };
      }

      const updates: any = {};
      if (payload.title) updates.title = payload.title;
      if (payload.start_iso) {
        const startDate = new Date(payload.start_iso);
        updates.specific_date = startDate.toISOString().split('T')[0];
        updates.start_time = startDate.toTimeString().slice(0, 8);
        updates.day_of_week = startDate.getDay();
      }
      if (payload.end_iso) {
        updates.end_time = new Date(payload.end_iso).toTimeString().slice(0, 8);
      }
      if (payload.location !== undefined) updates.location = payload.location;
      if (payload.notes !== undefined) updates.description = payload.notes;

      const { data, error } = await supabase
        .from('schedule_blocks')
        .update(updates)
        .eq('id', payload.id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      await createAuditLog(
        supabase, userId, 'update', 'event', data.id,
        beforeData, data, 'ada-ai', request.request_id,
        request.transaction_id, request.idempotency_key
      );

      return { success: true, data, entity_id: data.id };
    }

    case 'delete': {
      const { data: beforeData } = await supabase
        .from('schedule_blocks')
        .select('*')
        .eq('id', payload.id)
        .eq('user_id', userId)
        .single();

      if (!beforeData) {
        return { success: false, error: 'Event not found', error_code: 'NOT_FOUND' };
      }

      // Soft delete
      const { error } = await supabase
        .from('schedule_blocks')
        .update({ is_active: false })
        .eq('id', payload.id)
        .eq('user_id', userId);

      if (error) throw error;

      await createAuditLog(
        supabase, userId, 'delete', 'event', payload.id,
        beforeData, { ...beforeData, is_active: false }, 'ada-ai',
        request.request_id, request.transaction_id, request.idempotency_key
      );

      return { success: true, entity_id: payload.id };
    }

    case 'read': {
      let query = supabase
        .from('schedule_blocks')
        .select('*, courses(name, color)')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (payload.id) {
        query = query.eq('id', payload.id);
      }
      if (payload.date) {
        query = query.eq('specific_date', payload.date);
      }
      if (payload.course_id) {
        query = query.eq('course_id', payload.course_id);
      }

      const { data, error } = payload.id 
        ? await query.single()
        : await query.order('start_time', { ascending: true });

      if (error && error.code !== 'PGRST116') throw error;

      return { success: true, data: data || [] };
    }

    default:
      return { success: false, error: `Unknown action: ${action}`, error_code: 'UNKNOWN_ACTION' };
  }
}

// =============================================================================
// ASSIGNMENT WORKER
// =============================================================================

async function handleAssignmentAction(
  supabase: any,
  userId: string,
  action: string,
  payload: any,
  request: AgentRequest
): Promise<AgentResponse> {
  switch (action) {
    case 'create': {
      const insertData = {
        user_id: userId,
        course_id: payload.course_id,
        title: payload.title,
        description: payload.description || null,
        due_date: payload.due_date,
        priority: payload.priority ?? 2,
        estimated_hours: payload.estimated_hours || null,
        assignment_type: payload.assignment_type || 'homework',
        is_completed: false,
        completion_percentage: 0
      };

      const { data, error } = await supabase
        .from('assignments')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      await createAuditLog(
        supabase, userId, 'create', 'assignment', data.id,
        null, data, 'ada-ai', request.request_id,
        request.transaction_id, request.idempotency_key
      );

      return { success: true, data, entity_id: data.id };
    }

    case 'update': {
      const { data: beforeData } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', payload.id)
        .eq('user_id', userId)
        .single();

      if (!beforeData) {
        return { success: false, error: 'Assignment not found', error_code: 'NOT_FOUND' };
      }

      const updates: any = {};
      if (payload.title) updates.title = payload.title;
      if (payload.description !== undefined) updates.description = payload.description;
      if (payload.due_date) updates.due_date = payload.due_date;
      if (payload.priority !== undefined) updates.priority = payload.priority;
      if (payload.is_completed !== undefined) {
        updates.is_completed = payload.is_completed;
        updates.completion_percentage = payload.is_completed ? 100 : beforeData.completion_percentage;
      }
      if (payload.completion_percentage !== undefined) updates.completion_percentage = payload.completion_percentage;

      const { data, error } = await supabase
        .from('assignments')
        .update(updates)
        .eq('id', payload.id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      await createAuditLog(
        supabase, userId, 'update', 'assignment', data.id,
        beforeData, data, 'ada-ai', request.request_id,
        request.transaction_id, request.idempotency_key
      );

      return { success: true, data, entity_id: data.id };
    }

    case 'delete': {
      const { data: beforeData } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', payload.id)
        .eq('user_id', userId)
        .single();

      if (!beforeData) {
        return { success: false, error: 'Assignment not found', error_code: 'NOT_FOUND' };
      }

      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', payload.id)
        .eq('user_id', userId);

      if (error) throw error;

      await createAuditLog(
        supabase, userId, 'delete', 'assignment', payload.id,
        beforeData, null, 'ada-ai', request.request_id,
        request.transaction_id, request.idempotency_key
      );

      return { success: true, entity_id: payload.id };
    }

    case 'read': {
      let query = supabase
        .from('assignments')
        .select('*, courses(name)')
        .eq('user_id', userId);

      if (payload.id) {
        query = query.eq('id', payload.id);
      }
      if (payload.course_id) {
        query = query.eq('course_id', payload.course_id);
      }
      if (payload.is_completed !== undefined) {
        query = query.eq('is_completed', payload.is_completed);
      }

      const { data, error } = payload.id 
        ? await query.single()
        : await query.order('due_date', { ascending: true });

      if (error && error.code !== 'PGRST116') throw error;

      return { success: true, data: data || [] };
    }

    default:
      return { success: false, error: `Unknown action: ${action}`, error_code: 'UNKNOWN_ACTION' };
  }
}

// =============================================================================
// EXAM WORKER
// =============================================================================

async function handleExamAction(
  supabase: any,
  userId: string,
  action: string,
  payload: any,
  request: AgentRequest
): Promise<AgentResponse> {
  switch (action) {
    case 'create': {
      const insertData = {
        user_id: userId,
        course_id: payload.course_id,
        title: payload.title,
        exam_date: payload.exam_date,
        duration_minutes: payload.duration_minutes || 60,
        location: payload.location || null,
        notes: payload.notes || null,
        exam_type: payload.exam_type || 'midterm',
        study_hours_planned: payload.study_hours_planned || 10
      };

      const { data, error } = await supabase
        .from('exams')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      await createAuditLog(
        supabase, userId, 'create', 'exam', data.id,
        null, data, 'ada-ai', request.request_id,
        request.transaction_id, request.idempotency_key
      );

      return { success: true, data, entity_id: data.id };
    }

    case 'update': {
      const { data: beforeData } = await supabase
        .from('exams')
        .select('*')
        .eq('id', payload.id)
        .eq('user_id', userId)
        .single();

      if (!beforeData) {
        return { success: false, error: 'Exam not found', error_code: 'NOT_FOUND' };
      }

      const updates: any = {};
      if (payload.title) updates.title = payload.title;
      if (payload.exam_date) updates.exam_date = payload.exam_date;
      if (payload.duration_minutes) updates.duration_minutes = payload.duration_minutes;
      if (payload.location !== undefined) updates.location = payload.location;
      if (payload.notes !== undefined) updates.notes = payload.notes;

      const { data, error } = await supabase
        .from('exams')
        .update(updates)
        .eq('id', payload.id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      await createAuditLog(
        supabase, userId, 'update', 'exam', data.id,
        beforeData, data, 'ada-ai', request.request_id,
        request.transaction_id, request.idempotency_key
      );

      return { success: true, data, entity_id: data.id };
    }

    case 'delete': {
      const { data: beforeData } = await supabase
        .from('exams')
        .select('*')
        .eq('id', payload.id)
        .eq('user_id', userId)
        .single();

      if (!beforeData) {
        return { success: false, error: 'Exam not found', error_code: 'NOT_FOUND' };
      }

      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', payload.id)
        .eq('user_id', userId);

      if (error) throw error;

      await createAuditLog(
        supabase, userId, 'delete', 'exam', payload.id,
        beforeData, null, 'ada-ai', request.request_id,
        request.transaction_id, request.idempotency_key
      );

      return { success: true, entity_id: payload.id };
    }

    case 'read': {
      let query = supabase
        .from('exams')
        .select('*, courses(name)')
        .eq('user_id', userId);

      if (payload.id) {
        query = query.eq('id', payload.id);
      }
      if (payload.course_id) {
        query = query.eq('course_id', payload.course_id);
      }

      const { data, error } = payload.id 
        ? await query.single()
        : await query.order('exam_date', { ascending: true });

      if (error && error.code !== 'PGRST116') throw error;

      return { success: true, data: data || [] };
    }

    default:
      return { success: false, error: `Unknown action: ${action}`, error_code: 'UNKNOWN_ACTION' };
  }
}

// =============================================================================
// STUDY SESSION WORKER
// =============================================================================

async function handleStudySessionAction(
  supabase: any,
  userId: string,
  action: string,
  payload: any,
  request: AgentRequest
): Promise<AgentResponse> {
  switch (action) {
    case 'create': {
      const insertData = {
        user_id: userId,
        title: payload.title,
        scheduled_start: payload.scheduled_start,
        scheduled_end: payload.scheduled_end,
        course_id: payload.course_id || null,
        assignment_id: payload.assignment_id || null,
        exam_id: payload.exam_id || null,
        status: 'scheduled',
        notes: payload.notes || null
      };

      const { data, error } = await supabase
        .from('study_sessions')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      await createAuditLog(
        supabase, userId, 'create', 'study_session', data.id,
        null, data, 'ada-ai', request.request_id,
        request.transaction_id, request.idempotency_key
      );

      return { success: true, data, entity_id: data.id };
    }

    case 'update': {
      const { data: beforeData } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('id', payload.id)
        .eq('user_id', userId)
        .single();

      if (!beforeData) {
        return { success: false, error: 'Study session not found', error_code: 'NOT_FOUND' };
      }

      const updates: any = {};
      if (payload.title) updates.title = payload.title;
      if (payload.scheduled_start) updates.scheduled_start = payload.scheduled_start;
      if (payload.scheduled_end) updates.scheduled_end = payload.scheduled_end;
      if (payload.status) updates.status = payload.status;
      if (payload.notes !== undefined) updates.notes = payload.notes;

      const { data, error } = await supabase
        .from('study_sessions')
        .update(updates)
        .eq('id', payload.id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      await createAuditLog(
        supabase, userId, 'update', 'study_session', data.id,
        beforeData, data, 'ada-ai', request.request_id,
        request.transaction_id, request.idempotency_key
      );

      return { success: true, data, entity_id: data.id };
    }

    case 'delete': {
      const { data: beforeData } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('id', payload.id)
        .eq('user_id', userId)
        .single();

      if (!beforeData) {
        return { success: false, error: 'Study session not found', error_code: 'NOT_FOUND' };
      }

      const { error } = await supabase
        .from('study_sessions')
        .delete()
        .eq('id', payload.id)
        .eq('user_id', userId);

      if (error) throw error;

      await createAuditLog(
        supabase, userId, 'delete', 'study_session', payload.id,
        beforeData, null, 'ada-ai', request.request_id,
        request.transaction_id, request.idempotency_key
      );

      return { success: true, entity_id: payload.id };
    }

    case 'read': {
      let query = supabase
        .from('study_sessions')
        .select('*, courses(name)')
        .eq('user_id', userId);

      if (payload.id) {
        query = query.eq('id', payload.id);
      }
      if (payload.course_id) {
        query = query.eq('course_id', payload.course_id);
      }
      if (payload.status) {
        query = query.eq('status', payload.status);
      }

      const { data, error } = payload.id 
        ? await query.single()
        : await query.order('scheduled_start', { ascending: true });

      if (error && error.code !== 'PGRST116') throw error;

      return { success: true, data: data || [] };
    }

    default:
      return { success: false, error: `Unknown action: ${action}`, error_code: 'UNKNOWN_ACTION' };
  }
}

// =============================================================================
// COURSE WORKER
// =============================================================================

async function handleCourseAction(
  supabase: any,
  userId: string,
  action: string,
  payload: any,
  request: AgentRequest
): Promise<AgentResponse> {
  switch (action) {
    case 'create': {
      // Get or create default semester
      let semesterId = payload.semester_id;
      if (!semesterId) {
        const { data: semesters } = await supabase
          .from('semesters')
          .select('id')
          .eq('user_id', userId)
          .eq('is_active', true)
          .limit(1);
        
        if (semesters && semesters.length > 0) {
          semesterId = semesters[0].id;
        } else {
          const { data: newSemester } = await supabase
            .from('semesters')
            .insert({
              user_id: userId,
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

      const insertData = {
        user_id: userId,
        semester_id: semesterId,
        name: payload.name,
        code: payload.code || null,
        credits: payload.credits || 3,
        instructor: payload.instructor || null,
        color: payload.color || 'blue',
        target_grade: payload.target_grade || null,
        is_active: true
      };

      const { data, error } = await supabase
        .from('courses')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      await createAuditLog(
        supabase, userId, 'create', 'course', data.id,
        null, data, 'ada-ai', request.request_id,
        request.transaction_id, request.idempotency_key
      );

      return { success: true, data, entity_id: data.id };
    }

    case 'update': {
      const { data: beforeData } = await supabase
        .from('courses')
        .select('*')
        .eq('id', payload.id)
        .eq('user_id', userId)
        .single();

      if (!beforeData) {
        return { success: false, error: 'Course not found', error_code: 'NOT_FOUND' };
      }

      const updates: any = {};
      if (payload.name) updates.name = payload.name;
      if (payload.code !== undefined) updates.code = payload.code;
      if (payload.credits !== undefined) updates.credits = payload.credits;
      if (payload.instructor !== undefined) updates.instructor = payload.instructor;
      if (payload.color) updates.color = payload.color;
      if (payload.target_grade !== undefined) updates.target_grade = payload.target_grade;

      const { data, error } = await supabase
        .from('courses')
        .update(updates)
        .eq('id', payload.id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      await createAuditLog(
        supabase, userId, 'update', 'course', data.id,
        beforeData, data, 'ada-ai', request.request_id,
        request.transaction_id, request.idempotency_key
      );

      return { success: true, data, entity_id: data.id };
    }

    case 'delete': {
      const { data: beforeData } = await supabase
        .from('courses')
        .select('*')
        .eq('id', payload.id)
        .eq('user_id', userId)
        .single();

      if (!beforeData) {
        return { success: false, error: 'Course not found', error_code: 'NOT_FOUND' };
      }

      // Soft delete
      const { error } = await supabase
        .from('courses')
        .update({ is_active: false })
        .eq('id', payload.id)
        .eq('user_id', userId);

      if (error) throw error;

      await createAuditLog(
        supabase, userId, 'delete', 'course', payload.id,
        beforeData, { ...beforeData, is_active: false }, 'ada-ai',
        request.request_id, request.transaction_id, request.idempotency_key
      );

      return { success: true, entity_id: payload.id };
    }

    case 'read': {
      let query = supabase
        .from('courses')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (payload.id) {
        query = query.eq('id', payload.id);
      }

      const { data, error } = payload.id 
        ? await query.single()
        : await query.order('name', { ascending: true });

      if (error && error.code !== 'PGRST116') throw error;

      return { success: true, data: data || [] };
    }

    default:
      return { success: false, error: `Unknown action: ${action}`, error_code: 'UNKNOWN_ACTION' };
  }
}

// =============================================================================
// CORNELL NOTES WORKER
// =============================================================================

async function handleCornellNotesAction(
  supabase: any,
  userId: string,
  action: string,
  payload: any,
  request: AgentRequest
): Promise<AgentResponse> {
  console.log(`[CornellNotes Worker] Action: ${action}, User: ${userId}`);

  switch (action) {
    case 'create': {
      const { topic, fileContent, fileName, filePrompt, depthLevel } = payload;

      try {
        const response = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-notes-orchestrator`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            },
            body: JSON.stringify({
              topic,
              fileContent,
              fileName,
              filePrompt,
              depthLevel: depthLevel || 'standard',
            }),
          }
        );

        const result = await response.json();

        if (!result.success) {
          return { success: false, error: result.error };
        }

        await createAuditLog(
          supabase, userId, 'create', 'cornell_notes', null,
          null, result.data, 'ada-ai', request.request_id,
          request.transaction_id, request.idempotency_key
        );

        return {
          success: true,
          data: result.data,
        };
      } catch (error) {
        console.error('[CornellNotes Worker] Generation failed:', error);
        return { success: false, error: 'Failed to generate Cornell Notes' };
      }
    }

    case 'read': {
      return { success: true, data: [], error: 'Cornell Notes history not yet implemented' };
    }

    case 'update': {
      return { success: false, error: 'Cornell Notes update not yet implemented' };
    }

    case 'delete': {
      return { success: false, error: 'Cornell Notes delete not yet implemented' };
    }

    default:
      return { success: false, error: `Unknown action: ${action}`, error_code: 'UNKNOWN_ACTION' };
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized', error_code: 'AUTH_REQUIRED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token', error_code: 'INVALID_TOKEN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const request: AgentRequest = {
      user_id: user.id,
      intent: body.intent || `${body.action}_${body.entity_type}`,
      entity_type: body.entity_type,
      action: body.action,
      payload: body.payload || {},
      request_id: body.request_id || crypto.randomUUID(),
      idempotency_key: body.idempotency_key,
      transaction_id: body.transaction_id
    };

    console.log('Master Agent received request:', {
      intent: request.intent,
      entity_type: request.entity_type,
      action: request.action,
      request_id: request.request_id
    });

    // Check idempotency
    if (request.idempotency_key && request.action !== 'read') {
      const { exists, result } = await checkIdempotency(supabase, request.idempotency_key);
      if (exists) {
        console.log('Returning cached result for idempotency key:', request.idempotency_key);
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Route to worker
    const response = await routeToWorker(supabase, request);

    console.log('Master Agent response:', {
      success: response.success,
      entity_id: response.entity_id,
      error: response.error
    });

    return new Response(
      JSON.stringify(response),
      { 
        status: response.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Master Agent error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        error_code: 'INTERNAL_ERROR' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
