-- Create predictive analytics functions for goal achievement probability and grade forecasting

-- Function to calculate goal achievement probability
CREATE OR REPLACE FUNCTION public.calculate_goal_achievement_probability(p_goal_id uuid)
RETURNS TABLE(
  goal_id uuid,
  probability_percentage integer,
  risk_level text,
  recommended_actions jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  goal_record RECORD;
  days_remaining INTEGER;
  progress_rate NUMERIC;
  required_rate NUMERIC;
  probability INTEGER;
  risk_text TEXT;
  actions JSONB;
BEGIN
  -- Get goal details
  SELECT * INTO goal_record 
  FROM public.academic_goals 
  WHERE id = p_goal_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calculate days remaining
  days_remaining := GREATEST((goal_record.target_date::date - CURRENT_DATE), 1);
  
  -- Calculate current progress rate (value per day since creation)
  progress_rate := CASE 
    WHEN EXTRACT(DAYS FROM (now() - goal_record.created_at)) > 0 
    THEN goal_record.current_value / EXTRACT(DAYS FROM (now() - goal_record.created_at))
    ELSE 0 
  END;
  
  -- Calculate required rate to achieve goal
  required_rate := CASE 
    WHEN days_remaining > 0 
    THEN (goal_record.target_value - goal_record.current_value) / days_remaining
    ELSE 999999 
  END;
  
  -- Calculate probability based on progress rate vs required rate
  IF goal_record.current_value >= goal_record.target_value THEN
    probability := 100;
    risk_text := 'achieved';
  ELSIF progress_rate >= required_rate THEN
    probability := LEAST(95, 60 + ROUND((progress_rate / required_rate) * 35));
    risk_text := CASE 
      WHEN probability >= 80 THEN 'low'
      WHEN probability >= 60 THEN 'medium'
      ELSE 'high'
    END;
  ELSE
    probability := GREATEST(5, ROUND((progress_rate / required_rate) * 60));
    risk_text := CASE 
      WHEN probability >= 40 THEN 'medium'
      ELSE 'high'
    END;
  END IF;
  
  -- Generate recommended actions based on probability and goal type
  actions := jsonb_build_array();
  
  IF probability < 70 THEN
    CASE goal_record.goal_type
      WHEN 'gpa_target' THEN
        actions := jsonb_build_array(
          'Schedule additional study sessions',
          'Meet with professors during office hours',
          'Form study groups with classmates',
          'Consider tutoring for challenging subjects'
        );
      WHEN 'study_hours' THEN
        actions := jsonb_build_array(
          'Block more time in your calendar for studying',
          'Use the Pomodoro technique for better focus',
          'Find a dedicated study environment',
          'Set daily study hour minimums'
        );
      WHEN 'assignment_completion' THEN
        actions := jsonb_build_array(
          'Create a detailed assignment schedule',
          'Break large assignments into smaller tasks',
          'Set earlier personal deadlines',
          'Use project management tools'
        );
      ELSE
        actions := jsonb_build_array(
          'Review your goal timeline',
          'Increase daily effort towards this goal',
          'Consider adjusting the target if unrealistic',
          'Seek help from mentors or advisors'
        );
    END CASE;
  END IF;
  
  RETURN QUERY SELECT 
    p_goal_id,
    probability,
    risk_text,
    actions;
END;
$function$;

-- Function to forecast grade trends
CREATE OR REPLACE FUNCTION public.forecast_grade_trend(p_user_id uuid, p_course_id uuid DEFAULT NULL)
RETURNS TABLE(
  course_id uuid,
  course_name text,
  current_average numeric,
  projected_30_days numeric,
  projected_semester_end numeric,
  trend_direction text,
  confidence_level text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
      -- Get recent grades (last 30 days)
      SELECT 
        array_agg(
          CASE WHEN grade_total > 0 THEN (grade_points / grade_total) * 10 ELSE NULL END
          ORDER BY created_at
        ),
        array_agg(created_at::date ORDER BY created_at)
      INTO recent_grades, grade_dates
      FROM (
        SELECT grade_points, grade_total, created_at 
        FROM public.assignments 
        WHERE course_id = course_record.id 
        AND grade_points IS NOT NULL 
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        UNION ALL
        SELECT grade_points, grade_total, created_at 
        FROM public.exams 
        WHERE course_id = course_record.id 
        AND grade_points IS NOT NULL 
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
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

-- Function to detect performance risk patterns
CREATE OR REPLACE FUNCTION public.detect_performance_risks(p_user_id uuid)
RETURNS TABLE(
  risk_type text,
  severity text,
  description text,
  affected_courses text[],
  recommended_actions jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  declining_courses TEXT[];
  overdue_assignments INTEGER;
  low_study_hours INTEGER;
BEGIN
  -- Detect declining grade trends
  SELECT array_agg(course_name) 
  INTO declining_courses
  FROM public.forecast_grade_trend(p_user_id)
  WHERE trend_direction = 'declining' AND confidence_level IN ('medium', 'high');
  
  -- Check for overdue assignments
  SELECT COUNT(*)
  INTO overdue_assignments
  FROM public.assignments
  WHERE user_id = p_user_id
  AND due_date < now()
  AND NOT is_completed;
  
  -- Check study hours last 7 days
  SELECT COALESCE(SUM(
    EXTRACT(EPOCH FROM (actual_end - actual_start)) / 3600
  ), 0)
  INTO low_study_hours
  FROM public.study_sessions
  WHERE user_id = p_user_id
  AND actual_start >= CURRENT_DATE - INTERVAL '7 days'
  AND status = 'completed';
  
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