-- Phase 3: Advanced Academic Analytics Tables

-- Study session tracking for detailed analytics
CREATE TABLE IF NOT EXISTS public.study_session_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID REFERENCES public.study_sessions(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  focus_intervals JSONB DEFAULT '[]'::jsonb, -- Array of focus/break periods
  productivity_score INTEGER CHECK (productivity_score >= 0 AND productivity_score <= 100),
  distraction_count INTEGER DEFAULT 0,
  break_duration_minutes INTEGER DEFAULT 0,
  effective_study_minutes INTEGER DEFAULT 0,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  session_rating INTEGER CHECK (session_rating >= 1 AND session_rating <= 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Academic performance trends
CREATE TABLE IF NOT EXISTS public.performance_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL, -- 'grade_trend', 'study_efficiency', 'deadline_adherence'
  metric_value NUMERIC NOT NULL,
  time_period TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
  calculation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Goal tracking and achievement system
CREATE TABLE IF NOT EXISTS public.academic_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL, -- 'gpa_target', 'study_hours', 'assignment_completion', 'exam_score'
  goal_title TEXT NOT NULL,
  goal_description TEXT,
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  target_date DATE,
  is_achieved BOOLEAN DEFAULT false,
  achieved_at TIMESTAMP WITH TIME ZONE,
  priority INTEGER DEFAULT 2 CHECK (priority >= 1 AND priority <= 3),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Predictive insights and recommendations
CREATE TABLE IF NOT EXISTS public.academic_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  insight_type TEXT NOT NULL, -- 'grade_prediction', 'study_recommendation', 'schedule_optimization'
  insight_title TEXT NOT NULL,
  insight_description TEXT NOT NULL,
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1),
  action_items JSONB DEFAULT '[]'::jsonb,
  related_course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  related_assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.study_session_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own study analytics" 
ON public.study_session_analytics 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own performance analytics" 
ON public.performance_analytics 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own academic goals" 
ON public.academic_goals 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own academic insights" 
ON public.academic_insights 
FOR ALL 
USING (auth.uid() = user_id);

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_study_session_analytics_updated_at
  BEFORE UPDATE ON public.study_session_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_academic_goals_updated_at
  BEFORE UPDATE ON public.academic_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_academic_insights_updated_at
  BEFORE UPDATE ON public.academic_insights
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate academic performance metrics
CREATE OR REPLACE FUNCTION public.calculate_performance_metrics(p_user_id UUID, p_course_id UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  course_record RECORD;
  grade_trend NUMERIC;
  study_efficiency NUMERIC;
  deadline_adherence NUMERIC;
BEGIN
  -- Calculate metrics for specific course or all courses
  FOR course_record IN 
    SELECT id FROM public.courses 
    WHERE user_id = p_user_id 
    AND (p_course_id IS NULL OR id = p_course_id)
    AND is_active = true
  LOOP
    -- Calculate grade trend (improvement over time)
    SELECT 
      CASE 
        WHEN COUNT(*) >= 2 THEN
          (MAX(grade_points::NUMERIC / NULLIF(grade_total::NUMERIC, 0)) - 
           MIN(grade_points::NUMERIC / NULLIF(grade_total::NUMERIC, 0))) * 100
        ELSE 0 
      END INTO grade_trend
    FROM (
      SELECT grade_points, grade_total, ROW_NUMBER() OVER (ORDER BY created_at) as rn
      FROM public.assignments 
      WHERE course_id = course_record.id 
      AND grade_points IS NOT NULL 
      AND grade_total IS NOT NULL
    ) graded_assignments;
    
    -- Calculate study efficiency (grades vs study time)
    SELECT 
      CASE 
        WHEN SUM(estimated_hours) > 0 THEN
          AVG(grade_points::NUMERIC / NULLIF(grade_total::NUMERIC, 0)) * 100 / 
          (SUM(estimated_hours)::NUMERIC / NULLIF(COUNT(*), 0))
        ELSE 0 
      END INTO study_efficiency
    FROM public.assignments 
    WHERE course_id = course_record.id 
    AND grade_points IS NOT NULL 
    AND is_completed = true;
    
    -- Calculate deadline adherence
    SELECT 
      (COUNT(CASE WHEN is_completed = true THEN 1 END)::NUMERIC / 
       NULLIF(COUNT(*), 0)) * 100 INTO deadline_adherence
    FROM public.assignments 
    WHERE course_id = course_record.id 
    AND due_date < now();
    
    -- Insert or update performance metrics
    INSERT INTO public.performance_analytics (
      user_id, course_id, metric_type, metric_value, time_period, calculation_date
    ) VALUES 
      (p_user_id, course_record.id, 'grade_trend', COALESCE(grade_trend, 0), 'weekly', CURRENT_DATE),
      (p_user_id, course_record.id, 'study_efficiency', COALESCE(study_efficiency, 0), 'weekly', CURRENT_DATE),
      (p_user_id, course_record.id, 'deadline_adherence', COALESCE(deadline_adherence, 0), 'weekly', CURRENT_DATE)
    ON CONFLICT (user_id, course_id, metric_type, time_period, calculation_date) 
    DO UPDATE SET 
      metric_value = EXCLUDED.metric_value,
      metadata = EXCLUDED.metadata;
  END LOOP;
END;
$$;