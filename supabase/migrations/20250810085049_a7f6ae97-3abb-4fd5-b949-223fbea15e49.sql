-- Enhance schedule_blocks table to support advanced rotation patterns
ALTER TABLE public.schedule_blocks 
ADD COLUMN rotation_type TEXT DEFAULT 'none' CHECK (rotation_type IN ('none', 'weekly', 'biweekly', 'odd_weeks', 'even_weeks', 'custom')),
ADD COLUMN rotation_weeks INTEGER[] DEFAULT NULL,
ADD COLUMN semester_week_start INTEGER DEFAULT 1,
ADD COLUMN rotation_group TEXT DEFAULT NULL;

-- Add indexes for better performance on rotation queries
CREATE INDEX idx_schedule_blocks_rotation ON public.schedule_blocks(user_id, rotation_type, rotation_group);
CREATE INDEX idx_schedule_blocks_week_pattern ON public.schedule_blocks(rotation_type, rotation_weeks);

-- Create function to calculate if a class should occur on a specific date
CREATE OR REPLACE FUNCTION public.should_class_occur_on_date(
  p_schedule_id UUID,
  p_target_date DATE
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  schedule_record RECORD;
  semester_record RECORD;
  target_day_of_week INTEGER;
  semester_start_date DATE;
  weeks_since_start INTEGER;
  current_week_number INTEGER;
BEGIN
  -- Get schedule block details
  SELECT * INTO schedule_record 
  FROM public.schedule_blocks 
  WHERE id = p_schedule_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if it's the right day of the week
  target_day_of_week := EXTRACT(DOW FROM p_target_date);
  IF target_day_of_week != schedule_record.day_of_week THEN
    RETURN FALSE;
  END IF;
  
  -- Check if schedule is active
  IF NOT schedule_record.is_active THEN
    RETURN FALSE;
  END IF;
  
  -- Handle specific date overrides
  IF schedule_record.specific_date IS NOT NULL THEN
    RETURN schedule_record.specific_date = p_target_date;
  END IF;
  
  -- For non-recurring schedules, check if it's a one-time event
  IF NOT schedule_record.is_recurring THEN
    RETURN FALSE;
  END IF;
  
  -- Get semester information to calculate week numbers
  SELECT start_date INTO semester_start_date
  FROM public.semesters s
  JOIN public.courses c ON c.semester_id = s.id
  WHERE c.id = schedule_record.course_id
  AND s.is_active = true;
  
  IF semester_start_date IS NULL THEN
    -- Fallback: assume current semester started 10 weeks ago
    semester_start_date := p_target_date - interval '10 weeks';
  END IF;
  
  -- Calculate weeks since semester start
  weeks_since_start := FLOOR((p_target_date - semester_start_date) / 7);
  current_week_number := weeks_since_start + schedule_record.semester_week_start;
  
  -- Handle different rotation types
  CASE schedule_record.rotation_type
    WHEN 'none', 'weekly' THEN
      RETURN TRUE;
      
    WHEN 'biweekly' THEN
      RETURN (current_week_number % 2) = 1;
      
    WHEN 'odd_weeks' THEN
      RETURN (current_week_number % 2) = 1;
      
    WHEN 'even_weeks' THEN
      RETURN (current_week_number % 2) = 0;
      
    WHEN 'custom' THEN
      -- Check if current week is in the rotation_weeks array
      RETURN schedule_record.rotation_weeks IS NOT NULL 
        AND current_week_number = ANY(schedule_record.rotation_weeks);
        
    ELSE
      RETURN TRUE;
  END CASE;
END;
$$;