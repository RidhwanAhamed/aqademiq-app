-- Priority 2: Restrict System Template Access
-- Update RLS policy for rotation_templates to be more restrictive
-- Only allow authenticated users to read system templates (current policy is too broad)

-- Drop the existing policy
DROP POLICY IF EXISTS "System rotation templates are readable by all users" ON public.rotation_templates;

-- Create a more restrictive policy that ensures proper authentication
CREATE POLICY "Authenticated users can read system templates" 
ON public.rotation_templates 
FOR SELECT 
TO authenticated
USING (is_system_template = true AND auth.role() = 'authenticated');

-- Add audit logging table for security events
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only system can insert audit logs, users can read their own
CREATE POLICY "System can insert audit logs" 
ON public.security_audit_log 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can read their own audit logs" 
ON public.security_audit_log 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, action, resource_type, resource_id, details, ip_address, user_agent
  ) VALUES (
    auth.uid(), p_action, p_resource_type, p_resource_id, p_details, p_ip_address, p_user_agent
  );
END;
$$;