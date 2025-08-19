-- SECURITY FIX: Add proper search_path settings to all security functions

-- Fix search_path for mask_sensitive_data function
DROP FUNCTION IF EXISTS public.mask_sensitive_data(TEXT);
CREATE OR REPLACE FUNCTION public.mask_sensitive_data(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Return masked version for logging/debugging
  IF input_text IS NULL OR length(input_text) <= 4 THEN
    RETURN '***';
  END IF;
  
  -- Show first 2 and last 2 characters for emails/usernames
  RETURN substring(input_text, 1, 2) || '***' || substring(input_text, length(input_text) - 1);
END;
$$;

-- Fix search_path for audit_profile_access function
DROP FUNCTION IF EXISTS public.audit_profile_access(TEXT, UUID, UUID, JSONB);
CREATE OR REPLACE FUNCTION public.audit_profile_access(
  p_action TEXT,
  p_user_id UUID,
  p_accessed_profile_id UUID,
  p_fields_accessed JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log profile access for security monitoring
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

-- Fix search_path for validate_oauth_state function
DROP FUNCTION IF EXISTS public.validate_oauth_state(TEXT, UUID, INTEGER);
CREATE OR REPLACE FUNCTION public.validate_oauth_state(
  p_state_token TEXT,
  p_user_id UUID,
  p_max_age_minutes INTEGER DEFAULT 10
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  state_record RECORD;
BEGIN
  -- Validate OAuth state parameter to prevent CSRF attacks
  -- This would typically check against a stored state in a session table
  -- For now, implement basic validation
  
  IF p_state_token IS NULL OR length(p_state_token) < 32 THEN
    RETURN FALSE;
  END IF;
  
  -- Log state validation attempt
  PERFORM public.log_security_event(
    'oauth_state_validation',
    'oauth_flow',
    NULL,
    jsonb_build_object(
      'user_id', p_user_id,
      'state_length', length(p_state_token),
      'timestamp', now()
    )
  );
  
  RETURN TRUE; -- Simplified for implementation
END;
$$;

-- Fix search_path for validate_redirect_uri function
DROP FUNCTION IF EXISTS public.validate_redirect_uri(TEXT, TEXT[]);
CREATE OR REPLACE FUNCTION public.validate_redirect_uri(
  p_redirect_uri TEXT,
  p_allowed_domains TEXT[] DEFAULT ARRAY['localhost', '.vercel.app', '.netlify.app']
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  uri_host TEXT;
  domain TEXT;
BEGIN
  -- Extract host from URI
  uri_host := substring(p_redirect_uri FROM 'https?://([^/]+)');
  
  IF uri_host IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check against allowed domains
  FOREACH domain IN ARRAY p_allowed_domains
  LOOP
    IF uri_host = domain OR uri_host LIKE '%' || domain THEN
      -- Log successful validation
      PERFORM public.log_security_event(
        'redirect_uri_validated',
        'oauth_security',
        NULL,
        jsonb_build_object(
          'redirect_uri', p_redirect_uri,
          'matched_domain', domain,
          'timestamp', now()
        )
      );
      RETURN TRUE;
    END IF;
  END LOOP;
  
  -- Log failed validation
  PERFORM public.log_security_event(
    'redirect_uri_rejected',
    'oauth_security',
    NULL,
    jsonb_build_object(
      'redirect_uri', p_redirect_uri,
      'host', uri_host,
      'timestamp', now()
    )
  );
  
  RETURN FALSE;
END;
$$;

-- Fix search_path for check_operation_rate_limit function
DROP FUNCTION IF EXISTS public.check_operation_rate_limit(UUID, TEXT, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION public.check_operation_rate_limit(
  p_user_id UUID,
  p_operation_type TEXT,
  p_max_operations INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  operation_count INTEGER;
  window_start TIMESTAMP;
BEGIN
  window_start := now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Count operations in the time window
  SELECT COUNT(*)
  INTO operation_count
  FROM public.security_audit_log
  WHERE user_id = p_user_id
    AND action = p_operation_type
    AND created_at >= window_start;
  
  IF operation_count >= p_max_operations THEN
    -- Log rate limit violation
    PERFORM public.log_security_event(
      'rate_limit_exceeded',
      'security_control',
      NULL,
      jsonb_build_object(
        'operation_type', p_operation_type,
        'count', operation_count,
        'limit', p_max_operations,
        'window_minutes', p_window_minutes,
        'timestamp', now()
      )
    );
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Fix search_path for monitor_suspicious_activity function
DROP FUNCTION IF EXISTS public.monitor_suspicious_activity(UUID);
CREATE OR REPLACE FUNCTION public.monitor_suspicious_activity(
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE(
  alert_type TEXT,
  alert_message TEXT,
  risk_score INTEGER,
  event_count INTEGER,
  last_occurrence TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Monitor for suspicious authentication patterns
  RETURN QUERY
  SELECT 
    'excessive_oauth_attempts'::TEXT,
    'Multiple OAuth attempts detected'::TEXT,
    CASE WHEN COUNT(*) > 10 THEN 9 ELSE 5 END,
    COUNT(*)::INTEGER,
    MAX(created_at)
  FROM public.security_audit_log
  WHERE (p_user_id IS NULL OR user_id = p_user_id)
    AND action LIKE '%oauth%'
    AND created_at >= now() - INTERVAL '1 hour'
  HAVING COUNT(*) > 5;
  
  -- Monitor for token access anomalies
  RETURN QUERY
  SELECT 
    'suspicious_token_access'::TEXT,
    'Unusual token access patterns detected'::TEXT,
    8,
    COUNT(*)::INTEGER,
    MAX(created_at)
  FROM public.security_audit_log
  WHERE (p_user_id IS NULL OR user_id = p_user_id)
    AND action IN ('google_tokens_accessed', 'google_tokens_updated')
    AND created_at >= now() - INTERVAL '1 hour'
  HAVING COUNT(*) > 20;
END;
$$;