-- Create holiday periods table for managing breaks and holidays
CREATE TABLE public.holiday_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Enable RLS on holiday_periods
ALTER TABLE public.holiday_periods ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for holiday_periods
CREATE POLICY "Users can manage their own holiday periods"
ON public.holiday_periods
FOR ALL
USING (auth.uid() = user_id);

-- Add index for better performance
CREATE INDEX idx_holiday_periods_user_dates ON public.holiday_periods(user_id, start_date, end_date);

-- Create trigger for updated_at
CREATE TRIGGER update_holiday_periods_updated_at
BEFORE UPDATE ON public.holiday_periods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update the reminders table to support holiday period awareness
ALTER TABLE public.reminders 
ADD COLUMN respect_holidays BOOLEAN DEFAULT true;

-- Create function to check if a date falls within any holiday period
CREATE OR REPLACE FUNCTION public.is_holiday_period(
  p_user_id UUID,
  p_date DATE
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.holiday_periods 
    WHERE user_id = p_user_id 
    AND is_active = true 
    AND p_date >= start_date 
    AND p_date <= end_date
  );
END;
$$;

-- Update the recurring assignment generation function to be aware of holidays
CREATE OR REPLACE FUNCTION public.generate_recurring_assignments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  recurring_assignment RECORD;
  next_due_date timestamp with time zone;
  interval_text text;
  skip_count integer;
BEGIN
  -- Loop through all active recurring assignments
  FOR recurring_assignment IN 
    SELECT * FROM public.assignments 
    WHERE is_recurring = true 
    AND parent_assignment_id IS NULL 
    AND recurrence_end_date > CURRENT_DATE
  LOOP
    -- Calculate the next due date based on pattern
    CASE recurring_assignment.recurrence_pattern
      WHEN 'daily' THEN
        interval_text := recurring_assignment.recurrence_interval || ' days';
      WHEN 'weekly' THEN
        interval_text := (recurring_assignment.recurrence_interval * 7) || ' days';
      WHEN 'biweekly' THEN
        interval_text := (recurring_assignment.recurrence_interval * 14) || ' days';
      WHEN 'monthly' THEN
        interval_text := recurring_assignment.recurrence_interval || ' months';
      WHEN 'yearly' THEN
        interval_text := recurring_assignment.recurrence_interval || ' years';
    END CASE;
    
    -- Find the latest generated instance or use original due date
    SELECT COALESCE(MAX(due_date), recurring_assignment.due_date) 
    INTO next_due_date
    FROM public.assignments 
    WHERE parent_assignment_id = recurring_assignment.id;
    
    -- Generate next instance if it doesn't exist and is within the end date
    next_due_date := next_due_date + interval_text::interval;
    skip_count := 0;
    
    WHILE next_due_date::date <= recurring_assignment.recurrence_end_date 
    AND NOT EXISTS (
      SELECT 1 FROM public.assignments 
      WHERE parent_assignment_id = recurring_assignment.id 
      AND due_date::date = next_due_date::date
    )
    AND next_due_date::date <= CURRENT_DATE + interval '30 days' -- Only generate 30 days ahead
    AND skip_count < 50 -- Prevent infinite loops
    LOOP
      -- Check if this date falls within a holiday period
      IF NOT public.is_holiday_period(recurring_assignment.user_id, next_due_date::date) THEN
        -- Insert the new recurring instance
        INSERT INTO public.assignments (
          user_id, course_id, title, description, due_date, estimated_hours,
          notes, priority, assignment_type, parent_assignment_id, original_due_date
        ) VALUES (
          recurring_assignment.user_id,
          recurring_assignment.course_id,
          recurring_assignment.title,
          recurring_assignment.description,
          next_due_date,
          recurring_assignment.estimated_hours,
          recurring_assignment.notes,
          recurring_assignment.priority,
          recurring_assignment.assignment_type,
          recurring_assignment.id,
          recurring_assignment.due_date
        );
      END IF;
      
      -- Calculate next due date
      next_due_date := next_due_date + interval_text::interval;
      skip_count := skip_count + 1;
    END LOOP;
  END LOOP;
END;
$$;