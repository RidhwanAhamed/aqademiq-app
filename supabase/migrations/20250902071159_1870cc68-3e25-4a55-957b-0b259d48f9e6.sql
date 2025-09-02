-- Fix google_tokens table constraints to resolve OAuth error
-- Add primary key constraint on id column
ALTER TABLE public.google_tokens ADD CONSTRAINT google_tokens_pkey PRIMARY KEY (id);

-- Add unique constraint on user_id to allow ON CONFLICT operations
ALTER TABLE public.google_tokens ADD CONSTRAINT google_tokens_user_id_unique UNIQUE (user_id);

-- Create index on user_id for better performance
CREATE INDEX IF NOT EXISTS idx_google_tokens_user_id ON public.google_tokens(user_id);