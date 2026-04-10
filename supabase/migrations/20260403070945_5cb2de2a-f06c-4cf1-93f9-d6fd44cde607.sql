
-- Create a SECURITY DEFINER function that hard-deletes ALL user data across all tables.
-- This handles the correct dependency order to avoid FK violations.
-- Called by the delete-account edge function after verifying the user's identity.

CREATE OR REPLACE FUNCTION public.hard_delete_user_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_counts jsonb := '{}'::jsonb;
  row_count integer;
BEGIN
  -- Validate input
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id is required';
  END IF;

  -- ========================================
  -- PHASE 1: Delete leaf tables (no dependents)
  -- ========================================

  -- AI & Chat
  DELETE FROM public.chat_messages WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('chat_messages', row_count);

  DELETE FROM public.conversation_context WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('conversation_context', row_count);

  DELETE FROM public.ai_insights_history WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('ai_insights_history', row_count);

  DELETE FROM public.ai_token_usage WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('ai_token_usage', row_count);

  -- Nudge & Notifications
  DELETE FROM public.nudge_history WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('nudge_history', row_count);

  DELETE FROM public.notification_queue WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('notification_queue', row_count);

  DELETE FROM public.notification_preferences WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('notification_preferences', row_count);

  -- Google / Sync
  DELETE FROM public.sync_conflicts WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('sync_conflicts', row_count);

  DELETE FROM public.sync_operations WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('sync_operations', row_count);

  DELETE FROM public.sync_job_queue WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('sync_job_queue', row_count);

  DELETE FROM public.google_event_mappings WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('google_event_mappings', row_count);

  DELETE FROM public.google_calendar_channels WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('google_calendar_channels', row_count);

  DELETE FROM public.google_sync_tokens WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('google_sync_tokens', row_count);

  DELETE FROM public.google_calendar_settings WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('google_calendar_settings', row_count);

  DELETE FROM public.google_tokens WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('google_tokens', row_count);

  -- Security & Audit
  DELETE FROM public.oauth_state_tokens WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('oauth_state_tokens', row_count);

  DELETE FROM public.security_audit_log WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('security_audit_log', row_count);

  DELETE FROM public.audit_log WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('audit_log', row_count);

  -- Marketplace
  DELETE FROM public.marketplace_early_access WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('marketplace_early_access', row_count);

  -- Study & Analytics
  DELETE FROM public.study_session_analytics WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('study_session_analytics', row_count);

  DELETE FROM public.study_session_templates WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('study_session_templates', row_count);

  DELETE FROM public.performance_analytics WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('performance_analytics', row_count);

  DELETE FROM public.academic_insights WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('academic_insights', row_count);

  DELETE FROM public.academic_goals WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('academic_goals', row_count);

  DELETE FROM public.academic_sync_preferences WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('academic_sync_preferences', row_count);

  -- Cornell Notes
  DELETE FROM public.cornell_notes WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('cornell_notes', row_count);

  -- Document Embeddings (vectors)
  DELETE FROM public.document_embeddings WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('document_embeddings', row_count);

  -- Proposed schedules
  DELETE FROM public.proposed_schedules WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('proposed_schedules', row_count);

  -- Token whitelist
  DELETE FROM public.token_whitelist WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('token_whitelist', row_count);

  -- Holiday periods
  DELETE FROM public.holiday_periods WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('holiday_periods', row_count);

  -- User stats
  DELETE FROM public.user_stats WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('user_stats', row_count);

  -- ========================================
  -- PHASE 2: Delete tables with FK dependencies (correct order)
  -- ========================================

  -- Tasks (depends on assignments)
  DELETE FROM public.tasks WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('tasks', row_count);

  -- Reminders (depends on assignments, exams, schedule_blocks)
  DELETE FROM public.reminders WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('reminders', row_count);

  -- Revision tasks (depends on assignments, exams)
  DELETE FROM public.revision_tasks WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('revision_tasks', row_count);

  -- Study sessions (depends on assignments, exams, courses)
  DELETE FROM public.study_sessions WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('study_sessions', row_count);

  -- File uploads (depends on courses)
  DELETE FROM public.file_uploads WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('file_uploads', row_count);

  -- Assignments (depends on courses, exams)
  DELETE FROM public.assignments WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('assignments', row_count);

  -- Exams (depends on courses)
  DELETE FROM public.exams WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('exams', row_count);

  -- Schedule blocks (depends on courses)
  DELETE FROM public.schedule_blocks WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('schedule_blocks', row_count);

  -- Courses (depends on semesters)
  DELETE FROM public.courses WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('courses', row_count);

  -- Semesters
  DELETE FROM public.semesters WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('semesters', row_count);

  -- ========================================
  -- PHASE 3: Delete profile (last)
  -- ========================================
  DELETE FROM public.profiles WHERE user_id = p_user_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('profiles', row_count);

  RETURN deleted_counts;
END;
$$;
