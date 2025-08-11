-- Create function to update user study statistics
CREATE OR REPLACE FUNCTION public.update_user_study_stats(
  p_user_id uuid,
  p_study_hours numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Update user_stats table with new study hours
  UPDATE public.user_stats 
  SET 
    total_study_hours = COALESCE(total_study_hours, 0) + p_study_hours,
    last_study_date = CURRENT_DATE,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- If no row exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.user_stats (
      user_id, 
      total_study_hours, 
      last_study_date,
      created_at,
      updated_at
    ) VALUES (
      p_user_id, 
      p_study_hours, 
      CURRENT_DATE,
      now(),
      now()
    );
  END IF;
END;
$function$