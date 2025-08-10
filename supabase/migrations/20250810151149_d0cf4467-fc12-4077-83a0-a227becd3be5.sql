-- Update courses table to include expected_exams field for progress calculation
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS expected_exams INTEGER DEFAULT 4;