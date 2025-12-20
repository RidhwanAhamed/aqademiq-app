-- Create cornell_notes table for saving generated notes
CREATE TABLE public.cornell_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  document JSONB NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('topic', 'file')),
  source_file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.cornell_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own cornell notes"
  ON public.cornell_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cornell notes"
  ON public.cornell_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cornell notes"
  ON public.cornell_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cornell notes"
  ON public.cornell_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_cornell_notes_user_id ON public.cornell_notes(user_id);
CREATE INDEX idx_cornell_notes_created_at ON public.cornell_notes(created_at DESC);

-- Create storage bucket for uploaded documents
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('documents', 'documents', false, 20971520)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy for document uploads - users can upload their own documents
CREATE POLICY "Users can upload documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS Policy for document reads - users can read their own documents
CREATE POLICY "Users can read own documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS Policy for document deletes - users can delete their own documents
CREATE POLICY "Users can delete own documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);