-- Create table for Discord integration settings
CREATE TABLE public.discord_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  webhook_url TEXT,
  username TEXT,
  notifications_enabled BOOLEAN NOT NULL DEFAULT false,
  assignment_notifications BOOLEAN NOT NULL DEFAULT true,
  exam_notifications BOOLEAN NOT NULL DEFAULT true,
  reminder_notifications BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.discord_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can manage their own Discord settings" 
ON public.discord_settings 
FOR ALL
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_discord_settings_updated_at
BEFORE UPDATE ON public.discord_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create enhanced notification preferences table
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  discord_enabled BOOLEAN NOT NULL DEFAULT false,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  assignment_reminders BOOLEAN NOT NULL DEFAULT true,
  exam_reminders BOOLEAN NOT NULL DEFAULT true,
  deadline_warnings BOOLEAN NOT NULL DEFAULT true,
  daily_summary BOOLEAN NOT NULL DEFAULT false,
  reminder_timing_minutes JSONB NOT NULL DEFAULT '[15, 60, 1440]'::jsonb, -- 15 min, 1 hour, 1 day
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can manage their own notification preferences" 
ON public.notification_preferences 
FOR ALL
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create notification queue table for reliable delivery
CREATE TABLE public.notification_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'discord', 'in_app')),
  category TEXT NOT NULL CHECK (category IN ('assignment_reminder', 'exam_reminder', 'deadline_warning', 'daily_summary')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own notifications" 
ON public.notification_queue 
FOR SELECT
USING (auth.uid() = user_id);

-- Create index for efficient querying
CREATE INDEX idx_notification_queue_scheduled ON public.notification_queue(scheduled_for, sent_at) WHERE sent_at IS NULL;