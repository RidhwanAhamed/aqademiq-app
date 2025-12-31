-- Fix OAuth state token creation - accept pre-generated state token
-- Drop and recreate the function to accept the state token from Edge Function

DROP FUNCTION IF EXISTS public.create_oauth_state_token(uuid, inet, text);

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
DECLARE
  v_expires_at timestamp with time zone;
BEGIN
  -- Set expiration to 10 minutes from now
  v_expires_at := now() + interval '10 minutes';
  
  -- Clean up any expired tokens for this user
  DELETE FROM oauth_state_tokens 
  WHERE user_id = p_user_id AND expires_at < now();
  
  -- Insert the pre-generated state token
  INSERT INTO oauth_state_tokens (
    user_id, 
    state_token, 
    expires_at, 
    ip_address, 
    user_agent,
    used
  ) VALUES (
    p_user_id, 
    p_state_token, 
    v_expires_at, 
    p_ip_address, 
    p_user_agent,
    false
  );
  
  -- Return the state token
  RETURN p_state_token;
END;
$$;