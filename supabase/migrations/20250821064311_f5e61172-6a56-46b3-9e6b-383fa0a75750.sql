-- Fix ambiguous column reference in update_course_progress function
CREATE OR REPLACE FUNCTION public.update_course_progress(p_course_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  total_items integer := 0;
  completed_items integer := 0;
  calculated_progress_percentage integer;
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
    calculated_progress_percentage := ROUND((completed_items::decimal / total_items::decimal) * 100);
  ELSE
    calculated_progress_percentage := 0;
  END IF;
  
  -- Update course progress
  UPDATE public.courses 
  SET 
    progress_percentage = calculated_progress_percentage,
    current_gpa = public.calculate_user_gpa((SELECT user_id FROM public.courses WHERE id = p_course_id)),
    updated_at = now()
  WHERE id = p_course_id;
END;
$function$