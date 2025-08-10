-- Add OCR Space API key secret
-- Create table for file uploads and parsing results
CREATE TABLE public.file_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT,
  file_type TEXT NOT NULL,
  ocr_text TEXT,
  parsed_data JSONB,
  status TEXT NOT NULL DEFAULT 'uploading',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own file uploads" 
ON public.file_uploads 
FOR ALL 
USING (auth.uid() = user_id);

-- Create table for StudySage chat messages
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_user BOOLEAN NOT NULL DEFAULT true,
  file_upload_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own chat messages" 
ON public.chat_messages 
FOR ALL 
USING (auth.uid() = user_id);

-- Add trigger for file uploads updated_at
CREATE TRIGGER update_file_uploads_updated_at
BEFORE UPDATE ON public.file_uploads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to detect schedule conflicts
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
) LANGUAGE plpgsql SECURITY DEFINER AS $$
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