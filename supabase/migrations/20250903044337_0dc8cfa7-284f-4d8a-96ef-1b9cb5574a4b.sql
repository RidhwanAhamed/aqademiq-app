-- Enhanced Google Calendar Integration Database Schema
-- Add sync tokens table for efficient incremental sync
CREATE TABLE IF NOT EXISTS public.google_sync_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  sync_token TEXT NOT NULL,
  page_token TEXT,
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, calendar_id)
);

-- Enhanced sync operations with priority and batching
ALTER TABLE public.sync_operations 
ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 2,
ADD COLUMN IF NOT EXISTS batch_id UUID,
ADD COLUMN IF NOT EXISTS sync_type TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS attempts_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS original_created_at TIMESTAMP WITH TIME ZONE;

-- Add sync job queue for background processing
CREATE TABLE IF NOT EXISTS public.sync_job_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_type TEXT NOT NULL,
  job_data JSONB NOT NULL DEFAULT '{}',
  priority INTEGER NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enhanced conflict resolution tracking
CREATE TABLE IF NOT EXISTS public.sync_conflicts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  google_event_id TEXT NOT NULL,
  local_data JSONB NOT NULL,
  google_data JSONB NOT NULL,
  conflict_type TEXT NOT NULL,
  resolution_preference TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Academic schedule intelligence
CREATE TABLE IF NOT EXISTS public.academic_sync_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  auto_study_sessions BOOLEAN NOT NULL DEFAULT true,
  study_session_duration INTEGER NOT NULL DEFAULT 120, -- minutes
  break_time_minutes INTEGER NOT NULL DEFAULT 15,
  exam_prep_days INTEGER NOT NULL DEFAULT 14,
  assignment_buffer_hours INTEGER NOT NULL DEFAULT 2,
  color_coding_enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_escalation BOOLEAN NOT NULL DEFAULT true,
  weekend_study_allowed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Study session automation
CREATE TABLE IF NOT EXISTS public.study_session_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID,
  session_type TEXT NOT NULL DEFAULT 'general',
  template_name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 120,
  break_intervals JSONB DEFAULT '[25, 5]', -- Pomodoro: 25min work, 5min break
  auto_schedule BOOLEAN NOT NULL DEFAULT false,
  preferred_times JSONB DEFAULT '[]', -- Array of preferred time slots
  subject_focus JSONB DEFAULT '[]', -- Specific topics to focus on
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.google_sync_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own sync tokens" ON public.google_sync_tokens
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.sync_job_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own sync jobs" ON public.sync_job_queue
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage sync jobs" ON public.sync_job_queue
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.sync_conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own sync conflicts" ON public.sync_conflicts
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.academic_sync_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own academic sync preferences" ON public.academic_sync_preferences
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.study_session_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own study session templates" ON public.study_session_templates
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_google_sync_tokens_user_calendar ON public.google_sync_tokens(user_id, calendar_id);
CREATE INDEX IF NOT EXISTS idx_sync_job_queue_status_priority ON public.sync_job_queue(status, priority, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_sync_job_queue_user_type ON public.sync_job_queue(user_id, job_type);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_user_entity ON public.sync_conflicts(user_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_study_session_templates_user_course ON public.study_session_templates(user_id, course_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_google_sync_tokens_updated_at BEFORE UPDATE ON public.google_sync_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sync_job_queue_updated_at BEFORE UPDATE ON public.sync_job_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sync_conflicts_updated_at BEFORE UPDATE ON public.sync_conflicts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_academic_sync_preferences_updated_at BEFORE UPDATE ON public.academic_sync_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_study_session_templates_updated_at BEFORE UPDATE ON public.study_session_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();