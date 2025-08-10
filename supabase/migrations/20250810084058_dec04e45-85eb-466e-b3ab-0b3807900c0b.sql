-- Create revision tasks table for exam preparation
CREATE TABLE public.revision_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 2,
  estimated_hours INTEGER DEFAULT 2,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  task_type TEXT DEFAULT 'revision' CHECK (task_type IN ('revision', 'practice', 'summary', 'review')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on revision_tasks
ALTER TABLE public.revision_tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for revision_tasks
CREATE POLICY "Users can manage their own revision tasks"
ON public.revision_tasks
FOR ALL
USING (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX idx_revision_tasks_exam_id ON public.revision_tasks(exam_id);
CREATE INDEX idx_revision_tasks_user_due ON public.revision_tasks(user_id, due_date);

-- Create trigger for updated_at
CREATE TRIGGER update_revision_tasks_updated_at
BEFORE UPDATE ON public.revision_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add exam_id to assignments table for linking
ALTER TABLE public.assignments 
ADD COLUMN exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL;

-- Add index for assignment-exam linking
CREATE INDEX idx_assignments_exam_id ON public.assignments(exam_id);

-- Create function to automatically generate revision tasks when exam is linked
CREATE OR REPLACE FUNCTION public.generate_revision_tasks_for_exam(
  p_exam_id UUID,
  p_user_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  exam_record RECORD;
  assignment_record RECORD;
  days_before_exam INTEGER;
  revision_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get exam details
  SELECT * INTO exam_record 
  FROM public.exams 
  WHERE id = p_exam_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calculate days before exam
  days_before_exam := (exam_record.exam_date::date - CURRENT_DATE);
  
  -- Only generate tasks if exam is in the future and within 30 days
  IF days_before_exam <= 0 OR days_before_exam > 30 THEN
    RETURN;
  END IF;
  
  -- Generate general revision tasks
  -- Final review (1 day before)
  IF days_before_exam >= 1 THEN
    revision_date := exam_record.exam_date - interval '1 day';
    INSERT INTO public.revision_tasks (
      user_id, exam_id, title, description, due_date, task_type, estimated_hours, priority
    ) VALUES (
      p_user_id, p_exam_id,
      'Final Review - ' || exam_record.title,
      'Final review session before the exam. Go through key concepts and practice questions.',
      revision_date,
      'review',
      2,
      1
    ) ON CONFLICT DO NOTHING;
  END IF;
  
  -- Practice session (3 days before)
  IF days_before_exam >= 3 THEN
    revision_date := exam_record.exam_date - interval '3 days';
    INSERT INTO public.revision_tasks (
      user_id, exam_id, title, description, due_date, task_type, estimated_hours, priority
    ) VALUES (
      p_user_id, p_exam_id,
      'Practice Questions - ' || exam_record.title,
      'Practice exam questions and test your understanding of key concepts.',
      revision_date,
      'practice',
      3,
      2
    ) ON CONFLICT DO NOTHING;
  END IF;
  
  -- Main revision (1 week before)
  IF days_before_exam >= 7 THEN
    revision_date := exam_record.exam_date - interval '7 days';
    INSERT INTO public.revision_tasks (
      user_id, exam_id, title, description, due_date, task_type, estimated_hours, priority
    ) VALUES (
      p_user_id, p_exam_id,
      'Main Revision - ' || exam_record.title,
      'Comprehensive revision of all topics covered. Create summaries and review notes.',
      revision_date,
      'revision',
      4,
      2
    ) ON CONFLICT DO NOTHING;
  END IF;
  
  -- Generate revision tasks for linked assignments
  FOR assignment_record IN 
    SELECT * FROM public.assignments 
    WHERE exam_id = p_exam_id AND user_id = p_user_id
  LOOP
    -- Assignment-specific revision (5 days before exam)
    IF days_before_exam >= 5 THEN
      revision_date := exam_record.exam_date - interval '5 days';
      INSERT INTO public.revision_tasks (
        user_id, exam_id, assignment_id, title, description, due_date, task_type, estimated_hours, priority
      ) VALUES (
        p_user_id, p_exam_id, assignment_record.id,
        'Review: ' || assignment_record.title,
        'Review and summarize key learnings from this assignment for the exam.',
        revision_date,
        'summary',
        2,
        2
      ) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

-- Create trigger function for automatic revision task generation
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

-- Create trigger on assignments for automatic revision task generation
CREATE TRIGGER assignment_exam_link_trigger
AFTER UPDATE ON public.assignments
FOR EACH ROW
EXECUTE FUNCTION public.trigger_generate_revision_tasks();