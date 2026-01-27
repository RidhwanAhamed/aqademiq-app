// Backend Analytics Response Types
// These types represent the pre-computed analytics data from the compute-analytics edge function

export interface AnalyticsTimeRange {
  start: string;
  end: string;
  preset: 'week' | 'month' | '3months' | 'all';
}

export interface StudyHoursDistributionData {
  by_course: Array<{
    course_id: string;
    course_name: string;
    hours: number;
    percentage: number;
  }>;
  total_hours: number;
  active_courses: number;
  avg_hours_per_course: number;
}

export interface AssignmentsOverviewData {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  completion_rate: number;
}

export interface GradeTrendWeekData {
  week: string;
  avg_grade: number;
  trend: 'improving' | 'declining' | 'stable';
  grade_count: number;
}

export interface GradeTrendsData {
  weekly_data: GradeTrendWeekData[];
  overall_avg: number;
  improving_weeks: number;
  declining_weeks: number;
  recent_trend: 'improving' | 'declining' | 'stable';
  recent_change: number;
  total_grades: number;
}

export interface EfficiencyMetricData {
  value: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface EfficiencyMetricsData {
  focus_score: EfficiencyMetricData;
  time_efficiency: EfficiencyMetricData;
  productivity_rate: EfficiencyMetricData;
  study_consistency: EfficiencyMetricData;
  session_completion: EfficiencyMetricData;
  avg_session_duration: EfficiencyMetricData;
  overall_efficiency: number;
}

export interface DailyStudyDataPoint {
  date: string;
  full_date: string;
  hours: number;
  minutes: number;
  sessions: number;
  day_of_week: string;
}

export interface DailyStudyTimeData {
  daily_data: DailyStudyDataPoint[];
  total_hours: number;
  days_with_study: number;
  average_hours: number;
  peak_day: { date: string; hours: number } | null;
  consistency_percentage: number;
  total_days: number;
}

export interface StreakProgressionPoint {
  date: string;
  full_date: string;
  streak: number;
  has_study: boolean;
  day_of_week: string;
}

export interface StreakProgressData {
  current_streak: number;
  max_streak: number;
  total_study_days: number;
  streak_status: 'broken' | 'starting' | 'building' | 'strong' | 'on-fire';
  progression: StreakProgressionPoint[];
}

export interface ScheduleInsight {
  type: 'conflict' | 'gap' | 'overload' | 'optimization' | 'reminder';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  course?: string;
  date?: string;
  recommendation: string;
}

export interface WeeklySchedulePreview {
  date: string;
  day_name: string;
  total_hours: number;
  item_count: number;
  conflicts: number;
  efficiency: number;
}

export interface ScheduleOptimizationData {
  health_score: number;
  conflicts: number;
  gaps: number;
  overloaded_days: number;
  total_days: number;
  insights: ScheduleInsight[];
  weekly_preview: WeeklySchedulePreview[];
}

export interface WeeklyWorkloadData {
  week: string;
  week_start: string;
  week_end: string;
  workload_level: 'light' | 'moderate' | 'heavy' | 'critical';
  total_items: number;
  estimated_hours: number;
  assignments: number;
  exams: number;
  courses: string[];
  completion_rate: number;
}

export interface WorkloadDistributionData {
  weekly_workloads: WeeklyWorkloadData[];
  total_items: number;
  total_hours: number;
  avg_items_per_week: number;
  avg_hours_per_week: number;
  peak_week: { week: string; items: number; hours: number } | null;
  light_weeks: number;
  moderate_weeks: number;
  heavy_weeks: number;
  critical_weeks: number;
}

export interface WeeklyLateData {
  week: string;
  late_count: number;
  total_assignments: number;
  late_rate: number;
  avg_days_late: number;
}

export interface LateSubmissionsData {
  weekly_data: WeeklyLateData[];
  total_late: number;
  overall_late_rate: number;
  avg_days_late: number;
  total_assignments: number;
}

export interface CourseWeeklyRate {
  week: string;
  rate: number | null;
  total: number;
  completed: number;
}

export interface CourseCompletionData {
  course_id: string;
  course_name: string;
  color: string;
  weekly_rates: CourseWeeklyRate[];
}

export interface CompletionRateTrendsData {
  course_data: CourseCompletionData[];
  overall_avg_rate: number;
  total_assignments: number;
  weeks: number;
}

export interface CoursePerformanceData {
  course_id: string;
  course_name: string;
  course_code: string;
  color: string;
  avg_grade: number;
  completion_rate: number;
  study_hours: number;
  assignment_count: number;
  exam_count: number;
  performance_score: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface CoursePerformanceComparisonData {
  courses: CoursePerformanceData[];
  active_courses: number;
  overall_avg_grade: number;
  overall_avg_completion: number;
  total_study_hours: number;
}

export interface TaskItem {
  id: string;
  title: string;
  type: 'assignment' | 'exam';
  due_date: string;
  course_id: string;
  course_name: string;
  course_color: string;
  priority?: number;
  is_completed?: boolean;
  description?: string;
  estimated_hours?: number;
  exam_type?: string;
  location?: string;
}

export interface UpcomingTasksData {
  today: TaskItem[];
  tomorrow: TaskItem[];
  this_week: TaskItem[];
  next_week: TaskItem[];
  total_assignments: number;
  total_exams: number;
}

// Main Analytics Response from backend
export interface AnalyticsResponse {
  computed_at: string;
  time_range: AnalyticsTimeRange;
  
  study_hours_distribution: StudyHoursDistributionData;
  assignments_overview: AssignmentsOverviewData;
  grade_trends: GradeTrendsData;
  efficiency_metrics: EfficiencyMetricsData;
  daily_study_time: DailyStudyTimeData;
  streak_progress: StreakProgressData;
  schedule_optimization: ScheduleOptimizationData;
  workload_distribution: WorkloadDistributionData;
  late_submissions: LateSubmissionsData;
  completion_rate_trends: CompletionRateTrendsData;
  course_performance: CoursePerformanceComparisonData;
  upcoming_tasks: UpcomingTasksData;
}

// Request type for the edge function
export interface AnalyticsRequest {
  time_range: 'week' | 'month' | '3months' | 'all';
  course_id?: string;
}
