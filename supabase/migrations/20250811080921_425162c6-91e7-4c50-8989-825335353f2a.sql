-- Security hardening migration - fixing database vulnerabilities
-- Remove dangerous permissions from anon role and secure all tables

-- Ensure all sensitive functions are properly secured
-- Remove any dangerous permissions from anon role
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Grant only necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Ensure proper RLS policies are in place for all user-specific tables
-- Add additional security policies for sensitive operations

-- Profiles table - extra security
DROP POLICY IF EXISTS "profiles_strict_access" ON public.profiles;
CREATE POLICY "profiles_strict_access" ON public.profiles
FOR ALL USING (
    auth.uid() = user_id AND 
    auth.role() = 'authenticated'
);

-- Courses table - extra security
DROP POLICY IF EXISTS "courses_strict_access" ON public.courses;
CREATE POLICY "courses_strict_access" ON public.courses
FOR ALL USING (
    auth.uid() = user_id AND 
    auth.role() = 'authenticated'
);

-- Assignments table - extra security
DROP POLICY IF EXISTS "assignments_strict_access" ON public.assignments;
CREATE POLICY "assignments_strict_access" ON public.assignments
FOR ALL USING (
    auth.uid() = user_id AND 
    auth.role() = 'authenticated'
);

-- Exams table - extra security
DROP POLICY IF EXISTS "exams_strict_access" ON public.exams;
CREATE POLICY "exams_strict_access" ON public.exams
FOR ALL USING (
    auth.uid() = user_id AND 
    auth.role() = 'authenticated'
);

-- Study sessions table - extra security
DROP POLICY IF EXISTS "study_sessions_strict_access" ON public.study_sessions;
CREATE POLICY "study_sessions_strict_access" ON public.study_sessions
FOR ALL USING (
    auth.uid() = user_id AND 
    auth.role() = 'authenticated'
);

-- Semesters table - extra security
DROP POLICY IF EXISTS "semesters_strict_access" ON public.semesters;
CREATE POLICY "semesters_strict_access" ON public.semesters
FOR ALL USING (
    auth.uid() = user_id AND 
    auth.role() = 'authenticated'
);

-- Schedule blocks table - extra security
DROP POLICY IF EXISTS "schedule_blocks_strict_access" ON public.schedule_blocks;
CREATE POLICY "schedule_blocks_strict_access" ON public.schedule_blocks
FOR ALL USING (
    auth.uid() = user_id AND 
    auth.role() = 'authenticated'
);

-- Reminders table - extra security
DROP POLICY IF EXISTS "reminders_strict_access" ON public.reminders;
CREATE POLICY "reminders_strict_access" ON public.reminders
FOR ALL USING (
    auth.uid() = user_id AND 
    auth.role() = 'authenticated'
);

-- User stats table - extra security
DROP POLICY IF EXISTS "user_stats_strict_access" ON public.user_stats;
CREATE POLICY "user_stats_strict_access" ON public.user_stats
FOR ALL USING (
    auth.uid() = user_id AND 
    auth.role() = 'authenticated'
);

-- File uploads table - extra security
DROP POLICY IF EXISTS "file_uploads_strict_access" ON public.file_uploads;
CREATE POLICY "file_uploads_strict_access" ON public.file_uploads
FOR ALL USING (
    auth.uid() = user_id AND 
    auth.role() = 'authenticated'
);

-- Chat messages table - extra security
DROP POLICY IF EXISTS "chat_messages_strict_access" ON public.chat_messages;
CREATE POLICY "chat_messages_strict_access" ON public.chat_messages
FOR ALL USING (
    auth.uid() = user_id AND 
    auth.role() = 'authenticated'
);

-- AI insights history table - extra security
DROP POLICY IF EXISTS "ai_insights_history_strict_access" ON public.ai_insights_history;
CREATE POLICY "ai_insights_history_strict_access" ON public.ai_insights_history
FOR ALL USING (
    auth.uid() = user_id AND 
    auth.role() = 'authenticated'
);

-- Holiday periods table - extra security
DROP POLICY IF EXISTS "holiday_periods_strict_access" ON public.holiday_periods;
CREATE POLICY "holiday_periods_strict_access" ON public.holiday_periods
FOR ALL USING (
    auth.uid() = user_id AND 
    auth.role() = 'authenticated'
);

-- Revision tasks table - extra security
DROP POLICY IF EXISTS "revision_tasks_strict_access" ON public.revision_tasks;
CREATE POLICY "revision_tasks_strict_access" ON public.revision_tasks
FOR ALL USING (
    auth.uid() = user_id AND 
    auth.role() = 'authenticated'
);

-- Tasks table - extra security
DROP POLICY IF EXISTS "tasks_strict_access" ON public.tasks;
CREATE POLICY "tasks_strict_access" ON public.tasks
FOR ALL USING (
    auth.uid() = user_id AND 
    auth.role() = 'authenticated'
);

-- Add audit logging for security-sensitive operations
CREATE OR REPLACE FUNCTION public.log_security_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Log any suspicious activities (this is a placeholder for audit functionality)
    IF auth.role() != 'authenticated' THEN
        RAISE EXCEPTION 'Unauthorized access attempt logged';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on this function only to authenticated users
GRANT EXECUTE ON FUNCTION public.log_security_event() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.log_security_event() FROM anon;