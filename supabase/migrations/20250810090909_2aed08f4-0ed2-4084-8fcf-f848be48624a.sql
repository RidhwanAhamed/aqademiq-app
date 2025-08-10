-- Fix function search_path security issue
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
BEGIN
  -- Check for assignment conflicts
  RETURN QUERY
  SELECT 
    'assignment'::TEXT,
    a.id,
    a.title,
    a.due_date - INTERVAL '1 hour', -- Assume 1 hour before due date
    a.due_date
  FROM public.assignments a
  WHERE a.user_id = p_user_id
    AND (p_exclude_id IS NULL OR a.id != p_exclude_id)
    AND a.due_date BETWEEN p_start_time AND p_end_time;

  -- Check for exam conflicts
  RETURN QUERY
  SELECT 
    'exam'::TEXT,
    e.id,
    e.title,
    e.exam_date,
    e.exam_date + (e.duration_minutes * INTERVAL '1 minute')
  FROM public.exams e
  WHERE e.user_id = p_user_id
    AND (p_exclude_id IS NULL OR e.id != p_exclude_id)
    AND e.exam_date BETWEEN p_start_time AND p_end_time;

  -- Check for schedule block conflicts (classes)
  RETURN QUERY
  SELECT 
    'class'::TEXT,
    sb.id,
    sb.title,
    (CURRENT_DATE + sb.start_time)::TIMESTAMP WITH TIME ZONE,
    (CURRENT_DATE + sb.end_time)::TIMESTAMP WITH TIME ZONE
  FROM public.schedule_blocks sb
  WHERE sb.user_id = p_user_id
    AND (p_exclude_id IS NULL OR sb.id != p_exclude_id)
    AND sb.is_active = true
    AND public.should_class_occur_on_date(sb.id, p_start_time::DATE);
END;
$$;

-- Create storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('study-files', 'study-files', false);

-- Create storage policies for file uploads
CREATE POLICY "Users can upload their own files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'study-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'study-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'study-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'study-files' AND auth.uid()::text = (storage.foldername(name))[1]);