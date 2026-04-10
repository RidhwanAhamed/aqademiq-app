-- Proactive suggestions for autonomous Ada nudges
CREATE TABLE IF NOT EXISTS public.proactive_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proactive_suggestions_user_created_at
  ON public.proactive_suggestions (user_id, created_at DESC);

ALTER TABLE public.proactive_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own proactive suggestions"
  ON public.proactive_suggestions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert proactive suggestions"
  ON public.proactive_suggestions
  FOR INSERT
  WITH CHECK (true);
