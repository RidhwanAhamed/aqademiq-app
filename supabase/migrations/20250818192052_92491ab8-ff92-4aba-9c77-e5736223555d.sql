-- CRITICAL SECURITY FIX: Secure Google OAuth Tokens
-- Remove user access to raw OAuth tokens and implement secure token management

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can manage their own Google tokens" ON public.google_tokens;

-- Create restrictive policies that prevent users from accessing raw tokens
-- Only allow service role to access tokens directly
CREATE POLICY "Service role can manage tokens" 
ON public.google_tokens 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Users can only insert their own tokens (for initial OAuth flow)
CREATE POLICY "Users can insert their own tokens" 
ON public.google_tokens 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own tokens (for disconnecting)
CREATE POLICY "Users can delete their own tokens" 
ON public.google_tokens 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- NO SELECT OR UPDATE policies for regular users - tokens are server-side only

-- Create a secure function to check if user has valid Google tokens
-- This allows the frontend to know if Google is connected without exposing tokens
CREATE OR REPLACE FUNCTION public.has_google_tokens(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow users to check their own token status
  IF auth.uid() != p_user_id THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 
    FROM public.google_tokens 
    WHERE user_id = p_user_id 
    AND expires_at > now()
  );
END;
$$;

-- Create a secure function to revoke user's Google tokens
-- This is safer than direct DELETE access
CREATE OR REPLACE FUNCTION public.revoke_google_tokens(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow users to revoke their own tokens
  IF auth.uid() != p_user_id THEN
    RETURN false;
  END IF;
  
  DELETE FROM public.google_tokens WHERE user_id = p_user_id;
  
  -- Log security event
  PERFORM public.log_security_event(
    'google_tokens_revoked',
    'oauth_tokens',
    NULL,
    jsonb_build_object('user_id', p_user_id)
  );
  
  RETURN true;
END;
$$;

-- Grant execute permissions on the new functions
GRANT EXECUTE ON FUNCTION public.has_google_tokens(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_google_tokens(UUID) TO authenticated;