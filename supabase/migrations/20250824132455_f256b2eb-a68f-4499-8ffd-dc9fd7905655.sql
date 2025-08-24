-- Create marketplace early access table
CREATE TABLE public.marketplace_early_access (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  referral_source text DEFAULT 'dashboard',
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.marketplace_early_access ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own early access entries" 
ON public.marketplace_early_access 
FOR ALL 
USING (auth.uid() = user_id);

-- Create marketplace configuration table
CREATE TABLE public.marketplace_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key text NOT NULL UNIQUE,
  config_value jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS (admin only)
ALTER TABLE public.marketplace_config ENABLE ROW LEVEL SECURITY;

-- Create policies for config (system managed)
CREATE POLICY "System can manage marketplace config" 
ON public.marketplace_config 
FOR ALL 
USING (true);

-- Insert default config
INSERT INTO public.marketplace_config (config_key, config_value) VALUES 
('badge_enabled', 'true'),
('early_access_count', '500'),
('partner_count', '20'),
('teaser_enabled', 'true'),
('launch_timeline', '"Early 2026"');

-- Create function to get early access count
CREATE OR REPLACE FUNCTION public.get_marketplace_early_access_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (SELECT COUNT(*)::INTEGER FROM public.marketplace_early_access);
END;
$$;

-- Create function to check if user has early access
CREATE OR REPLACE FUNCTION public.user_has_marketplace_early_access(p_user_id uuid DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow users to check their own status
  IF auth.uid() != p_user_id THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 
    FROM public.marketplace_early_access 
    WHERE user_id = p_user_id
  );
END;
$$;