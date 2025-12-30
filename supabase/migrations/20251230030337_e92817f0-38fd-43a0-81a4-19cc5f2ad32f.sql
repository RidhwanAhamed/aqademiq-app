-- Add context window management columns to chat_messages table
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS token_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_summary BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS summary_of_message_ids TEXT[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS context_window_position INTEGER DEFAULT NULL;

-- Add index for efficient context window queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_context_window 
ON public.chat_messages(conversation_id, created_at DESC) 
WHERE is_summary = FALSE;

-- Add index for summary lookups
CREATE INDEX IF NOT EXISTS idx_chat_messages_summaries 
ON public.chat_messages(conversation_id) 
WHERE is_summary = TRUE;

-- Create table for conversation context metadata
CREATE TABLE IF NOT EXISTS public.conversation_context (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_token_count INTEGER DEFAULT 0,
  last_summarization_at TIMESTAMP WITH TIME ZONE,
  oldest_unsummarized_message_id UUID,
  context_window_summary TEXT,
  summary_token_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS on conversation_context
ALTER TABLE public.conversation_context ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversation_context
CREATE POLICY "Users can view their own conversation context"
ON public.conversation_context FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversation context"
ON public.conversation_context FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversation context"
ON public.conversation_context FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversation context"
ON public.conversation_context FOR DELETE
USING (auth.uid() = user_id);

-- Function to estimate token count for a message
CREATE OR REPLACE FUNCTION public.estimate_token_count(text_content TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Rough estimation: ~4 characters per token for English text
  -- This is a conservative estimate that works well for LLM context management
  IF text_content IS NULL THEN
    RETURN 0;
  END IF;
  RETURN GREATEST(1, CEIL(LENGTH(text_content)::NUMERIC / 4));
END;
$$;

-- Trigger to auto-calculate token count on message insert
CREATE OR REPLACE FUNCTION public.calculate_message_token_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.token_count := public.estimate_token_count(NEW.message);
  RETURN NEW;
END;
$$;

-- Create trigger for token count calculation
DROP TRIGGER IF EXISTS trigger_calculate_message_tokens ON public.chat_messages;
CREATE TRIGGER trigger_calculate_message_tokens
BEFORE INSERT OR UPDATE OF message ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.calculate_message_token_count();

-- Update existing messages with token counts
UPDATE public.chat_messages
SET token_count = public.estimate_token_count(message)
WHERE token_count = 0 OR token_count IS NULL;