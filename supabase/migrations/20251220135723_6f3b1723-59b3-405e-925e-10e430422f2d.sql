-- Update the get_daily_token_usage function to use 50,000 token limit
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
BEGIN
  -- Calculate start of day in UTC
  today_start := date_trunc('day', now() AT TIME ZONE 'UTC');
  
  -- Sum all tokens used today
  SELECT COALESCE(SUM(total_tokens), 0) INTO used_tokens
  FROM public.ai_token_usage
  WHERE user_id = p_user_id AND created_at >= today_start;
  
  -- Return usage info
  RETURN QUERY SELECT 
    used_tokens,
    GREATEST(0::BIGINT, daily_limit - used_tokens),
    used_tokens >= daily_limit,
    (today_start + INTERVAL '1 day') AS resets_at;
END;
$$;