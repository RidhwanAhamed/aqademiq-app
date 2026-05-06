-- Allow fractional estimated time for assignments.
-- Previously `estimated_hours` was an INTEGER, which prevented durations like 0.25h (15 minutes).
-- Convert it to NUMERIC so the frontend can store precise estimates (rounded to 2 decimals).

ALTER TABLE public.assignments
  ALTER COLUMN estimated_hours TYPE numeric(6,2)
  USING estimated_hours::numeric;

-- Keep an explicit default (matches previous behavior).
ALTER TABLE public.assignments
  ALTER COLUMN estimated_hours SET DEFAULT 1;

