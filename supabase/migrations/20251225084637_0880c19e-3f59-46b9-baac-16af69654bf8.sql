-- Fix the return type mismatch in get_daily_token_usage function
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
      (date_trunc('day', now() AT TIME ZONE 'UTC') + INTERVAL '1 day')::TIMESTAMPTZ as resets_at;
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
    (today_start + INTERVAL '1 day')::TIMESTAMPTZ AS resets_at;
END;
$$;