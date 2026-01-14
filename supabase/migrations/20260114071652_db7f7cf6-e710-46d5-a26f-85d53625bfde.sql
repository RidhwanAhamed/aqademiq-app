-- Feature 1: Micro-Task Breakdown - Add breakdown_status to assignments
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS breakdown_status text DEFAULT 'none';

-- Feature 3: Smart Nudges - Add reschedule tracking to assignments
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS reschedule_count integer DEFAULT 0;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS last_rescheduled_at timestamptz;

-- Feature 2: Create proposed_schedules table for Dynamic AI Scheduler
CREATE TABLE IF NOT EXISTS public.proposed_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  proposed_items jsonb NOT NULL DEFAULT '[]',
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on proposed_schedules
ALTER TABLE public.proposed_schedules ENABLE ROW LEVEL SECURITY;

-- RLS policies for proposed_schedules
CREATE POLICY "Users can view their own proposed schedules"
  ON public.proposed_schedules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own proposed schedules"
  ON public.proposed_schedules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own proposed schedules"
  ON public.proposed_schedules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own proposed schedules"
  ON public.proposed_schedules FOR DELETE
  USING (auth.uid() = user_id);

-- Feature 3: Create nudge_history table for Smart Nudges
CREATE TABLE IF NOT EXISTS public.nudge_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  assignment_id uuid REFERENCES public.assignments(id) ON DELETE CASCADE,
  nudge_type text NOT NULL,
  triggered_at timestamptz DEFAULT now(),
  dismissed_at timestamptz,
  action_taken text
);

-- Enable RLS on nudge_history
ALTER TABLE public.nudge_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for nudge_history
CREATE POLICY "Users can view their own nudge history"
  ON public.nudge_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own nudge history"
  ON public.nudge_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nudge history"
  ON public.nudge_history FOR UPDATE
  USING (auth.uid() = user_id);

-- Add index for efficient nudge queries
CREATE INDEX IF NOT EXISTS idx_nudge_history_user_assignment 
  ON public.nudge_history(user_id, assignment_id);

CREATE INDEX IF NOT EXISTS idx_assignments_reschedule 
  ON public.assignments(user_id, reschedule_count) 
  WHERE reschedule_count > 0;