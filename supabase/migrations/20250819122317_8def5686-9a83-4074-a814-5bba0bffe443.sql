-- Fix the function search path for security
CREATE OR REPLACE FUNCTION calculate_performance_metrics(p_user_id UUID)
RETURNS void AS $$
DECLARE
    course_record RECORD;
    avg_grade NUMERIC;
    completion_rate NUMERIC;
    study_consistency NUMERIC;
    assignment_count INTEGER;
    completed_assignments INTEGER;
    total_study_hours NUMERIC;
    days_with_study INTEGER;
BEGIN
    -- Clear existing metrics for this user
    DELETE FROM public.performance_analytics WHERE user_id = p_user_id;
    
    -- Calculate metrics for each course
    FOR course_record IN 
        SELECT id, name FROM public.courses WHERE user_id = p_user_id AND is_active = true
    LOOP
        -- Calculate average grade for course
        SELECT COALESCE(AVG(grade_points), 0) INTO avg_grade
        FROM (
            SELECT grade_points FROM public.assignments 
            WHERE user_id = p_user_id AND course_id = course_record.id AND grade_points IS NOT NULL
            UNION ALL
            SELECT grade_points FROM public.exams 
            WHERE user_id = p_user_id AND course_id = course_record.id AND grade_points IS NOT NULL
        ) grades;
        
        -- Calculate completion rate
        SELECT COUNT(*) INTO assignment_count
        FROM public.assignments 
        WHERE user_id = p_user_id AND course_id = course_record.id;
        
        SELECT COUNT(*) INTO completed_assignments
        FROM public.assignments 
        WHERE user_id = p_user_id AND course_id = course_record.id AND is_completed = true;
        
        completion_rate := CASE 
            WHEN assignment_count > 0 THEN (completed_assignments::NUMERIC / assignment_count::NUMERIC) * 100
            ELSE 0 
        END;
        
        -- Calculate study hours for this course
        SELECT COALESCE(SUM(
            EXTRACT(EPOCH FROM (
                COALESCE(actual_end, scheduled_end) - COALESCE(actual_start, scheduled_start)
            )) / 3600
        ), 0) INTO total_study_hours
        FROM public.study_sessions 
        WHERE user_id = p_user_id AND course_id = course_record.id AND status = 'completed';
        
        -- Insert performance metrics
        INSERT INTO public.performance_analytics (
            user_id, course_id, metric_type, metric_value, time_period, calculation_date, metadata
        ) VALUES 
        (p_user_id, course_record.id, 'average_grade', avg_grade, 'all_time', CURRENT_DATE, 
         jsonb_build_object('course_name', course_record.name)),
        (p_user_id, course_record.id, 'completion_rate', completion_rate, 'all_time', CURRENT_DATE,
         jsonb_build_object('course_name', course_record.name, 'total_assignments', assignment_count, 'completed', completed_assignments)),
        (p_user_id, course_record.id, 'study_hours', total_study_hours, 'all_time', CURRENT_DATE,
         jsonb_build_object('course_name', course_record.name));
    END LOOP;
    
    -- Calculate overall metrics
    SELECT COALESCE(AVG(grade_points), 0) INTO avg_grade
    FROM (
        SELECT grade_points FROM public.assignments 
        WHERE user_id = p_user_id AND grade_points IS NOT NULL
        UNION ALL
        SELECT grade_points FROM public.exams 
        WHERE user_id = p_user_id AND grade_points IS NOT NULL
    ) all_grades;
    
    -- Overall completion rate
    SELECT COUNT(*) INTO assignment_count FROM public.assignments WHERE user_id = p_user_id;
    SELECT COUNT(*) INTO completed_assignments FROM public.assignments WHERE user_id = p_user_id AND is_completed = true;
    
    completion_rate := CASE 
        WHEN assignment_count > 0 THEN (completed_assignments::NUMERIC / assignment_count::NUMERIC) * 100
        ELSE 0 
    END;
    
    -- Study consistency (days with study sessions in last 30 days)
    SELECT COUNT(DISTINCT DATE(scheduled_start)) INTO days_with_study
    FROM public.study_sessions 
    WHERE user_id = p_user_id 
      AND status = 'completed' 
      AND scheduled_start >= CURRENT_DATE - INTERVAL '30 days';
    
    study_consistency := (days_with_study::NUMERIC / 30::NUMERIC) * 100;
    
    -- Total study hours
    SELECT COALESCE(SUM(
        EXTRACT(EPOCH FROM (
            COALESCE(actual_end, scheduled_end) - COALESCE(actual_start, scheduled_start)
        )) / 3600
    ), 0) INTO total_study_hours
    FROM public.study_sessions 
    WHERE user_id = p_user_id AND status = 'completed';
    
    -- Insert overall metrics
    INSERT INTO public.performance_analytics (
        user_id, course_id, metric_type, metric_value, time_period, calculation_date, metadata
    ) VALUES 
    (p_user_id, NULL, 'overall_grade', avg_grade, 'all_time', CURRENT_DATE,
     jsonb_build_object('total_assignments', assignment_count)),
    (p_user_id, NULL, 'overall_completion', completion_rate, 'all_time', CURRENT_DATE,
     jsonb_build_object('total_assignments', assignment_count, 'completed', completed_assignments)),
    (p_user_id, NULL, 'study_consistency', study_consistency, 'monthly', CURRENT_DATE,
     jsonb_build_object('days_studied', days_with_study, 'total_days', 30)),
    (p_user_id, NULL, 'total_study_hours', total_study_hours, 'all_time', CURRENT_DATE,
     jsonb_build_object('sessions_count', (SELECT COUNT(*) FROM public.study_sessions WHERE user_id = p_user_id AND status = 'completed')));
     
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '';