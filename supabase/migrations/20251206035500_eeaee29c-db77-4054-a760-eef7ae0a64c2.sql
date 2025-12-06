-- Fix numeric precision for grade_points and grade_total columns in assignments table
-- The current precision (3,2) only allows values up to 9.99, but grades can be 0-100+

ALTER TABLE public.assignments 
  ALTER COLUMN grade_points TYPE numeric(8,2),
  ALTER COLUMN grade_total TYPE numeric(8,2);

-- Also fix the same columns in exams table
ALTER TABLE public.exams
  ALTER COLUMN grade_points TYPE numeric(8,2),
  ALTER COLUMN grade_total TYPE numeric(8,2);