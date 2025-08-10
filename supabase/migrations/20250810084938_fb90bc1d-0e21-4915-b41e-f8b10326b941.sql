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

-- Create function to get schedule for a specific date range with rotation support
CREATE OR REPLACE FUNCTION public.get_schedule_for_date_range(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  schedule_id UUID,
  course_id UUID,
  course_name TEXT,
  course_color TEXT,
  title TEXT,
  location TEXT,
  start_time TIME,
  end_time TIME,
  occurs_on DATE,
  day_of_week INTEGER,
  rotation_info TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_date DATE;
  schedule_record RECORD;
BEGIN
  -- Loop through each date in the range
  current_date := p_start_date;
  WHILE current_date <= p_end_date LOOP
    
    -- Get all schedule blocks for this user
    FOR schedule_record IN
      SELECT sb.*, c.name as course_name, c.color as course_color
      FROM public.schedule_blocks sb
      JOIN public.courses c ON c.id = sb.course_id
      WHERE sb.user_id = p_user_id
      AND sb.is_active = true
    LOOP
      -- Check if this schedule should occur on the current date
      IF public.should_class_occur_on_date(schedule_record.id, current_date) THEN
        RETURN QUERY SELECT
          schedule_record.id,
          schedule_record.course_id,
          schedule_record.course_name,
          schedule_record.course_color,
          schedule_record.title,
          schedule_record.location,
          schedule_record.start_time,
          schedule_record.end_time,
          current_date,
          schedule_record.day_of_week,
          CASE 
            WHEN schedule_record.rotation_type = 'biweekly' THEN 'Biweekly'
            WHEN schedule_record.rotation_type = 'odd_weeks' THEN 'Odd weeks'
            WHEN schedule_record.rotation_type = 'even_weeks' THEN 'Even weeks'
            WHEN schedule_record.rotation_type = 'custom' THEN 'Custom rotation'
            ELSE 'Weekly'
          END;
      END IF;
    END LOOP;
    
    current_date := current_date + 1;
  END LOOP;
END;
$$;

-- Create table for rotation templates to help users set up common patterns
CREATE TABLE public.rotation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  rotation_type TEXT NOT NULL,
  rotation_weeks INTEGER[],
  is_system_template BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert common rotation templates
INSERT INTO public.rotation_templates (name, description, rotation_type, rotation_weeks, is_system_template) VALUES
('Weekly', 'Classes occur every week', 'weekly', NULL, true),
('Biweekly (Odd weeks)', 'Classes occur on odd weeks only', 'odd_weeks', NULL, true),
('Biweekly (Even weeks)', 'Classes occur on even weeks only', 'even_weeks', NULL, true),
('Week 1, 3, 5 Pattern', 'Classes occur on weeks 1, 3, and 5 of rotation', 'custom', ARRAY[1,3,5], true),
('Week 2, 4, 6 Pattern', 'Classes occur on weeks 2, 4, and 6 of rotation', 'custom', ARRAY[2,4,6], true),
('Intensive Block (Weeks 1-3)', 'Classes occur for first 3 weeks only', 'custom', ARRAY[1,2,3], true),
('End of Term (Weeks 10-12)', 'Classes occur in final 3 weeks', 'custom', ARRAY[10,11,12], true);