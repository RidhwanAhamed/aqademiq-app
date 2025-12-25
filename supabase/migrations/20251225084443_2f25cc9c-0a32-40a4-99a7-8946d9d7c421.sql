-- Create token_whitelist table for unlimited access users
CREATE TABLE public.token_whitelist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text
);

-- Enable RLS
ALTER TABLE public.token_whitelist ENABLE ROW LEVEL SECURITY;

-- Only admins/service role can read/write this table
CREATE POLICY "Service role can manage whitelist" 
  ON public.token_whitelist 
  FOR ALL 
  USING (auth.role() = 'service_role');

-- Update the get_daily_token_usage function to check whitelist
CREATE OR REPLACE FUNCTION public.get_daily_token_usage(p_user_id uuid)
RETURNS TABLE(total_tokens_today bigint, remaining_tokens bigint, is_limit_exceeded boolean, resets_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  daily_limit CONSTANT INTEGER := 50000;
  today_start TIMESTAMPTZ;
  used_tokens BIGINT;
  is_whitelisted BOOLEAN;
BEGIN
  -- Check if user is whitelisted for unlimited access
  SELECT EXISTS (
    SELECT 1 FROM public.token_whitelist WHERE user_id = p_user_id
  ) INTO is_whitelisted;
  
  -- If whitelisted, return unlimited access
  IF is_whitelisted THEN
    RETURN QUERY SELECT 
      0::BIGINT as total_tokens_today, 
      999999999::BIGINT as remaining_tokens, 
      false as is_limit_exceeded, 
      (date_trunc('day', now() AT TIME ZONE 'UTC') + INTERVAL '1 day') as resets_at;
    RETURN;
  END IF;
  
  -- Normal token usage calculation
  today_start := date_trunc('day', now() AT TIME ZONE 'UTC');
  SELECT COALESCE(SUM(total_tokens), 0) INTO used_tokens 
  FROM public.ai_token_usage 
  WHERE user_id = p_user_id AND created_at >= today_start;
  
  RETURN QUERY SELECT 
    used_tokens, 
    GREATEST(0::BIGINT, daily_limit - used_tokens), 
    used_tokens >= daily_limit, 
    (today_start + INTERVAL '1 day') AS resets_at;
END;
$$;

-- Insert the whitelisted user
INSERT INTO public.token_whitelist (user_id, email, reason, created_by)
VALUES (
  'b8a4d348-2cc4-4e68-8543-7f1465ff03d7',
  'mohammed.aswath07@gmail.com',
  'Developer/Admin account - unlimited AI access',
  'system'
);