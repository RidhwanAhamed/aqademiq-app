-- Fix critical signup issue: Recreate missing trigger and enhance profile creation

-- First, ensure the handle_new_user function exists with proper security and error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = 'public'
AS $$
BEGIN
  -- Log the signup attempt for debugging
  RAISE LOG 'Creating profile for user: %', NEW.id;
  
  -- Insert into profiles table with comprehensive error handling
  BEGIN
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    )
    ON CONFLICT (user_id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      updated_at = now();
    
    RAISE LOG 'Profile created successfully for user: %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    -- Don't fail the signup if profile creation fails
  END;
  
  -- Insert into user_stats table with error handling
  BEGIN
    INSERT INTO public.user_stats (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE LOG 'User stats created successfully for user: %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error creating user stats for user %: %', NEW.id, SQLERRM;
    -- Don't fail the signup if user_stats creation fails
  END;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the critical trigger that was missing
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verify the trigger was created
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Log successful trigger creation
SELECT 'Trigger on_auth_user_created recreated successfully' AS status;