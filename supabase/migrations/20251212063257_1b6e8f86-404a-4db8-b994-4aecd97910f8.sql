-- Fix detect_schedule_conflicts to check TIME OVERLAP, not just date occurrence
CREATE OR REPLACE FUNCTION public.detect_schedule_conflicts(
  p_user_id UUID,
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_end_time TIMESTAMP WITH TIME ZONE,
  p_exclude_id UUID DEFAULT NULL
) RETURNS TABLE(
  conflict_type TEXT,
  conflict_id UUID,
  conflict_title TEXT,
  conflict_start TIMESTAMP WITH TIME ZONE,
  conflict_end TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
DECLARE
  target_date DATE;
BEGIN
  target_date := p_start_time::DATE;

  -- Check for assignment conflicts (assignments that fall within the time range)
  RETURN QUERY
  SELECT 
    'assignment'::TEXT,
    a.id,
    a.title,
    a.due_date - INTERVAL '1 hour',
    a.due_date
  FROM public.assignments a
  WHERE a.user_id = p_user_id
    AND (p_exclude_id IS NULL OR a.id != p_exclude_id)
    AND a.due_date >= p_start_time 
    AND a.due_date <= p_end_time;

  -- Check for exam conflicts (exams that overlap with the time range)
  RETURN QUERY
  SELECT 
    'exam'::TEXT,
    e.id,
    e.title,
    e.exam_date,
    e.exam_date + (COALESCE(e.duration_minutes, 60) * INTERVAL '1 minute')
  FROM public.exams e
  WHERE e.user_id = p_user_id
    AND (p_exclude_id IS NULL OR e.id != p_exclude_id)
    AND e.exam_date < p_end_time
    AND (e.exam_date + (COALESCE(e.duration_minutes, 60) * INTERVAL '1 minute')) > p_start_time;

  -- Check for schedule block conflicts (classes) with proper TIME OVERLAP check
  -- A conflict exists when: existing_start < new_end AND existing_end > new_start
  RETURN QUERY
  SELECT 
    'class'::TEXT,
    sb.id,
    sb.title,
    (target_date + sb.start_time)::TIMESTAMP WITH TIME ZONE,
    (target_date + sb.end_time)::TIMESTAMP WITH TIME ZONE
  FROM public.schedule_blocks sb
  WHERE sb.user_id = p_user_id
    AND (p_exclude_id IS NULL OR sb.id != p_exclude_id)
    AND sb.is_active = true
    AND public.should_class_occur_on_date(sb.id, target_date)
    -- Time overlap check: existing block overlaps with new event time range
    AND (target_date + sb.start_time)::TIMESTAMP WITH TIME ZONE < p_end_time
    AND (target_date + sb.end_time)::TIMESTAMP WITH TIME ZONE > p_start_time;
END;
$$;