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
  check_date DATE;
  schedule_record RECORD;
BEGIN
  -- Loop through each date in the range
  check_date := p_start_date;
  WHILE check_date <= p_end_date LOOP
    
    -- Get all schedule blocks for this user
    FOR schedule_record IN
      SELECT sb.*, c.name as course_name, c.color as course_color
      FROM public.schedule_blocks sb
      JOIN public.courses c ON c.id = sb.course_id
      WHERE sb.user_id = p_user_id
      AND sb.is_active = true
    LOOP
      -- Check if this schedule should occur on the current date
      IF public.should_class_occur_on_date(schedule_record.id, check_date) THEN
        RETURN QUERY SELECT
          schedule_record.id,
          schedule_record.course_id,
          schedule_record.course_name,
          schedule_record.course_color,
          schedule_record.title,
          schedule_record.location,
          schedule_record.start_time,
          schedule_record.end_time,
          check_date,
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
    
    check_date := check_date + 1;
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