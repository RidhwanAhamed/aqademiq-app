-- Enable RLS on rotation_templates table (it's a read-only system table)
ALTER TABLE public.rotation_templates ENABLE ROW LEVEL SECURITY;

-- Create policy to allow reading system templates (they are public)
CREATE POLICY "System rotation templates are readable by all users"
ON public.rotation_templates
FOR SELECT
TO authenticated
USING (is_system_template = true);