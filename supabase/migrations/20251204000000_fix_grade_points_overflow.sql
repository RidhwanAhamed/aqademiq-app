-- Fix grade_points column overflow issue
-- The original DECIMAL(3,2) only allows values up to 9.99 (designed for 10-point GPA scale)
-- Changing to DECIMAL(10,2) to allow actual point values like 78/100, 95/100, etc.

-- Alter grade_points column in assignments table
ALTER TABLE public.assignments 
ALTER COLUMN grade_points TYPE DECIMAL(10,2);

-- Alter grade_points column in exams table  
ALTER TABLE public.exams
ALTER COLUMN grade_points TYPE DECIMAL(10,2);

-- Also fix grade_total if it has the same issue
ALTER TABLE public.assignments 
ALTER COLUMN grade_total TYPE DECIMAL(10,2);

ALTER TABLE public.exams
ALTER COLUMN grade_total TYPE DECIMAL(10,2);

