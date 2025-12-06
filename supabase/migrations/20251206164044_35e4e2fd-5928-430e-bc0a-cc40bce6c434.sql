-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Document embeddings table for RAG
CREATE TABLE public.document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_upload_id UUID REFERENCES public.file_uploads(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL, -- Future: course-specific docs
  chunk_index INTEGER NOT NULL DEFAULT 0, -- Order of chunk in document
  content TEXT NOT NULL, -- The text chunk
  embedding vector(1536), -- OpenAI embedding dimension
  metadata JSONB DEFAULT '{}', -- Store chunk info, page numbers, section titles, etc.
  source_type TEXT DEFAULT 'upload', -- 'upload', 'syllabus', 'notes', 'lecture', etc.
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_document_embeddings_user_id ON public.document_embeddings(user_id);
CREATE INDEX idx_document_embeddings_course_id ON public.document_embeddings(course_id);
CREATE INDEX idx_document_embeddings_file_upload_id ON public.document_embeddings(file_upload_id);
CREATE INDEX idx_document_embeddings_source_type ON public.document_embeddings(source_type);

-- Create HNSW index for fast similarity search (better than ivfflat for this use case)
CREATE INDEX idx_document_embeddings_vector ON public.document_embeddings 
USING hnsw (embedding vector_cosine_ops);

-- Enable RLS
ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own embeddings"
ON public.document_embeddings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own embeddings"
ON public.document_embeddings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own embeddings"
ON public.document_embeddings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own embeddings"
ON public.document_embeddings FOR DELETE
USING (auth.uid() = user_id);

-- Function to search similar documents using vector similarity
CREATE OR REPLACE FUNCTION public.search_documents(
  p_user_id UUID,
  p_query_embedding vector(1536),
  p_match_threshold FLOAT DEFAULT 0.7,
  p_match_count INT DEFAULT 5,
  p_course_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity FLOAT,
  metadata JSONB,
  source_type TEXT,
  course_id UUID,
  file_upload_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.id,
    de.content,
    1 - (de.embedding <=> p_query_embedding) AS similarity,
    de.metadata,
    de.source_type,
    de.course_id,
    de.file_upload_id
  FROM public.document_embeddings de
  WHERE de.user_id = p_user_id
    AND (p_course_id IS NULL OR de.course_id = p_course_id)
    AND 1 - (de.embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY de.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_document_embeddings_updated_at
BEFORE UPDATE ON public.document_embeddings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();