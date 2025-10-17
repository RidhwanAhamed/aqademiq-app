-- FIX 3: Update has_google_tokens to check token existence instead of expiration
-- This allows the frontend to recognize expired tokens that can still be refreshed
-- Previously, users would appear disconnected when tokens expired, even though 
-- refresh tokens could be used to get new access tokens

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
  
  -- Check if user has tokens (even if expired, as they can be refreshed with refresh_token)
  -- This prevents users from appearing as disconnected when tokens just need refresh
  RETURN EXISTS (
    SELECT 1 
    FROM public.google_tokens 
    WHERE user_id = p_user_id 
    AND access_token IS NOT NULL
    AND refresh_token IS NOT NULL
  );
END;
$$;

-- Log this security enhancement
SELECT public.log_security_event(
  'google_token_handling_improved',
  'oauth_tokens',
  NULL,
  jsonb_build_object(
    'action', 'improved_token_validation',
    'description', 'tokens now recognized even if expired for refresh capability',
    'timestamp', now()
  )
);
