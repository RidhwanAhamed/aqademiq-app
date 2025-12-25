-- =====================================================
-- Security Fix: OAuth State Validation + Search Path Hardening
-- =====================================================

-- 1. Create oauth_state_tokens table for proper CSRF protection
CREATE TABLE IF NOT EXISTS public.oauth_state_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  state_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.oauth_state_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies for oauth_state_tokens
CREATE POLICY "Users can manage their own state tokens"
  ON public.oauth_state_tokens
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all tokens"
  ON public.oauth_state_tokens
  FOR ALL
  USING (auth.role() = 'service_role');

-- Index for faster lookups
CREATE INDEX idx_oauth_state_tokens_lookup 
  ON public.oauth_state_tokens(state_token, user_id, used, expires_at);

-- Index for cleanup
CREATE INDEX idx_oauth_state_tokens_cleanup 
  ON public.oauth_state_tokens(expires_at) WHERE used = FALSE;

-- 2. Function to create OAuth state token
CREATE OR REPLACE FUNCTION public.create_oauth_state_token(
  p_user_id UUID,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_state_token TEXT;
BEGIN
  -- Generate cryptographically secure state token
  v_state_token := encode(gen_random_bytes(32), 'hex');
  
  -- Insert the token
  INSERT INTO public.oauth_state_tokens (
    user_id, state_token, expires_at, ip_address, user_agent
  ) VALUES (
    p_user_id,
    v_state_token,
    NOW() + INTERVAL '10 minutes',
    p_ip_address,
    p_user_agent
  );
  
  -- Log security event
  PERFORM public.log_security_event(
    'oauth_state_created',
    'oauth_tokens',
    NULL,
    jsonb_build_object(
      'user_id', p_user_id,
      'expires_in_minutes', 10,
      'timestamp', now()
    ),
    p_ip_address,
    p_user_agent
  );
  
  RETURN v_state_token;
END;
$$;

-- 3. Fix validate_oauth_state to actually validate against stored tokens
CREATE OR REPLACE FUNCTION public.validate_oauth_state(
  p_user_id UUID,
  p_state_token TEXT,
  p_max_age_minutes INTEGER DEFAULT 10
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_token_record RECORD;
BEGIN
  -- Basic validation
  IF p_state_token IS NULL OR length(p_state_token) < 32 THEN
    PERFORM public.log_security_event(
      'oauth_state_invalid_format',
      'oauth_tokens',
      NULL,
      jsonb_build_object(
        'user_id', p_user_id,
        'reason', 'invalid_format',
        'timestamp', now()
      )
    );
    RETURN FALSE;
  END IF;
  
  -- Look up the state token
  SELECT * INTO v_token_record
  FROM public.oauth_state_tokens
  WHERE state_token = p_state_token
    AND user_id = p_user_id
    AND used = FALSE
    AND expires_at > NOW()
    AND created_at > NOW() - (p_max_age_minutes || ' minutes')::INTERVAL;
  
  IF NOT FOUND THEN
    -- Log failed validation attempt
    PERFORM public.log_security_event(
      'oauth_state_validation_failed',
      'oauth_tokens',
      NULL,
      jsonb_build_object(
        'user_id', p_user_id,
        'reason', 'token_not_found_or_expired',
        'timestamp', now()
      )
    );
    RETURN FALSE;
  END IF;
  
  -- Mark token as used (one-time use)
  UPDATE public.oauth_state_tokens
  SET used = TRUE
  WHERE id = v_token_record.id;
  
  -- Log successful validation
  PERFORM public.log_security_event(
    'oauth_state_validated',
    'oauth_tokens',
    NULL,
    jsonb_build_object(
      'user_id', p_user_id,
      'token_age_seconds', EXTRACT(EPOCH FROM (NOW() - v_token_record.created_at)),
      'timestamp', now()
    )
  );
  
  RETURN TRUE;
END;
$$;

-- 4. Function to cleanup expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.oauth_state_tokens
  WHERE expires_at < NOW() - INTERVAL '1 hour'
     OR (used = TRUE AND created_at < NOW() - INTERVAL '1 day');
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- =====================================================
-- 5. Fix all SECURITY DEFINER functions with search_path
-- =====================================================

-- Fix mask_sensitive_data
CREATE OR REPLACE FUNCTION public.mask_sensitive_data(input_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF input_text IS NULL OR length(input_text) <= 4 THEN
    RETURN '***';
  END IF;
  RETURN substring(input_text, 1, 2) || '***' || substring(input_text, length(input_text) - 1);
END;
$$;

-- Fix audit_profile_access
CREATE OR REPLACE FUNCTION public.audit_profile_access(
  p_action text, 
  p_user_id uuid, 
  p_accessed_profile_id uuid, 
  p_fields_accessed jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM public.log_security_event(
    p_action,
    'user_profile',
    p_accessed_profile_id,
    jsonb_build_object(
      'accessing_user', p_user_id,
      'fields_accessed', p_fields_accessed,
      'timestamp', now(),
      'masked_email', public.mask_sensitive_data(
        (SELECT email FROM public.profiles WHERE user_id = p_accessed_profile_id)
      )
    )
  );
END;
$$;

-- Fix calculate_goal_achievement_probability
CREATE OR REPLACE FUNCTION public.calculate_goal_achievement_probability(p_goal_id uuid)
RETURNS TABLE(goal_id uuid, probability_percentage integer, risk_level text, recommended_actions jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  goal_record RECORD;
  days_remaining INTEGER;
  progress_rate NUMERIC;
  required_rate NUMERIC;
  probability INTEGER;
  risk_text TEXT;
  actions JSONB;
BEGIN
  SELECT * INTO goal_record FROM public.academic_goals WHERE id = p_goal_id;
  IF NOT FOUND THEN RETURN; END IF;
  
  days_remaining := GREATEST((goal_record.target_date::date - CURRENT_DATE), 1);
  progress_rate := CASE 
    WHEN EXTRACT(DAYS FROM (now() - goal_record.created_at)) > 0 
    THEN goal_record.current_value / EXTRACT(DAYS FROM (now() - goal_record.created_at))
    ELSE 0 
  END;
  required_rate := CASE WHEN days_remaining > 0 THEN (goal_record.target_value - goal_record.current_value) / days_remaining ELSE 999999 END;
  
  IF goal_record.current_value >= goal_record.target_value THEN
    probability := 100; risk_text := 'achieved';
  ELSIF progress_rate >= required_rate THEN
    probability := LEAST(95, 60 + ROUND((progress_rate / required_rate) * 35));
    risk_text := CASE WHEN probability >= 80 THEN 'low' WHEN probability >= 60 THEN 'medium' ELSE 'high' END;
  ELSE
    probability := GREATEST(5, ROUND((progress_rate / required_rate) * 60));
    risk_text := CASE WHEN probability >= 40 THEN 'medium' ELSE 'high' END;
  END IF;
  
  actions := jsonb_build_array();
  IF probability < 70 THEN
    CASE goal_record.goal_type
      WHEN 'gpa_target' THEN actions := jsonb_build_array('Schedule additional study sessions', 'Meet with professors during office hours', 'Form study groups with classmates', 'Consider tutoring for challenging subjects');
      WHEN 'study_hours' THEN actions := jsonb_build_array('Block more time in your calendar for studying', 'Use the Pomodoro technique for better focus', 'Find a dedicated study environment', 'Set daily study hour minimums');
      WHEN 'assignment_completion' THEN actions := jsonb_build_array('Create a detailed assignment schedule', 'Break large assignments into smaller tasks', 'Set earlier personal deadlines', 'Use project management tools');
      ELSE actions := jsonb_build_array('Review your goal timeline', 'Increase daily effort towards this goal', 'Consider adjusting the target if unrealistic', 'Seek help from mentors or advisors');
    END CASE;
  END IF;
  
  RETURN QUERY SELECT p_goal_id, probability, risk_text, actions;
END;
$$;

-- Fix delete_user_google_tokens
CREATE OR REPLACE FUNCTION public.delete_user_google_tokens(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM public.log_security_event(
    'google_tokens_deleted',
    'oauth_tokens',
    NULL,
    jsonb_build_object('user_id', p_user_id, 'deleted_by', 'edge_function', 'timestamp', now())
  );
  DELETE FROM public.google_tokens WHERE user_id = p_user_id;
  RETURN FOUND;
END;
$$;

-- Fix decrypt_token
CREATE OR REPLACE FUNCTION public.decrypt_token(p_encrypted_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN convert_from(decode(p_encrypted_token, 'base64'), 'UTF8');
EXCEPTION
  WHEN OTHERS THEN RETURN p_encrypted_token;
END;
$$;

-- Fix encrypt_token
CREATE OR REPLACE FUNCTION public.encrypt_token(p_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN encode(p_token::bytea, 'base64');
END;
$$;

-- Fix generate_sync_hash
CREATE OR REPLACE FUNCTION public.generate_sync_hash(entity_type text, entity_data jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN encode(sha256(entity_type::bytea || entity_data::text::bytea), 'hex');
END;
$$;

-- Fix check_operation_rate_limit
CREATE OR REPLACE FUNCTION public.check_operation_rate_limit(
  p_user_id uuid, 
  p_operation_type text, 
  p_max_operations integer DEFAULT 10, 
  p_window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  operation_count INTEGER;
  window_start TIMESTAMP;
BEGIN
  window_start := now() - (p_window_minutes || ' minutes')::INTERVAL;
  SELECT COUNT(*) INTO operation_count FROM public.security_audit_log
  WHERE user_id = p_user_id AND action = p_operation_type AND created_at >= window_start;
  
  IF operation_count >= p_max_operations THEN
    PERFORM public.log_security_event(
      'rate_limit_exceeded', 'security_control', NULL,
      jsonb_build_object('operation_type', p_operation_type, 'count', operation_count, 'limit', p_max_operations, 'window_minutes', p_window_minutes, 'timestamp', now())
    );
    RETURN FALSE;
  END IF;
  RETURN TRUE;
END;
$$;

-- Fix email_exists
CREATE OR REPLACE FUNCTION public.email_exists(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE lower(email) = lower(p_email));
END;
$$;

-- Fix get_daily_token_usage
CREATE OR REPLACE FUNCTION public.get_daily_token_usage(p_user_id uuid)
RETURNS TABLE(total_tokens_today bigint, remaining_tokens bigint, is_limit_exceeded boolean, resets_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  daily_limit CONSTANT INTEGER := 50000;
  today_start TIMESTAMPTZ;
  used_tokens BIGINT;
BEGIN
  today_start := date_trunc('day', now() AT TIME ZONE 'UTC');
  SELECT COALESCE(SUM(total_tokens), 0) INTO used_tokens FROM public.ai_token_usage WHERE user_id = p_user_id AND created_at >= today_start;
  RETURN QUERY SELECT used_tokens, GREATEST(0::BIGINT, daily_limit - used_tokens), used_tokens >= daily_limit, (today_start + INTERVAL '1 day') AS resets_at;
END;
$$;

-- Fix get_marketplace_early_access_count
CREATE OR REPLACE FUNCTION public.get_marketplace_early_access_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN (SELECT COUNT(*)::INTEGER FROM public.marketplace_early_access);
END;
$$;

-- Fix get_public_profile
CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id uuid)
RETURNS TABLE(user_id uuid, full_name text, study_streak integer, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY SELECT p.user_id, p.full_name, p.study_streak, p.created_at FROM public.profiles p WHERE p.user_id = p_user_id;
END;
$$;

-- Fix get_user_google_tokens
CREATE OR REPLACE FUNCTION public.get_user_google_tokens(p_user_id uuid)
RETURNS TABLE(access_token text, refresh_token text, expires_at timestamp with time zone, scope text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM public.log_security_event(
    'google_tokens_accessed', 'oauth_tokens', NULL,
    jsonb_build_object('user_id', p_user_id, 'accessed_by', 'edge_function', 'decrypted', true, 'timestamp', now())
  );
  RETURN QUERY SELECT public.decrypt_token(gt.access_token), public.decrypt_token(gt.refresh_token), gt.expires_at, gt.scope
  FROM public.google_tokens gt WHERE gt.user_id = p_user_id;
END;
$$;

-- Fix has_google_tokens
CREATE OR REPLACE FUNCTION public.has_google_tokens(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.uid() != p_user_id THEN RETURN false; END IF;
  RETURN EXISTS (SELECT 1 FROM public.google_tokens WHERE user_id = p_user_id AND expires_at > now());
END;
$$;

-- Fix insert_user_google_tokens
CREATE OR REPLACE FUNCTION public.insert_user_google_tokens(
  p_user_id uuid, p_access_token text, p_refresh_token text, p_expires_at timestamp with time zone, p_scope text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM public.log_security_event(
    'google_tokens_created', 'oauth_tokens', NULL,
    jsonb_build_object('user_id', p_user_id, 'created_by', 'edge_function', 'encrypted', true, 'timestamp', now())
  );
  INSERT INTO public.google_tokens (user_id, access_token, refresh_token, expires_at, scope)
  VALUES (p_user_id, public.encrypt_token(p_access_token), public.encrypt_token(p_refresh_token), p_expires_at, p_scope)
  ON CONFLICT (user_id) DO UPDATE SET
    access_token = public.encrypt_token(p_access_token),
    refresh_token = public.encrypt_token(p_refresh_token),
    expires_at = EXCLUDED.expires_at,
    scope = EXCLUDED.scope,
    updated_at = now();
  RETURN TRUE;
END;
$$;

-- Fix log_security_event (function version)
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action text, p_resource_type text, p_resource_id uuid DEFAULT NULL, 
  p_details jsonb DEFAULT '{}'::jsonb, p_ip_address inet DEFAULT NULL, p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.security_audit_log (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
  VALUES (auth.uid(), p_action, p_resource_type, p_resource_id, p_details, p_ip_address, p_user_agent);
END;
$$;

-- Fix monitor_suspicious_activity
CREATE OR REPLACE FUNCTION public.monitor_suspicious_activity(p_user_id uuid DEFAULT NULL)
RETURNS TABLE(alert_type text, alert_message text, risk_score integer, event_count integer, last_occurrence timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 'excessive_oauth_attempts'::TEXT, 'Multiple OAuth attempts detected'::TEXT, CASE WHEN COUNT(*) > 10 THEN 9 ELSE 5 END, COUNT(*)::INTEGER, MAX(created_at)
  FROM public.security_audit_log WHERE (p_user_id IS NULL OR user_id = p_user_id) AND action LIKE '%oauth%' AND created_at >= now() - INTERVAL '1 hour'
  HAVING COUNT(*) > 5;
  
  RETURN QUERY
  SELECT 'suspicious_token_access'::TEXT, 'Unusual token access patterns detected'::TEXT, 8, COUNT(*)::INTEGER, MAX(created_at)
  FROM public.security_audit_log WHERE (p_user_id IS NULL OR user_id = p_user_id) AND action IN ('google_tokens_accessed', 'google_tokens_updated') AND created_at >= now() - INTERVAL '1 hour'
  HAVING COUNT(*) > 20;
END;
$$;

-- Fix revoke_google_tokens
CREATE OR REPLACE FUNCTION public.revoke_google_tokens(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.uid() != p_user_id THEN RETURN false; END IF;
  DELETE FROM public.google_tokens WHERE user_id = p_user_id;
  PERFORM public.log_security_event('google_tokens_revoked', 'oauth_tokens', NULL, jsonb_build_object('user_id', p_user_id));
  RETURN true;
END;
$$;

-- Fix update_user_google_tokens
CREATE OR REPLACE FUNCTION public.update_user_google_tokens(
  p_user_id uuid, p_access_token text, p_refresh_token text DEFAULT NULL, p_expires_at timestamp with time zone DEFAULT NULL, p_scope text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM public.log_security_event(
    'google_tokens_updated', 'oauth_tokens', NULL,
    jsonb_build_object('user_id', p_user_id, 'updated_by', 'edge_function', 'timestamp', now())
  );
  UPDATE public.google_tokens SET
    access_token = public.encrypt_token(p_access_token),
    refresh_token = COALESCE(public.encrypt_token(p_refresh_token), refresh_token),
    expires_at = COALESCE(p_expires_at, expires_at),
    scope = COALESCE(p_scope, scope),
    updated_at = now()
  WHERE user_id = p_user_id;
  RETURN FOUND;
END;
$$;

-- Fix user_has_marketplace_early_access
CREATE OR REPLACE FUNCTION public.user_has_marketplace_early_access(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.uid() != p_user_id THEN RETURN false; END IF;
  RETURN EXISTS (SELECT 1 FROM public.marketplace_early_access WHERE user_id = p_user_id);
END;
$$;

-- Fix forecast_grade_trend
CREATE OR REPLACE FUNCTION public.forecast_grade_trend(p_user_id uuid, p_course_id uuid DEFAULT NULL)
RETURNS TABLE(course_id uuid, course_name text, current_average numeric, projected_30_days numeric, projected_semester_end numeric, trend_direction text, confidence_level text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  course_record RECORD;
BEGIN
  FOR course_record IN SELECT c.id, c.name FROM public.courses c WHERE c.user_id = p_user_id AND c.is_active = true AND (p_course_id IS NULL OR c.id = p_course_id)
  LOOP
    DECLARE
      recent_grades NUMERIC[];
      grade_dates DATE[];
      avg_grade NUMERIC;
      trend_slope NUMERIC;
      proj_30 NUMERIC;
      proj_semester NUMERIC;
      trend_dir TEXT;
      confidence TEXT;
    BEGIN
      SELECT array_agg(CASE WHEN combined_grades.grade_total > 0 THEN (combined_grades.grade_points / combined_grades.grade_total) * 10 ELSE NULL END ORDER BY combined_grades.created_at),
             array_agg(combined_grades.created_at::date ORDER BY combined_grades.created_at)
      INTO recent_grades, grade_dates
      FROM (
        SELECT a.grade_points, a.grade_total, a.created_at FROM public.assignments a WHERE a.course_id = course_record.id AND a.grade_points IS NOT NULL AND a.created_at >= CURRENT_DATE - INTERVAL '30 days'
        UNION ALL
        SELECT e.grade_points, e.grade_total, e.created_at FROM public.exams e WHERE e.course_id = course_record.id AND e.grade_points IS NOT NULL AND e.created_at >= CURRENT_DATE - INTERVAL '30 days'
      ) combined_grades;
      
      IF recent_grades IS NOT NULL AND array_length(recent_grades, 1) > 0 THEN
        SELECT AVG(grade) INTO avg_grade FROM unnest(recent_grades) AS grade WHERE grade IS NOT NULL;
        IF array_length(recent_grades, 1) >= 2 THEN
          trend_slope := recent_grades[array_length(recent_grades, 1)] - recent_grades[1];
          proj_30 := GREATEST(0, LEAST(10, avg_grade + (trend_slope * 0.5)));
          proj_semester := GREATEST(0, LEAST(10, avg_grade + (trend_slope * 2)));
          IF trend_slope > 0.3 THEN trend_dir := 'improving'; ELSIF trend_slope < -0.3 THEN trend_dir := 'declining'; ELSE trend_dir := 'stable'; END IF;
          IF array_length(recent_grades, 1) >= 5 THEN confidence := 'high'; ELSIF array_length(recent_grades, 1) >= 3 THEN confidence := 'medium'; ELSE confidence := 'low'; END IF;
        ELSE
          proj_30 := avg_grade; proj_semester := avg_grade; trend_dir := 'stable'; confidence := 'low';
        END IF;
        RETURN QUERY SELECT course_record.id, course_record.name, ROUND(avg_grade, 2), ROUND(proj_30, 2), ROUND(proj_semester, 2), trend_dir, confidence;
      END IF;
    END;
  END LOOP;
END;
$$;

-- Fix detect_performance_risks
CREATE OR REPLACE FUNCTION public.detect_performance_risks(p_user_id uuid)
RETURNS TABLE(risk_type text, severity text, description text, affected_courses text[], recommended_actions jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  declining_courses TEXT[];
  overdue_assignments INTEGER;
  low_study_hours INTEGER;
BEGIN
  SELECT array_agg(f.course_name) INTO declining_courses FROM public.forecast_grade_trend(p_user_id) f WHERE f.trend_direction = 'declining' AND f.confidence_level IN ('medium', 'high');
  SELECT COUNT(*) INTO overdue_assignments FROM public.assignments a WHERE a.user_id = p_user_id AND a.due_date < now() AND NOT a.is_completed;
  SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (s.actual_end - s.actual_start)) / 3600), 0) INTO low_study_hours FROM public.study_sessions s WHERE s.user_id = p_user_id AND s.actual_start >= CURRENT_DATE - INTERVAL '7 days' AND s.status = 'completed';
  
  IF declining_courses IS NOT NULL AND array_length(declining_courses, 1) > 0 THEN
    RETURN QUERY SELECT 'declining_grades'::text, CASE WHEN array_length(declining_courses, 1) >= 3 THEN 'high' ELSE 'medium' END, 'Multiple courses showing declining grade trends'::text, declining_courses, jsonb_build_array('Schedule study sessions for affected courses', 'Meet with instructors to discuss performance', 'Consider forming study groups', 'Review study methods and techniques');
  END IF;
  IF overdue_assignments >= 3 THEN
    RETURN QUERY SELECT 'overdue_assignments'::text, CASE WHEN overdue_assignments >= 5 THEN 'high' ELSE 'medium' END, format('You have %s overdue assignments', overdue_assignments), ARRAY[]::text[], jsonb_build_array('Create a catch-up schedule for overdue work', 'Prioritize assignments by due date and weight', 'Consider speaking with instructors about extensions', 'Set up automatic reminders for future assignments');
  END IF;
  IF low_study_hours < 5 THEN
    RETURN QUERY SELECT 'insufficient_study_time'::text, CASE WHEN low_study_hours < 2 THEN 'high' ELSE 'medium' END, format('Only %s study hours logged this week', low_study_hours), ARRAY[]::text[], jsonb_build_array('Schedule dedicated study blocks in your calendar', 'Set a minimum daily study goal', 'Use the Pomodoro technique for focused sessions', 'Find a consistent study environment');
  END IF;
END;
$$;

-- Fix search_documents
CREATE OR REPLACE FUNCTION public.search_documents(
  p_user_id uuid, p_query_embedding extensions.vector, p_match_threshold double precision DEFAULT 0.7, p_match_count integer DEFAULT 5, p_course_id uuid DEFAULT NULL
)
RETURNS TABLE(id uuid, content text, similarity double precision, metadata jsonb, source_type text, course_id uuid, file_upload_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT de.id, de.content, 1 - (de.embedding <=> p_query_embedding) AS similarity, de.metadata, de.source_type, de.course_id, de.file_upload_id
  FROM public.document_embeddings de
  WHERE de.user_id = p_user_id AND (p_course_id IS NULL OR de.course_id = p_course_id) AND 1 - (de.embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY de.embedding <=> p_query_embedding LIMIT p_match_count;
END;
$$;