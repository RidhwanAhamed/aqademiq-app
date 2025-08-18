-- CRITICAL SECURITY FIX: Secure User Profiles and Email Addresses
-- Prevent unauthorized access to user email addresses and profile data

-- Drop the existing overly broad policy
DROP POLICY IF EXISTS "Enable all operations for users on their own profile" ON public.profiles;

-- Create granular, secure policies for profiles table

-- Users can only view their own complete profile (including email)
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Users can only insert their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own profile
CREATE POLICY "Users can delete their own profile" 
ON public.profiles 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Create a secure function for public profile data (without sensitive info)
-- This allows for features like user directories while protecting email addresses
CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id UUID)
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  study_streak INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return only non-sensitive profile information
  RETURN QUERY
  SELECT 
    p.user_id,
    p.full_name,
    p.study_streak,
    p.created_at
  FROM public.profiles p
  WHERE p.user_id = p_user_id;
END;
$$;

-- Create a function to safely check if an email exists (for preventing duplicate signups)
-- without exposing the actual email addresses
CREATE OR REPLACE FUNCTION public.email_exists(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return true/false, never the actual email
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE lower(email) = lower(p_email)
  );
END;
$$;

-- Log this security fix
SELECT public.log_security_event(
  'profiles_security_hardened',
  'user_profiles',
  NULL,
  jsonb_build_object(
    'action', 'restricted_email_access',
    'timestamp', now()
  )
);

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION public.get_public_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.email_exists(TEXT) TO authenticated;