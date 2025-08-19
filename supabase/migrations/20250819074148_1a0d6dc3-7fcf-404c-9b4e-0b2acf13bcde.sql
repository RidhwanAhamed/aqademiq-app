-- Strengthen profiles table security with additional authenticated role check
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create more restrictive policies for profiles table
CREATE POLICY "Authenticated users can view only their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert only their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update only their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND auth.role() = 'authenticated')
WITH CHECK (auth.uid() = user_id AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete only their own profile"
ON public.profiles FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND auth.role() = 'authenticated');

-- Strengthen google_tokens table security (add authenticated role check)
DROP POLICY IF EXISTS "Users can delete their own tokens" ON public.google_tokens;
DROP POLICY IF EXISTS "Users can insert their own tokens" ON public.google_tokens;

CREATE POLICY "Authenticated users can insert only their own tokens"
ON public.google_tokens FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete only their own tokens"
ON public.google_tokens FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND auth.role() = 'authenticated');

-- Fix rotation_templates exposure issue - restrict to system use only
DROP POLICY IF EXISTS "Authenticated users can read system templates" ON public.rotation_templates;

-- Create more restrictive policy for rotation_templates (system use only)
CREATE POLICY "System templates access restricted"
ON public.rotation_templates FOR SELECT
TO authenticated
USING (false); -- Effectively blocks direct access, only accessible via functions