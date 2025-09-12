-- Remove Discord-related database structures
-- Drop discord_settings table entirely
DROP TABLE IF EXISTS public.discord_settings;

-- Remove discord_enabled column from notification_preferences
ALTER TABLE public.notification_preferences 
DROP COLUMN IF EXISTS discord_enabled;