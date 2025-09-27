-- Fix ambiguous column reference in forecast_grade_trend function
CREATE OR REPLACE FUNCTION public.forecast_grade_trend(p_user_id uuid, p_course_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(course_id uuid, course_name text, current_average numeric, projected_30_days numeric, projected_semester_end numeric, trend_direction text, confidence_level text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  course_record RECORD;
BEGIN
  -- Loop through courses (specific course or all user's courses)
  FOR course_record IN 
    SELECT c.id, c.name 
    FROM public.courses c 
    WHERE c.user_id = p_user_id 
    AND c.is_active = true
    AND (p_course_id IS NULL OR c.id = p_course_id)
  LOOP
    -- Calculate current average from assignments and exams
    DECLARE
      recent_grades NUMERIC[];
      grade_dates DATE[];
      avg_grade NUMERIC;
      trend_slope NUMERIC;
      proj_30 NUMERIC;
      proj_semester NUMERIC;
      trend_dir TEXT;
      confidence TEXT;
    BEGIN
      -- Get recent grades (last 30 days) with explicit table aliases
      SELECT 
        array_agg(
          CASE WHEN combined_grades.grade_total > 0 THEN (combined_grades.grade_points / combined_grades.grade_total) * 10 ELSE NULL END
          ORDER BY combined_grades.created_at
        ),
        array_agg(combined_grades.created_at::date ORDER BY combined_grades.created_at)
      INTO recent_grades, grade_dates
      FROM (
        SELECT a.grade_points, a.grade_total, a.created_at 
        FROM public.assignments a
        WHERE a.course_id = course_record.id 
        AND a.grade_points IS NOT NULL 
        AND a.created_at >= CURRENT_DATE - INTERVAL '30 days'
        UNION ALL
        SELECT e.grade_points, e.grade_total, e.created_at 
        FROM public.exams e
        WHERE e.course_id = course_record.id 
        AND e.grade_points IS NOT NULL 
        AND e.created_at >= CURRENT_DATE - INTERVAL '30 days'
      ) combined_grades;
      
      -- Only proceed if we have grades
      IF recent_grades IS NOT NULL AND array_length(recent_grades, 1) > 0 THEN
        -- Calculate current average
        SELECT AVG(grade) INTO avg_grade 
        FROM unnest(recent_grades) AS grade 
        WHERE grade IS NOT NULL;
        
        -- Simple trend calculation (last grade vs first grade)
        IF array_length(recent_grades, 1) >= 2 THEN
          trend_slope := recent_grades[array_length(recent_grades, 1)] - recent_grades[1];
          
          -- Project trends
          proj_30 := GREATEST(0, LEAST(10, avg_grade + (trend_slope * 0.5)));
          proj_semester := GREATEST(0, LEAST(10, avg_grade + (trend_slope * 2)));
          
          -- Determine trend direction
          IF trend_slope > 0.3 THEN
            trend_dir := 'improving';
          ELSIF trend_slope < -0.3 THEN
            trend_dir := 'declining';
          ELSE
            trend_dir := 'stable';
          END IF;
          
          -- Confidence based on number of data points
          IF array_length(recent_grades, 1) >= 5 THEN
            confidence := 'high';
          ELSIF array_length(recent_grades, 1) >= 3 THEN
            confidence := 'medium';
          ELSE
            confidence := 'low';
          END IF;
        ELSE
          proj_30 := avg_grade;
          proj_semester := avg_grade;
          trend_dir := 'stable';
          confidence := 'low';
        END IF;
        
        RETURN QUERY SELECT 
          course_record.id,
          course_record.name,
          ROUND(avg_grade, 2),
          ROUND(proj_30, 2),
          ROUND(proj_semester, 2),
          trend_dir,
          confidence;
      END IF;
    END;
  END LOOP;
END;
$function$;

-- Fix ambiguous column reference in detect_performance_risks function
CREATE OR REPLACE FUNCTION public.detect_performance_risks(p_user_id uuid)
 RETURNS TABLE(risk_type text, severity text, description text, affected_courses text[], recommended_actions jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  declining_courses TEXT[];
  overdue_assignments INTEGER;
  low_study_hours INTEGER;
BEGIN
  -- Detect declining grade trends with explicit column references
  SELECT array_agg(f.course_name) 
  INTO declining_courses
  FROM public.forecast_grade_trend(p_user_id) f
  WHERE f.trend_direction = 'declining' AND f.confidence_level IN ('medium', 'high');
  
  -- Check for overdue assignments
  SELECT COUNT(*)
  INTO overdue_assignments
  FROM public.assignments a
  WHERE a.user_id = p_user_id
  AND a.due_date < now()
  AND NOT a.is_completed;
  
  -- Check study hours last 7 days
  SELECT COALESCE(SUM(
    EXTRACT(EPOCH FROM (s.actual_end - s.actual_start)) / 3600
  ), 0)
  INTO low_study_hours
  FROM public.study_sessions s
  WHERE s.user_id = p_user_id
  AND s.actual_start >= CURRENT_DATE - INTERVAL '7 days'
  AND s.status = 'completed';
  
  -- Return risk assessments
  IF declining_courses IS NOT NULL AND array_length(declining_courses, 1) > 0 THEN
    RETURN QUERY SELECT 
      'declining_grades'::text,
      CASE WHEN array_length(declining_courses, 1) >= 3 THEN 'high' ELSE 'medium' END,
      'Multiple courses showing declining grade trends'::text,
      declining_courses,
      jsonb_build_array(
        'Schedule study sessions for affected courses',
        'Meet with instructors to discuss performance',
        'Consider forming study groups',
        'Review study methods and techniques'
      );
  END IF;
  
  IF overdue_assignments >= 3 THEN
    RETURN QUERY SELECT 
      'overdue_assignments'::text,
      CASE WHEN overdue_assignments >= 5 THEN 'high' ELSE 'medium' END,
      format('You have %s overdue assignments', overdue_assignments),
      ARRAY[]::text[],
      jsonb_build_array(
        'Create a catch-up schedule for overdue work',
        'Prioritize assignments by due date and weight',
        'Consider speaking with instructors about extensions',
        'Set up automatic reminders for future assignments'
      );
  END IF;
  
  IF low_study_hours < 5 THEN
    RETURN QUERY SELECT 
      'insufficient_study_time'::text,
      CASE WHEN low_study_hours < 2 THEN 'high' ELSE 'medium' END,
      format('Only %s study hours logged this week', low_study_hours),
      ARRAY[]::text[],
      jsonb_build_array(
        'Schedule dedicated study blocks in your calendar',
        'Set a minimum daily study goal',
        'Use the Pomodoro technique for focused sessions',
        'Find a consistent study environment'
      );
  END IF;
END;
$function$;