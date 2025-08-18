-- SECURITY FIX: Remove overly permissive service role policy for Google tokens
-- Implement more secure token management with restricted access

-- Drop the overly broad service role policy
DROP POLICY IF EXISTS "Service role can manage tokens" ON public.google_tokens;

-- Create secure functions for edge function token operations
-- These replace direct service role access with controlled, audited operations

-- Function for edge functions to securely retrieve tokens for a specific user
CREATE OR REPLACE FUNCTION public.get_user_google_tokens(p_user_id UUID)
RETURNS TABLE(
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the token access for security monitoring
  PERFORM public.log_security_event(
    'google_tokens_accessed',
    'oauth_tokens',
    NULL,
    jsonb_build_object(
      'user_id', p_user_id,
      'accessed_by', 'edge_function',
      'timestamp', now()
    )
  );

  -- Return tokens only for the specified user
  RETURN QUERY
  SELECT 
    gt.access_token,
    gt.refresh_token,
    gt.expires_at,
    gt.scope
  FROM public.google_tokens gt
  WHERE gt.user_id = p_user_id;
END;
$$;

-- Function for edge functions to securely update tokens after refresh
CREATE OR REPLACE FUNCTION public.update_user_google_tokens(
  p_user_id UUID,
  p_access_token TEXT,
  p_refresh_token TEXT DEFAULT NULL,
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_scope TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the token update for security monitoring
  PERFORM public.log_security_event(
    'google_tokens_updated',
    'oauth_tokens',
    NULL,
    jsonb_build_object(
      'user_id', p_user_id,
      'updated_by', 'edge_function',
      'timestamp', now()
    )
  );

  -- Update tokens for the specific user
  UPDATE public.google_tokens 
  SET 
    access_token = p_access_token,
    refresh_token = COALESCE(p_refresh_token, refresh_token),
    expires_at = COALESCE(p_expires_at, expires_at),
    scope = COALESCE(p_scope, scope),
    updated_at = now()
  WHERE user_id = p_user_id;

  RETURN FOUND;
END;
$$;

-- Function for edge functions to securely insert new tokens
CREATE OR REPLACE FUNCTION public.insert_user_google_tokens(
  p_user_id UUID,
  p_access_token TEXT,
  p_refresh_token TEXT,
  p_expires_at TIMESTAMP WITH TIME ZONE,
  p_scope TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the token insertion for security monitoring
  PERFORM public.log_security_event(
    'google_tokens_created',
    'oauth_tokens',
    NULL,
    jsonb_build_object(
      'user_id', p_user_id,
      'created_by', 'edge_function',
      'timestamp', now()
    )
  );

  -- Insert new tokens for the specific user
  INSERT INTO public.google_tokens (
    user_id, access_token, refresh_token, expires_at, scope
  ) VALUES (
    p_user_id, p_access_token, p_refresh_token, p_expires_at, p_scope
  )
  ON CONFLICT (user_id) DO UPDATE SET
    access_token = EXCLUDED.access_token,
    refresh_token = EXCLUDED.refresh_token,
    expires_at = EXCLUDED.expires_at,
    scope = EXCLUDED.scope,
    updated_at = now();

  RETURN TRUE;
END;
$$;

-- Function for edge functions to securely delete tokens
CREATE OR REPLACE FUNCTION public.delete_user_google_tokens(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the token deletion for security monitoring
  PERFORM public.log_security_event(
    'google_tokens_deleted',
    'oauth_tokens',
    NULL,
    jsonb_build_object(
      'user_id', p_user_id,
      'deleted_by', 'edge_function',
      'timestamp', now()
    )
  );

  -- Delete tokens for the specific user
  DELETE FROM public.google_tokens WHERE user_id = p_user_id;

  RETURN FOUND;
END;
$$;

-- Grant execute permissions to service role (for edge functions only)
GRANT EXECUTE ON FUNCTION public.get_user_google_tokens(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_user_google_tokens(UUID, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.insert_user_google_tokens(UUID, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_user_google_tokens(UUID) TO service_role;

-- Log this security improvement
SELECT public.log_security_event(
  'google_tokens_security_enhanced',
  'oauth_tokens',
  NULL,
  jsonb_build_object(
    'action', 'removed_overly_permissive_service_role_policy',
    'improvement', 'implemented_controlled_access_functions',
    'timestamp', now()
  )
);