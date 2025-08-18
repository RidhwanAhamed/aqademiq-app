-- Fix security warnings by setting search path for the function
CREATE OR REPLACE FUNCTION public.generate_sync_hash(
  entity_type TEXT,
  entity_data JSONB
) RETURNS TEXT
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  RETURN encode(sha256(entity_type::bytea || entity_data::text::bytea), 'hex');
END;
$$;