-- Create table for storing Google OAuth tokens
CREATE TABLE public.google_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can manage their own Google tokens" 
ON public.google_tokens 
FOR ALL
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_google_tokens_updated_at
BEFORE UPDATE ON public.google_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for Google Calendar sync settings
CREATE TABLE public.google_calendar_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  sync_enabled BOOLEAN NOT NULL DEFAULT false,
  sync_schedule_blocks BOOLEAN NOT NULL DEFAULT true,
  sync_assignments BOOLEAN NOT NULL DEFAULT true,
  sync_exams BOOLEAN NOT NULL DEFAULT true,
  calendar_id TEXT,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.google_calendar_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can manage their own Google Calendar settings" 
ON public.google_calendar_settings 
FOR ALL
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_google_calendar_settings_updated_at
BEFORE UPDATE ON public.google_calendar_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();