-- Create table for tracking AI token usage per user
CREATE TABLE public.ai_token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  function_name TEXT NOT NULL,
  request_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient daily queries by user
CREATE INDEX idx_ai_token_usage_user_date ON public.ai_token_usage (user_id, created_at);

-- Enable Row-Level Security
ALTER TABLE public.ai_token_usage ENABLE ROW LEVEL SECURITY;

-- Users can only read their own usage
CREATE POLICY "Users can view own token usage" ON public.ai_token_usage
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Edge functions can insert token usage records
CREATE POLICY "Service can insert token usage" ON public.ai_token_usage
  FOR INSERT
  WITH CHECK (true);

-- Create function to get daily token usage and check limits
CREATE OR REPLACE FUNCTION public.get_daily_token_usage(p_user_id UUID)
RETURNS TABLE(total_tokens_today BIGINT, remaining_tokens BIGINT, is_limit_exceeded BOOLEAN, resets_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  daily_limit CONSTANT INTEGER := 10000;
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