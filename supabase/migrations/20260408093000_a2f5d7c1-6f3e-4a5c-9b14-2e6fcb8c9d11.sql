-- Memory layer for Ada agent context intelligence
CREATE TABLE IF NOT EXISTS public.user_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('struggle', 'preference', 'event')),
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_memory_user_created_at
  ON public.user_memory (user_id, created_at DESC);

ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memory"
  ON public.user_memory
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert memory"
  ON public.user_memory
  FOR INSERT
  WITH CHECK (true);
