-- =============================================================================
-- Course Files Support Migration
-- Adds course_id, source_type, display_name, description to file_uploads
-- =============================================================================

-- Add course_id column to file_uploads for course-specific file association
ALTER TABLE public.file_uploads 
ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;

-- Add source_type column for categorization (syllabus, notes, lecture, textbook, other)
ALTER TABLE public.file_uploads 
ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'other';

-- Add display_name for user-friendly naming
ALTER TABLE public.file_uploads 
ADD COLUMN IF NOT EXISTS display_name text;

-- Add description for file context
ALTER TABLE public.file_uploads 
ADD COLUMN IF NOT EXISTS description text;

-- Create indexes for efficient course-based queries
CREATE INDEX IF NOT EXISTS idx_file_uploads_course_id ON public.file_uploads(course_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_user_course ON public.file_uploads(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_source_type ON public.file_uploads(source_type);

-- Add constraint to validate source_type values
ALTER TABLE public.file_uploads 
ADD CONSTRAINT file_uploads_source_type_check 
CHECK (source_type IN ('syllabus', 'lecture', 'notes', 'textbook', 'assignment', 'other') OR source_type IS NULL);

-- Comment on columns for documentation
COMMENT ON COLUMN public.file_uploads.course_id IS 'Reference to the course this file belongs to';
COMMENT ON COLUMN public.file_uploads.source_type IS 'Type of file: syllabus, lecture, notes, textbook, assignment, other';
COMMENT ON COLUMN public.file_uploads.display_name IS 'User-friendly display name for the file';
COMMENT ON COLUMN public.file_uploads.description IS 'Optional description of the file content';