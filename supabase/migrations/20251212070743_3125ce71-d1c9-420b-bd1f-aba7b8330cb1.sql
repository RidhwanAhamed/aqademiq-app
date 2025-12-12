-- Create audit_log table for tracking all CRUD operations
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  request_id UUID,
  transaction_id UUID,
  action TEXT NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('event', 'assignment', 'exam', 'study_session', 'course')),
  entity_id UUID,
  before_state JSONB,
  after_state JSONB,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ada-ai', 'import', 'sync', 'api')),
  idempotency_key TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_audit_log_user ON public.audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_transaction ON public.audit_log(transaction_id) WHERE transaction_id IS NOT NULL;
CREATE UNIQUE INDEX idx_audit_log_idempotency ON public.audit_log(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only view their own audit logs
CREATE POLICY "Users can view their own audit logs"
  ON public.audit_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert audit logs (edge functions will use service role)
CREATE POLICY "Service can insert audit logs"
  ON public.audit_log
  FOR INSERT
  WITH CHECK (true);

-- Add source column to schedule_blocks if not exists (for tracking Ada-created events)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'schedule_blocks' 
    AND column_name = 'source'
  ) THEN
    ALTER TABLE public.schedule_blocks ADD COLUMN source TEXT DEFAULT 'manual';
  END IF;
END $$;