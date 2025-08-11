-- Add grade_total column to assignments table for calculating percentages
ALTER TABLE public.assignments 
ADD COLUMN IF NOT EXISTS grade_total numeric DEFAULT NULL;

-- Add grade_total column to exams table for calculating percentages  
ALTER TABLE public.exams
ADD COLUMN IF NOT EXISTS grade_total numeric DEFAULT NULL;

-- Create function to calculate GPA for a user
CREATE OR REPLACE FUNCTION public.calculate_user_gpa(p_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  total_points numeric := 0;
  total_credits numeric := 0;
  course_record RECORD;
  assignment_avg numeric;
  exam_avg numeric;
  course_gpa numeric;
BEGIN
  -- Loop through each course
  FOR course_record IN 
    SELECT c.id, c.credits, c.target_grade
    FROM public.courses c 
    WHERE c.user_id = p_user_id 
    AND c.is_active = true
  LOOP
    -- Calculate assignment average for this course
    SELECT AVG(CASE 
      WHEN grade_total > 0 THEN (grade_points / grade_total) * 10 
      ELSE NULL 
    END) INTO assignment_avg
    FROM public.assignments 
    WHERE course_id = course_record.id 
    AND grade_points IS NOT NULL 
    AND grade_total IS NOT NULL;
    
    -- Calculate exam average for this course
    SELECT AVG(CASE 
      WHEN grade_total > 0 THEN (grade_points / grade_total) * 10 
      ELSE NULL 
    END) INTO exam_avg
    FROM public.exams 
    WHERE course_id = course_record.id 
    AND grade_points IS NOT NULL 
    AND grade_total IS NOT NULL;
    
    -- Calculate course GPA (weighted: 60% assignments, 40% exams)
    IF assignment_avg IS NOT NULL AND exam_avg IS NOT NULL THEN
      course_gpa := (assignment_avg * 0.6) + (exam_avg * 0.4);
    ELSIF assignment_avg IS NOT NULL THEN
      course_gpa := assignment_avg;
    ELSIF exam_avg IS NOT NULL THEN
      course_gpa := exam_avg;
    ELSE
      course_gpa := NULL;
    END IF;
    
    -- Add to totals if we have a GPA for this course
    IF course_gpa IS NOT NULL THEN
      total_points := total_points + (course_gpa * course_record.credits);
      total_credits := total_credits + course_record.credits;
    END IF;
  END LOOP;
  
  -- Return overall GPA
  IF total_credits > 0 THEN
    RETURN total_points / total_credits;
  ELSE
    RETURN NULL;
  END IF;
END;
$$;

-- Create function to update course progress based on completed assignments/exams
CREATE OR REPLACE FUNCTION public.update_course_progress(p_course_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  total_items integer := 0;
  completed_items integer := 0;
  progress_percentage integer;
BEGIN
  -- Count total assignments and exams for the course
  SELECT 
    COUNT(*) INTO total_items
  FROM (
    SELECT id FROM public.assignments WHERE course_id = p_course_id
    UNION ALL
    SELECT id FROM public.exams WHERE course_id = p_course_id
  ) combined;
  
  -- Count completed assignments and exams
  SELECT 
    COUNT(*) INTO completed_items
  FROM (
    SELECT id FROM public.assignments 
    WHERE course_id = p_course_id AND is_completed = true
    UNION ALL
    SELECT id FROM public.exams 
    WHERE course_id = p_course_id AND grade_points IS NOT NULL
  ) completed;
  
  -- Calculate progress percentage
  IF total_items > 0 THEN
    progress_percentage := ROUND((completed_items::decimal / total_items::decimal) * 100);
  ELSE
    progress_percentage := 0;
  END IF;
  
  -- Update course progress
  UPDATE public.courses 
  SET 
    progress_percentage = progress_percentage,
    current_gpa = public.calculate_user_gpa((SELECT user_id FROM public.courses WHERE id = p_course_id)),
    updated_at = now()
  WHERE id = p_course_id;
END;
$$;

-- Create trigger to update course progress when assignments/exams change
CREATE OR REPLACE FUNCTION public.trigger_update_course_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Update progress for the affected course
  IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT' THEN
    PERFORM public.update_course_progress(NEW.course_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.update_course_progress(OLD.course_id);
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create triggers for assignments and exams
DROP TRIGGER IF EXISTS trigger_assignment_progress ON public.assignments;
CREATE TRIGGER trigger_assignment_progress
  AFTER INSERT OR UPDATE OR DELETE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.trigger_update_course_progress();

DROP TRIGGER IF EXISTS trigger_exam_progress ON public.exams;
CREATE TRIGGER trigger_exam_progress
  AFTER INSERT OR UPDATE OR DELETE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.trigger_update_course_progress();

-- Enhanced revision task generation function
CREATE OR REPLACE FUNCTION public.generate_revision_tasks_for_exam(p_exam_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  exam_record RECORD;
  assignment_record RECORD;
  days_before_exam INTEGER;
  revision_date TIMESTAMP WITH TIME ZONE;
  total_study_hours INTEGER;
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
  
  -- Calculate total planned study hours
  total_study_hours := COALESCE(exam_record.study_hours_planned, 10);
  
  -- Delete existing revision tasks for this exam to avoid duplicates
  DELETE FROM public.revision_tasks 
  WHERE exam_id = p_exam_id AND user_id = p_user_id;
  
  -- Generate spaced repetition revision schedule
  
  -- Final review (1 day before) - 15% of total hours
  IF days_before_exam >= 1 THEN
    revision_date := exam_record.exam_date - interval '1 day';
    INSERT INTO public.revision_tasks (
      user_id, exam_id, title, description, due_date, task_type, 
      estimated_hours, priority
    ) VALUES (
      p_user_id, p_exam_id,
      'Final Review - ' || exam_record.title,
      'Final intensive review session. Go through key formulas, concepts, and practice quick problems.',
      revision_date,
      'review',
      GREATEST(ROUND(total_study_hours * 0.15), 1),
      1
    );
  END IF;
  
  -- Practice session (3 days before) - 25% of total hours
  IF days_before_exam >= 3 THEN
    revision_date := exam_record.exam_date - interval '3 days';
    INSERT INTO public.revision_tasks (
      user_id, exam_id, title, description, due_date, task_type, 
      estimated_hours, priority
    ) VALUES (
      p_user_id, p_exam_id,
      'Practice Session - ' || exam_record.title,
      'Intensive practice with past papers and mock exams. Focus on time management and problem-solving strategies.',
      revision_date,
      'practice',
      GREATEST(ROUND(total_study_hours * 0.25), 2),
      2
    );
  END IF;
  
  -- Comprehensive review (1 week before) - 30% of total hours
  IF days_before_exam >= 7 THEN
    revision_date := exam_record.exam_date - interval '7 days';
    INSERT INTO public.revision_tasks (
      user_id, exam_id, title, description, due_date, task_type, 
      estimated_hours, priority
    ) VALUES (
      p_user_id, p_exam_id,
      'Comprehensive Review - ' || exam_record.title,
      'Complete review of all topics. Create mind maps, summarize key concepts, and identify weak areas.',
      revision_date,
      'revision',
      GREATEST(ROUND(total_study_hours * 0.3), 3),
      2
    );
  END IF;
  
  -- Initial study phase (2 weeks before) - 30% of total hours
  IF days_before_exam >= 14 THEN
    revision_date := exam_record.exam_date - interval '14 days';
    INSERT INTO public.revision_tasks (
      user_id, exam_id, title, description, due_date, task_type, 
      estimated_hours, priority
    ) VALUES (
      p_user_id, p_exam_id,
      'Initial Study - ' || exam_record.title,
      'Begin systematic study of all exam topics. Read through materials and take detailed notes.',
      revision_date,
      'study',
      GREATEST(ROUND(total_study_hours * 0.3), 3),
      3
    );
  END IF;
  
  -- Generate revision tasks for linked assignments (higher priority)
  FOR assignment_record IN 
    SELECT * FROM public.assignments 
    WHERE exam_id = p_exam_id AND user_id = p_user_id
  LOOP
    -- Assignment-specific review (5 days before exam)
    IF days_before_exam >= 5 THEN
      revision_date := exam_record.exam_date - interval '5 days';
      INSERT INTO public.revision_tasks (
        user_id, exam_id, assignment_id, title, description, due_date, 
        task_type, estimated_hours, priority
      ) VALUES (
        p_user_id, p_exam_id, assignment_record.id,
        'Review Assignment: ' || assignment_record.title,
        'Review and analyze this assignment. Extract key concepts and methods that may appear in the exam.',
        revision_date,
        'summary',
        GREATEST(ROUND(assignment_record.estimated_hours * 0.5), 1),
        2
      );
    END IF;
  END LOOP;
END;
$$;