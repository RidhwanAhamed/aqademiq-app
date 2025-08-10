-- Create ai_insights_history table for tracking AI requests
CREATE TABLE public.ai_insights_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  request_payload JSONB NOT NULL,
  ai_response JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_insights_history ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own AI insights history" 
ON public.ai_insights_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI insights history" 
ON public.ai_insights_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_ai_insights_history_user_created 
ON public.ai_insights_history (user_id, created_at DESC);