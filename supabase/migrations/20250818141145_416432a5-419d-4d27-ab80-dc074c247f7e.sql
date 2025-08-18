-- Create tables for enhanced bi-directional Google Calendar sync

-- Table to track Google Calendar webhook channels
CREATE TABLE IF NOT EXISTS public.google_calendar_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL UNIQUE,
  resource_id TEXT NOT NULL,
  expiration TIMESTAMP WITH TIME ZONE NOT NULL,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  webhook_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to track sync operations and conflicts
CREATE TABLE IF NOT EXISTS public.sync_operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('import', 'export', 'conflict')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('schedule_block', 'assignment', 'exam')),
  entity_id UUID NOT NULL,
  google_event_id TEXT,
  sync_direction TEXT NOT NULL CHECK (sync_direction IN ('to_google', 'from_google', 'bidirectional')),
  operation_status TEXT NOT NULL DEFAULT 'pending' CHECK (operation_status IN ('pending', 'success', 'failed', 'conflict')),
  conflict_data JSONB,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_attempted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to map our events to Google Calendar events
CREATE TABLE IF NOT EXISTS public.google_event_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('schedule_block', 'assignment', 'exam')),
  entity_id UUID NOT NULL,
  google_event_id TEXT NOT NULL,
  google_calendar_id TEXT NOT NULL DEFAULT 'primary',
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  google_event_updated TIMESTAMP WITH TIME ZONE,
  local_event_updated TIMESTAMP WITH TIME ZONE,
  sync_hash TEXT, -- Hash of event data to detect changes
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id),
  UNIQUE(google_event_id)
);

-- Enable RLS on all tables
ALTER TABLE public.google_calendar_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_event_mappings ENABLE ROW LEVEL SECURITY;

-- RLS policies for google_calendar_channels
CREATE POLICY "Users can view their own calendar channels" 
ON public.google_calendar_channels 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own calendar channels" 
ON public.google_calendar_channels 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar channels" 
ON public.google_calendar_channels 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar channels" 
ON public.google_calendar_channels 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for sync_operations
CREATE POLICY "Users can view their own sync operations" 
ON public.sync_operations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sync operations" 
ON public.sync_operations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync operations" 
ON public.sync_operations 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS policies for google_event_mappings
CREATE POLICY "Users can view their own event mappings" 
ON public.google_event_mappings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own event mappings" 
ON public.google_event_mappings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own event mappings" 
ON public.google_event_mappings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own event mappings" 
ON public.google_event_mappings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_google_calendar_channels_user_id ON public.google_calendar_channels(user_id);
CREATE INDEX idx_google_calendar_channels_channel_id ON public.google_calendar_channels(channel_id);
CREATE INDEX idx_sync_operations_user_id ON public.sync_operations(user_id);
CREATE INDEX idx_sync_operations_status ON public.sync_operations(operation_status);
CREATE INDEX idx_google_event_mappings_user_id ON public.google_event_mappings(user_id);
CREATE INDEX idx_google_event_mappings_entity ON public.google_event_mappings(entity_type, entity_id);
CREATE INDEX idx_google_event_mappings_google_event ON public.google_event_mappings(google_event_id);

-- Add triggers for updated_at
CREATE TRIGGER update_google_calendar_channels_updated_at
  BEFORE UPDATE ON public.google_calendar_channels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_google_event_mappings_updated_at
  BEFORE UPDATE ON public.google_event_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate sync hash for change detection
CREATE OR REPLACE FUNCTION public.generate_sync_hash(
  entity_type TEXT,
  entity_data JSONB
) RETURNS TEXT AS $$
BEGIN
  RETURN encode(sha256(entity_type::bytea || entity_data::text::bytea), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;