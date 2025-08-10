-- Add recurring assignment support to assignments table
ALTER TABLE public.assignments 
ADD COLUMN is_recurring boolean DEFAULT false,
ADD COLUMN recurrence_pattern text DEFAULT NULL,
ADD COLUMN recurrence_interval integer DEFAULT 1,
ADD COLUMN recurrence_end_date date DEFAULT NULL,
ADD COLUMN parent_assignment_id uuid DEFAULT NULL,
ADD COLUMN original_due_date timestamp with time zone DEFAULT NULL;

-- Add index for better performance on recurring assignment queries
CREATE INDEX idx_assignments_parent_id ON public.assignments(parent_assignment_id);
CREATE INDEX idx_assignments_recurring ON public.assignments(is_recurring, recurrence_pattern);

-- Add check constraints for valid recurrence patterns
ALTER TABLE public.assignments 
ADD CONSTRAINT valid_recurrence_pattern 
CHECK (recurrence_pattern IS NULL OR recurrence_pattern IN ('daily', 'weekly', 'biweekly', 'monthly', 'yearly'));

-- Add check constraint to ensure recurring assignments have required fields
ALTER TABLE public.assignments 
ADD CONSTRAINT recurring_fields_check 
CHECK (
  (is_recurring = false) OR 
  (is_recurring = true AND recurrence_pattern IS NOT NULL AND recurrence_end_date IS NOT NULL)
);

-- Create function to generate recurring assignment instances
CREATE OR REPLACE FUNCTION public.generate_recurring_assignments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  recurring_assignment RECORD;
  next_due_date timestamp with time zone;
  interval_text text;
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
    
    WHILE next_due_date::date <= recurring_assignment.recurrence_end_date 
    AND NOT EXISTS (
      SELECT 1 FROM public.assignments 
      WHERE parent_assignment_id = recurring_assignment.id 
      AND due_date::date = next_due_date::date
    )
    AND next_due_date::date <= CURRENT_DATE + interval '30 days' -- Only generate 30 days ahead
    LOOP
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
      
      -- Calculate next due date
      next_due_date := next_due_date + interval_text::interval;
    END LOOP;
  END LOOP;
END;
$$;

-- Create a trigger to automatically generate recurring assignments daily
CREATE OR REPLACE FUNCTION public.trigger_generate_recurring_assignments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.generate_recurring_assignments();
  RETURN NULL;
END;
$$;