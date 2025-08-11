-- Fix function search path security issue
-- Update all existing functions to have secure search_path

-- Fix the log_security_event function
CREATE OR REPLACE FUNCTION public.log_security_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Log any suspicious activities (this is a placeholder for audit functionality)
    IF auth.role() != 'authenticated' THEN
        RAISE EXCEPTION 'Unauthorized access attempt logged';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Fix all other existing functions to have secure search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_generate_recurring_assignments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.generate_recurring_assignments();
  RETURN NULL;
END;
$$;

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

CREATE OR REPLACE FUNCTION public.is_holiday_period(p_user_id uuid, p_date date)
RETURNS boolean
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

CREATE OR REPLACE FUNCTION public.trigger_generate_revision_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Generate revision tasks when assignment is linked to exam
  IF TG_OP = 'UPDATE' AND OLD.exam_id IS DISTINCT FROM NEW.exam_id AND NEW.exam_id IS NOT NULL THEN
    PERFORM public.generate_revision_tasks_for_exam(NEW.exam_id, NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$;