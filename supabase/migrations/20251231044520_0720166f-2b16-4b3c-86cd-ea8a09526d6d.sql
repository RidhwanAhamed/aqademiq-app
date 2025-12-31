-- Fix Google OAuth state validation: remove overloaded validate_oauth_state and ensure tokens are stored/validated correctly

-- 1) Replace create_oauth_state_token to accept pre-generated state (no DB-side randomness)
CREATE OR REPLACE FUNCTION public.create_oauth_state_token(
  p_user_id uuid,
  p_state_token text,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id is required';
  END IF;

  IF p_state_token IS NULL OR length(p_state_token) < 32 THEN
    RAISE EXCEPTION 'invalid state token';
  END IF;

  INSERT INTO public.oauth_state_tokens (
    user_id, state_token, expires_at, ip_address, user_agent
  ) VALUES (
    p_user_id,
    p_state_token,
    NOW() + INTERVAL '10 minutes',
    p_ip_address,
    p_user_agent
  );

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

  RETURN p_state_token;
END;
$$;

-- 2) Remove ambiguous overload(s) that cause RPC mismatches
DROP FUNCTION IF EXISTS public.validate_oauth_state(text, uuid, integer);
DROP FUNCTION IF EXISTS public.validate_oauth_state(uuid, text, integer);

-- 3) Recreate a single, strict validator that enforces TTL + one-time use
CREATE OR REPLACE FUNCTION public.validate_oauth_state(
  p_user_id uuid,
  p_state_token text,
  p_max_age_minutes integer DEFAULT 10
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_id uuid;
  v_created_at timestamptz;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

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

  -- Atomically consume the token (one-time use)
  UPDATE public.oauth_state_tokens
  SET used = TRUE
  WHERE user_id = p_user_id
    AND state_token = p_state_token
    AND used = FALSE
    AND expires_at > NOW()
    AND created_at > NOW() - (p_max_age_minutes || ' minutes')::INTERVAL
  RETURNING id, created_at
  INTO v_token_id, v_created_at;

  IF v_token_id IS NULL THEN
    PERFORM public.log_security_event(
      'oauth_state_validation_failed',
      'oauth_tokens',
      NULL,
      jsonb_build_object(
        'user_id', p_user_id,
        'reason', 'token_not_found_or_expired_or_used',
        'timestamp', now()
      )
    );
    RETURN FALSE;
  END IF;

  PERFORM public.log_security_event(
    'oauth_state_validated',
    'oauth_tokens',
    NULL,
    jsonb_build_object(
      'user_id', p_user_id,
      'token_age_seconds', EXTRACT(EPOCH FROM (NOW() - v_created_at)),
      'timestamp', now()
    )
  );

  RETURN TRUE;
END;
$$;
