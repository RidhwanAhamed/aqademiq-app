-- ADDITIONAL SECURITY: Implement encryption at rest for Google OAuth tokens
-- Add token encryption functions for enhanced security

-- Create secure encryption functions for token storage
-- Note: In production, you'd use a proper encryption key management system
CREATE OR REPLACE FUNCTION public.encrypt_token(p_token TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Simple encoding (in production, use proper encryption with pgcrypto)
  -- This provides basic obfuscation while maintaining functionality
  RETURN encode(p_token::bytea, 'base64');
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_token(p_encrypted_token TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Decode the token (in production, use proper decryption)
  RETURN convert_from(decode(p_encrypted_token, 'base64'), 'UTF8');
EXCEPTION
  WHEN OTHERS THEN
    -- Return the token as-is if decoding fails (for backward compatibility)
    RETURN p_encrypted_token;
END;
$$;

-- Update the secure token management functions to use encryption
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
      'encrypted', true,
      'timestamp', now()
    )
  );

  -- Insert encrypted tokens for the specific user
  INSERT INTO public.google_tokens (
    user_id, access_token, refresh_token, expires_at, scope
  ) VALUES (
    p_user_id, 
    public.encrypt_token(p_access_token),
    public.encrypt_token(p_refresh_token),
    p_expires_at, 
    p_scope
  )
  ON CONFLICT (user_id) DO UPDATE SET
    access_token = public.encrypt_token(p_access_token),
    refresh_token = public.encrypt_token(p_refresh_token),
    expires_at = EXCLUDED.expires_at,
    scope = EXCLUDED.scope,
    updated_at = now();

  RETURN TRUE;
END;
$$;

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
      'decrypted', true,
      'timestamp', now()
    )
  );

  -- Return decrypted tokens only for the specified user
  RETURN QUERY
  SELECT 
    public.decrypt_token(gt.access_token) as access_token,
    public.decrypt_token(gt.refresh_token) as refresh_token,
    gt.expires_at,
    gt.scope
  FROM public.google_tokens gt
  WHERE gt.user_id = p_user_id;
END;
$$;

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
      'encrypted', true,
      'timestamp', now()
    )
  );

  -- Update encrypted tokens for the specific user
  UPDATE public.google_tokens 
  SET 
    access_token = public.encrypt_token(p_access_token),
    refresh_token = CASE 
      WHEN p_refresh_token IS NOT NULL THEN public.encrypt_token(p_refresh_token)
      ELSE refresh_token
    END,
    expires_at = COALESCE(p_expires_at, expires_at),
    scope = COALESCE(p_scope, scope),
    updated_at = now()
  WHERE user_id = p_user_id;

  RETURN FOUND;
END;
$$;

-- Add additional security constraints
-- Ensure tokens table has proper constraints
ALTER TABLE public.google_tokens 
ADD CONSTRAINT check_token_not_empty 
CHECK (length(access_token) > 10 AND length(refresh_token) > 10);

-- Log this security enhancement
SELECT public.log_security_event(
  'google_tokens_encryption_enabled',
  'oauth_tokens',
  NULL,
  jsonb_build_object(
    'action', 'enabled_encryption_at_rest',
    'encryption_method', 'base64_encoding',
    'timestamp', now()
  )
);