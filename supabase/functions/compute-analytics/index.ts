import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Course {
  id: string;
  name: string;
  code: string | null;
  color: string;
}

interface Assignment {
  id: string;
  title: string;
  course_id: string;
  due_date: string;
  is_completed: boolean;
  grade_points: number | null;
  estimated_hours: number | null;
  priority: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface Exam {
  id: string;
  title: string;
  course_id: string;
  exam_date: string;
  grade_points: number | null;
  study_hours_planned: number | null;
  exam_type: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface StudySession {
  id: string;
  course_id: string | null;
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string | null;
  actual_end: string | null;
  status: string | null;
  focus_score: number | null;
  assignment_id: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const timeRange: string = body.time_range || 'week';
    const courseId: string | undefined = body.course_id;

    // Calculate date range
    const now = new Date();
    let rangeStart: Date;
    
    switch (timeRange) {
      case 'month':
        rangeStart = new Date(now);
        rangeStart.setDate(rangeStart.getDate() - 28);
        break;
      case '3months':
        rangeStart = new Date(now);
        rangeStart.setDate(rangeStart.getDate() - 84);
        break;
      case 'all':
        rangeStart = new Date(2020, 0, 1);
        break;
      default: // week
        rangeStart = new Date(now);
        rangeStart.setDate(rangeStart.getDate() - 7);
    }

    console.log(`Computing analytics for user ${user.id}, range: ${timeRange}`);

    // Fetch all required data in parallel
    const [coursesRes, assignmentsRes, examsRes, sessionsRes] = await Promise.all([
      supabase.from('courses').select('id, name, code, color').eq('user_id', user.id),
      supabase.from('assignments').select('*').eq('user_id', user.id),
      supabase.from('exams').select('*').eq('user_id', user.id),
      supabase.from('study_sessions').select('*').eq('user_id', user.id),
    ]);

    if (coursesRes.error) throw coursesRes.error;
    if (assignmentsRes.error) throw assignmentsRes.error;
    if (examsRes.error) throw examsRes.error;
    if (sessionsRes.error) throw sessionsRes.error;

    const courses: Course[] = coursesRes.data || [];
    const allAssignments: Assignment[] = assignmentsRes.data || [];
    const allExams: Exam[] = examsRes.data || [];
    const allSessions: StudySession[] = sessionsRes.data || [];

    // Filter by course if specified
    const assignments = courseId 
      ? allAssignments.filter(a => a.course_id === courseId)
      : allAssignments;
    const exams = courseId 
      ? allExams.filter(e => e.course_id === courseId)
      : allExams;
    const studySessions = courseId 
      ? allSessions.filter(s => s.course_id === courseId)
      : allSessions;

    // Helper function to get course name
    const getCourseName = (courseId: string): string => {
      return courses.find(c => c.id === courseId)?.name || 'Unknown Course';
    };

    const getCourseColor = (courseId: string): string => {
      return courses.find(c => c.id === courseId)?.color || '#5183F5';
    };

    const getCourseCode = (courseId: string): string => {
      const course = courses.find(c => c.id === courseId);
      return course?.code || course?.name?.substring(0, 6) || 'UNK';
    };

    // ==================== STUDY HOURS DISTRIBUTION ====================
    const computeStudyHoursDistribution = () => {
      const byCourse: Record<string, number> = {};
      
      studySessions.forEach(session => {
        const actualEnd = session.actual_end ? new Date(session.actual_end) : null;
        const actualStart = session.actual_start ? new Date(session.actual_start) : new Date(session.scheduled_start);
        
        if (actualEnd && actualEnd >= rangeStart && actualEnd <= now && session.course_id) {
          if (!byCourse[session.course_id]) byCourse[session.course_id] = 0;
          const durationMinutes = (actualEnd.getTime() - actualStart.getTime()) / (1000 * 60);
          byCourse[session.course_id] += durationMinutes;
        }
      });

      const totalMinutes = Object.values(byCourse).reduce((sum, mins) => sum + mins, 0);
      const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

      const byCourseSorted = Object.entries(byCourse)
        .map(([courseId, minutes]) => ({
          course_id: courseId,
          course_name: getCourseName(courseId),
          hours: Math.round((minutes / 60) * 100) / 100,
          percentage: totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0,
        }))
        .filter(item => item.hours > 0)
        .sort((a, b) => b.hours - a.hours);

      return {
        by_course: byCourseSorted,
        total_hours: totalHours,
        active_courses: byCourseSorted.length,
        avg_hours_per_course: byCourseSorted.length > 0 
          ? Math.round((totalHours / byCourseSorted.length) * 100) / 100 
          : 0,
      };
    };

    // ==================== ASSIGNMENTS OVERVIEW ====================
    const computeAssignmentsOverview = () => {
      const filtered = assignments.filter(a => {
        const dueDate = new Date(a.due_date);
        return dueDate >= rangeStart && dueDate <= now;
      });

      const total = filtered.length;
      const completed = filtered.filter(a => a.is_completed).length;
      const pending = total - completed;
      const overdue = filtered.filter(a => !a.is_completed && new Date(a.due_date) < now).length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return { total, completed, pending, overdue, completion_rate: completionRate };
    };

    // ==================== GRADE TRENDS ====================
    const computeGradeTrends = () => {
      interface GradePoint {
        date: string;
        week: string;
        grade: number;
        weight: number;
      }

      const allGrades: GradePoint[] = [];

      assignments
        .filter(a => a.grade_points !== null && a.grade_points !== undefined)
        .forEach(a => {
          const date = a.updated_at || a.created_at;
          const weekStart = getWeekStart(new Date(date));
          allGrades.push({
            date,
            week: formatDate(weekStart, 'MMM d'),
            grade: a.grade_points!,
            weight: 1,
          });
        });

      exams
        .filter(e => e.grade_points !== null && e.grade_points !== undefined)
        .forEach(e => {
          const date = e.updated_at || e.created_at;
          const weekStart = getWeekStart(new Date(date));
          allGrades.push({
            date,
            week: formatDate(weekStart, 'MMM d'),
            grade: e.grade_points!,
            weight: 2,
          });
        });

      allGrades.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Group by week
      const weeklyMap = new Map<string, GradePoint[]>();
      allGrades.forEach(grade => {
        if (!weeklyMap.has(grade.week)) {
          weeklyMap.set(grade.week, []);
        }
        weeklyMap.get(grade.week)!.push(grade);
      });

      const weeklyData: Array<{
        week: string;
        avg_grade: number;
        trend: 'improving' | 'declining' | 'stable';
        grade_count: number;
      }> = [];

      let prevAvg = 0;
      weeklyMap.forEach((grades, week) => {
        const totalWeight = grades.reduce((sum, g) => sum + g.weight, 0);
        const weightedSum = grades.reduce((sum, g) => sum + g.grade * g.weight, 0);
        const avgGrade = totalWeight > 0 ? weightedSum / totalWeight : 0;
        
        let trend: 'improving' | 'declining' | 'stable' = 'stable';
        if (weeklyData.length > 0) {
          const diff = avgGrade - prevAvg;
          if (diff > 0.5) trend = 'improving';
          else if (diff < -0.5) trend = 'declining';
        }
        
        weeklyData.push({
          week,
          avg_grade: Math.round(avgGrade * 100) / 100,
          trend,
          grade_count: grades.length,
        });
        
        prevAvg = avgGrade;
      });

      const last12Weeks = weeklyData.slice(-12);
      const improvingWeeks = last12Weeks.filter(w => w.trend === 'improving').length;
      const decliningWeeks = last12Weeks.filter(w => w.trend === 'declining').length;
      
      const overallAvg = allGrades.length > 0 
        ? allGrades.reduce((sum, g) => sum + g.grade, 0) / allGrades.length 
        : 0;

      const recentChange = last12Weeks.length >= 2
        ? last12Weeks[last12Weeks.length - 1].avg_grade - last12Weeks[last12Weeks.length - 2].avg_grade
        : 0;

      let recentTrend: 'improving' | 'declining' | 'stable' = 'stable';
      if (recentChange > 0.3) recentTrend = 'improving';
      else if (recentChange < -0.3) recentTrend = 'declining';

      return {
        weekly_data: last12Weeks,
        overall_avg: Math.round(overallAvg * 100) / 100,
        improving_weeks: improvingWeeks,
        declining_weeks: decliningWeeks,
        recent_trend: recentTrend,
        recent_change: Math.round(recentChange * 100) / 100,
        total_grades: allGrades.length,
      };
    };

    // ==================== EFFICIENCY METRICS ====================
    const computeEfficiencyMetrics = () => {
      const last30Days = new Date(now);
      last30Days.setDate(last30Days.getDate() - 30);
      const last7Days = new Date(now);
      last7Days.setDate(last7Days.getDate() - 7);
      const last14Days = new Date(now);
      last14Days.setDate(last14Days.getDate() - 14);

      const recentSessions = studySessions.filter(s => {
        const sessionDate = new Date(s.actual_start || s.scheduled_start);
        return sessionDate >= last30Days && s.status === 'completed';
      });

      const recent7DaySessions = studySessions.filter(s => {
        const sessionDate = new Date(s.actual_start || s.scheduled_start);
        return sessionDate >= last7Days && s.status === 'completed';
      });

      const previous7DaySessions = studySessions.filter(s => {
        const sessionDate = new Date(s.actual_start || s.scheduled_start);
        return sessionDate >= last14Days && sessionDate < last7Days && s.status === 'completed';
      });

      // Focus Score
      const focusScores = recentSessions
        .filter(s => s.focus_score !== null && s.focus_score !== undefined)
        .map(s => s.focus_score!);
      const avgFocusScore = focusScores.length > 0 
        ? focusScores.reduce((sum, score) => sum + score, 0) / focusScores.length 
        : 0;

      // Time Efficiency
      const plannedVsActual = recentSessions
        .filter(s => s.actual_start && s.actual_end && s.scheduled_start && s.scheduled_end)
        .map(s => {
          const plannedDuration = new Date(s.scheduled_end).getTime() - new Date(s.scheduled_start).getTime();
          const actualDuration = new Date(s.actual_end!).getTime() - new Date(s.actual_start!).getTime();
          return { planned: plannedDuration, actual: actualDuration };
        });

      const timeEfficiency = plannedVsActual.length > 0
        ? plannedVsActual.reduce((sum, s) => {
            const eff = s.planned > 0 ? (s.actual / s.planned) * 100 : 0;
            return sum + Math.min(eff, 200);
          }, 0) / plannedVsActual.length
        : 100;

      // Productivity Rate
      const completedAssignments = assignments.filter(a => 
        a.is_completed && new Date(a.updated_at || a.created_at) >= last30Days
      );
      const totalStudyHours = recentSessions.reduce((total, s) => {
        if (s.actual_start && s.actual_end) {
          const duration = new Date(s.actual_end).getTime() - new Date(s.actual_start).getTime();
          return total + duration / (1000 * 60 * 60);
        }
        return total;
      }, 0);
      const productivityRate = totalStudyHours > 0 
        ? (completedAssignments.length / totalStudyHours) * 10 
        : 0;

      // Study Consistency
      const studyDays = new Set(
        recentSessions.map(s => 
          formatDate(new Date(s.actual_start || s.scheduled_start), 'yyyy-MM-dd')
        )
      ).size;
      const consistencyRate = (studyDays / 30) * 100;

      // Session Completion
      const totalSessions = studySessions.filter(s => 
        new Date(s.scheduled_start) >= last30Days
      ).length;
      const completedSessions = recentSessions.length;
      const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

      // Avg Session Duration
      const sessionDurations = recentSessions
        .filter(s => s.actual_start && s.actual_end)
        .map(s => (new Date(s.actual_end!).getTime() - new Date(s.actual_start!).getTime()) / (1000 * 60));
      const avgSessionDuration = sessionDurations.length > 0
        ? sessionDurations.reduce((sum, d) => sum + d, 0) / sessionDurations.length
        : 0;

      // Trend calculation
      const recentFocusScores = recent7DaySessions
        .filter(s => s.focus_score !== null)
        .map(s => s.focus_score!);
      const previousFocusScores = previous7DaySessions
        .filter(s => s.focus_score !== null)
        .map(s => s.focus_score!);
      
      const recentAvgFocus = recentFocusScores.length > 0 
        ? recentFocusScores.reduce((sum, s) => sum + s, 0) / recentFocusScores.length 
        : 0;
      const previousAvgFocus = previousFocusScores.length > 0 
        ? previousFocusScores.reduce((sum, s) => sum + s, 0) / previousFocusScores.length 
        : 0;

      const focusTrend: 'up' | 'down' | 'stable' = 
        recentAvgFocus > previousAvgFocus + 0.5 ? 'up' : 
        recentAvgFocus < previousAvgFocus - 0.5 ? 'down' : 'stable';

      const metrics = [
        { name: 'focus_score', value: avgFocusScore, max: 10, trend: focusTrend },
        { name: 'time_efficiency', value: timeEfficiency, max: 200, trend: timeEfficiency > 110 ? 'up' : timeEfficiency < 90 ? 'down' : 'stable' as 'up' | 'down' | 'stable' },
        { name: 'productivity_rate', value: productivityRate, max: 5, trend: productivityRate > 2 ? 'up' : productivityRate < 1 ? 'down' : 'stable' as 'up' | 'down' | 'stable' },
        { name: 'study_consistency', value: consistencyRate, max: 100, trend: consistencyRate > 70 ? 'up' : consistencyRate < 40 ? 'down' : 'stable' as 'up' | 'down' | 'stable' },
        { name: 'session_completion', value: completionRate, max: 100, trend: completionRate > 80 ? 'up' : completionRate < 60 ? 'down' : 'stable' as 'up' | 'down' | 'stable' },
        { name: 'avg_session_duration', value: avgSessionDuration, max: 120, trend: avgSessionDuration > 60 ? 'up' : avgSessionDuration < 30 ? 'down' : 'stable' as 'up' | 'down' | 'stable' },
      ];

      const result: Record<string, { value: number; percentage: number; trend: 'up' | 'down' | 'stable' }> = {};
      let totalPercentage = 0;
      
      metrics.forEach(m => {
        const percentage = Math.min((m.value / m.max) * 100, 100);
        totalPercentage += percentage;
        result[m.name] = {
          value: Math.round(m.value * 100) / 100,
          percentage: Math.round(percentage * 100) / 100,
          trend: m.trend,
        };
      });

      return {
        ...result,
        overall_efficiency: Math.round(totalPercentage / metrics.length),
      };
    };

    // ==================== DAILY STUDY TIME ====================
    const computeDailyStudyTime = () => {
      const days: Date[] = [];
      let currentDate = new Date(rangeStart);
      while (currentDate <= now) {
        days.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const dailyData = days.map(date => {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const sessionsOnDay = studySessions.filter(s => {
          const actualEnd = s.actual_end ? new Date(s.actual_end) : null;
          const actualStart = s.actual_start ? new Date(s.actual_start) : new Date(s.scheduled_start);
          if (!actualEnd) return false;
          return actualEnd >= dayStart && actualStart <= dayEnd;
        });

        const totalMinutes = sessionsOnDay.reduce((sum, s) => {
          const actualEnd = new Date(s.actual_end!);
          const actualStart = s.actual_start ? new Date(s.actual_start) : new Date(s.scheduled_start);
          const sessionStart = actualStart < dayStart ? dayStart : actualStart;
          const sessionEnd = actualEnd > dayEnd ? dayEnd : actualEnd;
          if (sessionEnd <= sessionStart) return sum;
          return sum + (sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60);
        }, 0);

        return {
          date: formatDate(date, 'MMM d'),
          full_date: formatDate(date, 'yyyy-MM-dd'),
          hours: Math.round((totalMinutes / 60) * 100) / 100,
          minutes: Math.round(totalMinutes),
          sessions: sessionsOnDay.length,
          day_of_week: formatDate(date, 'EEE'),
        };
      });

      const totalHours = dailyData.reduce((sum, d) => sum + d.hours, 0);
      const daysWithStudy = dailyData.filter(d => d.hours > 0).length;
      const averageHours = dailyData.length > 0 ? totalHours / dailyData.length : 0;
      const maxHours = Math.max(...dailyData.map(d => d.hours), 0);
      const peakDay = dailyData.find(d => d.hours === maxHours);

      return {
        daily_data: dailyData,
        total_hours: Math.round(totalHours * 100) / 100,
        days_with_study: daysWithStudy,
        average_hours: Math.round(averageHours * 100) / 100,
        peak_day: peakDay ? { date: peakDay.date, hours: peakDay.hours } : null,
        consistency_percentage: dailyData.length > 0 
          ? Math.round((daysWithStudy / dailyData.length) * 100) 
          : 0,
        total_days: dailyData.length,
      };
    };

    // ==================== STREAK PROGRESS ====================
    const computeStreakProgress = () => {
      const completedSessions = studySessions
        .filter(s => s.actual_end && s.status === 'completed')
        .sort((a, b) => new Date(a.actual_end!).getTime() - new Date(b.actual_end!).getTime());

      if (completedSessions.length === 0) {
        return {
          current_streak: 0,
          max_streak: 0,
          total_study_days: 0,
          streak_status: 'broken' as const,
          progression: [],
        };
      }

      const studyDays = new Set<string>();
      completedSessions.forEach(s => {
        studyDays.add(formatDate(new Date(s.actual_end!), 'yyyy-MM-dd'));
      });

      const firstStudyDate = new Date(completedSessions[0].actual_end!);
      const dateRange: Date[] = [];
      let currentDate = new Date(firstStudyDate);
      while (currentDate <= now) {
        dateRange.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      let currentStreak = 0;
      let maxStreak = 0;
      const progression: Array<{
        date: string;
        full_date: string;
        streak: number;
        has_study: boolean;
        day_of_week: string;
      }> = [];

      for (const date of dateRange) {
        const dateStr = formatDate(date, 'yyyy-MM-dd');
        const hasStudy = studyDays.has(dateStr);

        if (hasStudy) {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 0;
        }

        progression.push({
          date: formatDate(date, 'MMM d'),
          full_date: dateStr,
          streak: currentStreak,
          has_study: hasStudy,
          day_of_week: formatDate(date, 'EEE'),
        });
      }

      let streakStatus: 'broken' | 'starting' | 'building' | 'strong' | 'on-fire';
      if (currentStreak === 0) streakStatus = 'broken';
      else if (currentStreak < 3) streakStatus = 'starting';
      else if (currentStreak < 7) streakStatus = 'building';
      else if (currentStreak < 14) streakStatus = 'strong';
      else streakStatus = 'on-fire';

      return {
        current_streak: currentStreak,
        max_streak: maxStreak,
        total_study_days: studyDays.size,
        streak_status: streakStatus,
        progression,
      };
    };

    // ==================== SCHEDULE OPTIMIZATION ====================
    const computeScheduleOptimization = () => {
      const next14Days = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        return d;
      });

      const weeklySchedules = next14Days.map(date => {
        const dateStr = formatDate(date, 'yyyy-MM-dd');
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const daySessions = studySessions.filter(s => {
          const sessionDate = new Date(s.scheduled_start);
          return sessionDate >= dayStart && sessionDate <= dayEnd;
        });

        const dayAssignments = assignments.filter(a => {
          const dueDate = new Date(a.due_date);
          return isSameDay(dueDate, date) && !a.is_completed;
        });

        const dayExams = exams.filter(e => isSameDay(new Date(e.exam_date), date));

        const totalHours = daySessions.reduce((total, s) => {
          if (s.scheduled_start && s.scheduled_end) {
            const duration = new Date(s.scheduled_end).getTime() - new Date(s.scheduled_start).getTime();
            return total + duration / (1000 * 60 * 60);
          }
          return total;
        }, 0);

        const conflicts = daySessions.filter((s, idx) => {
          return daySessions.some((other, otherIdx) => {
            if (idx === otherIdx) return false;
            const sStart = new Date(s.scheduled_start);
            const sEnd = new Date(s.scheduled_end);
            const oStart = new Date(other.scheduled_start);
            const oEnd = new Date(other.scheduled_end);
            return sStart < oEnd && sEnd > oStart;
          });
        }).length;

        const workload = dayAssignments.length + dayExams.length;
        const efficiency = workload > 0 ? Math.min((daySessions.length / workload) * 100, 100) : 100;

        return {
          date: dateStr,
          day_name: formatDate(date, 'EEE'),
          total_hours: Math.round(totalHours * 100) / 100,
          item_count: workload,
          conflicts,
          efficiency: Math.round(efficiency),
          sessions: daySessions,
          assignments: dayAssignments,
          exams: dayExams,
        };
      });

      // Generate insights
      const insights: Array<{
        type: 'conflict' | 'gap' | 'overload' | 'optimization' | 'reminder';
        title: string;
        description: string;
        severity: 'low' | 'medium' | 'high';
        course?: string;
        date?: string;
        recommendation: string;
      }> = [];

      weeklySchedules.forEach(day => {
        if (day.conflicts > 0) {
          insights.push({
            type: 'conflict',
            title: 'Schedule Conflict Detected',
            description: `${day.conflicts} overlapping study sessions on ${formatDate(new Date(day.date), 'MMM d')}`,
            severity: 'high',
            date: day.date,
            recommendation: 'Reschedule overlapping sessions to avoid conflicts and maintain focus',
          });
        }

        if (day.total_hours > 8) {
          insights.push({
            type: 'overload',
            title: 'Heavy Study Day',
            description: `${day.total_hours} hours of study scheduled on ${formatDate(new Date(day.date), 'MMM d')}`,
            severity: 'medium',
            date: day.date,
            recommendation: 'Consider spreading study time across multiple days for better retention',
          });
        }

        if ((day.assignments.length > 0 || day.exams.length > 0) && day.sessions.length === 0) {
          insights.push({
            type: 'gap',
            title: 'Missing Study Time',
            description: `${day.item_count} items due on ${formatDate(new Date(day.date), 'MMM d')} but no study time scheduled`,
            severity: 'high',
            date: day.date,
            recommendation: 'Schedule study sessions to prepare for upcoming deadlines',
          });
        }
      });

      // Sort insights by severity
      insights.sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });

      // Calculate health score
      const totalDays = weeklySchedules.length;
      const daysWithConflicts = weeklySchedules.filter(d => d.conflicts > 0).length;
      const daysWithGaps = weeklySchedules.filter(d => 
        d.item_count > 0 && d.sessions.length === 0
      ).length;
      const overloadedDays = weeklySchedules.filter(d => d.total_hours > 8).length;

      const healthScore = Math.max(0, Math.round(100 - 
        (daysWithConflicts / totalDays) * 40 - 
        (daysWithGaps / totalDays) * 30 - 
        (overloadedDays / totalDays) * 20
      ));

      return {
        health_score: healthScore,
        conflicts: daysWithConflicts,
        gaps: daysWithGaps,
        overloaded_days: overloadedDays,
        total_days: totalDays,
        insights,
        weekly_preview: weeklySchedules.slice(0, 7).map(d => ({
          date: d.date,
          day_name: d.day_name,
          total_hours: d.total_hours,
          item_count: d.item_count,
          conflicts: d.conflicts,
          efficiency: d.efficiency,
        })),
      };
    };

    // ==================== WORKLOAD DISTRIBUTION ====================
    const computeWorkloadDistribution = () => {
      const weeks: Array<{
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
      }> = [];

      for (let i = 0; i < 8; i++) {
        const weekStart = getWeekStart(new Date(now.getTime() + i * 7 * 24 * 60 * 60 * 1000));
        const weekEnd = getWeekEnd(weekStart);
        const weekKey = formatDate(weekStart, 'MMM d');

        const weekAssignments = assignments.filter(a => {
          const dueDate = new Date(a.due_date);
          return isSameWeek(dueDate, weekStart) && !a.is_completed;
        });

        const weekExams = exams.filter(e => isSameWeek(new Date(e.exam_date), weekStart));

        const totalItems = weekAssignments.length + weekExams.length;
        const completedItems = weekAssignments.filter(a => a.is_completed).length;
        const completionRate = totalItems > 0 ? (completedItems / totalItems) * 100 : 100;

        const estimatedHours = weekAssignments.reduce((total, a) => 
          total + (a.estimated_hours || 2), 0
        ) + weekExams.reduce((total, e) => 
          total + (e.study_hours_planned || 10), 0
        );

        let workloadLevel: 'light' | 'moderate' | 'heavy' | 'critical' = 'light';
        if (totalItems >= 8 || estimatedHours >= 25) workloadLevel = 'critical';
        else if (totalItems >= 5 || estimatedHours >= 15) workloadLevel = 'heavy';
        else if (totalItems >= 3 || estimatedHours >= 8) workloadLevel = 'moderate';

        const weekCourses = new Set([
          ...weekAssignments.map(a => a.course_id),
          ...weekExams.map(e => e.course_id),
        ]);
        const courseNames = Array.from(weekCourses).map(id => getCourseName(id));

        weeks.push({
          week: weekKey,
          week_start: weekStart.toISOString(),
          week_end: weekEnd.toISOString(),
          workload_level: workloadLevel,
          total_items: totalItems,
          estimated_hours: Math.round(estimatedHours * 100) / 100,
          assignments: weekAssignments.length,
          exams: weekExams.length,
          courses: courseNames,
          completion_rate: Math.round(completionRate * 100) / 100,
        });
      }

      const totalItems = weeks.reduce((sum, w) => sum + w.total_items, 0);
      const totalHours = weeks.reduce((sum, w) => sum + w.estimated_hours, 0);
      const peakWeek = weeks.length > 0 
        ? weeks.reduce((peak, w) => w.total_items > peak.total_items ? w : peak)
        : null;

      return {
        weekly_workloads: weeks,
        total_items: totalItems,
        total_hours: Math.round(totalHours * 100) / 100,
        avg_items_per_week: Math.round((totalItems / weeks.length) * 100) / 100,
        avg_hours_per_week: Math.round((totalHours / weeks.length) * 100) / 100,
        peak_week: peakWeek && peakWeek.total_items > 0 
          ? { week: peakWeek.week, items: peakWeek.total_items, hours: peakWeek.estimated_hours } 
          : null,
        light_weeks: weeks.filter(w => w.workload_level === 'light').length,
        moderate_weeks: weeks.filter(w => w.workload_level === 'moderate').length,
        heavy_weeks: weeks.filter(w => w.workload_level === 'heavy').length,
        critical_weeks: weeks.filter(w => w.workload_level === 'critical').length,
      };
    };

    // ==================== LATE SUBMISSIONS ====================
    const computeLateSubmissions = () => {
      const fourWeeksAgo = new Date(now);
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      const weeks = Array.from({ length: 4 }, (_, i) => {
        const weekStart = getWeekStart(new Date(now.getTime() - (3 - i) * 7 * 24 * 60 * 60 * 1000));
        const weekEnd = getWeekEnd(weekStart);
        return { weekStart, weekEnd };
      });

      const weeklyData = weeks.map(({ weekStart, weekEnd }) => {
        const assignmentsInWeek = assignments.filter(a => {
          const dueDate = new Date(a.due_date);
          return dueDate >= weekStart && dueDate <= weekEnd;
        });

        const lateSubmissions = assignmentsInWeek.filter(a => {
          if (!a.is_completed) return false;
          const dueDate = new Date(a.due_date);
          const completionDate = new Date(a.updated_at || a.created_at);
          return completionDate > dueDate;
        });

        const daysLateList = lateSubmissions.map(a => {
          const dueDate = new Date(a.due_date);
          const completionDate = new Date(a.updated_at || a.created_at);
          return Math.max(0, Math.ceil((completionDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
        });

        const avgDaysLate = daysLateList.length > 0 
          ? daysLateList.reduce((sum, d) => sum + d, 0) / daysLateList.length 
          : 0;

        return {
          week: formatDate(weekStart, 'MMM d'),
          late_count: lateSubmissions.length,
          total_assignments: assignmentsInWeek.length,
          late_rate: assignmentsInWeek.length > 0 
            ? Math.round((lateSubmissions.length / assignmentsInWeek.length) * 100) 
            : 0,
          avg_days_late: Math.round(avgDaysLate * 10) / 10,
        };
      });

      const totalLate = weeklyData.reduce((sum, w) => sum + w.late_count, 0);
      const totalAssignments = weeklyData.reduce((sum, w) => sum + w.total_assignments, 0);
      const allDaysLate = weeklyData.filter(w => w.avg_days_late > 0).map(w => w.avg_days_late);
      const avgDaysLate = allDaysLate.length > 0 
        ? allDaysLate.reduce((sum, d) => sum + d, 0) / allDaysLate.length 
        : 0;

      return {
        weekly_data: weeklyData,
        total_late: totalLate,
        overall_late_rate: totalAssignments > 0 
          ? Math.round((totalLate / totalAssignments) * 100) 
          : 0,
        avg_days_late: Math.round(avgDaysLate * 10) / 10,
        total_assignments: totalAssignments,
      };
    };

    // ==================== COMPLETION RATE TRENDS ====================
    const computeCompletionRateTrends = () => {
      const weeks = 6;
      const weekStarts = Array.from({ length: weeks }, (_, i) => {
        return getWeekStart(new Date(now.getTime() - (weeks - 1 - i) * 7 * 24 * 60 * 60 * 1000));
      });

      const courseData = courses.map(course => {
        const points = weekStarts.map(weekStart => {
          const weekEnd = getWeekEnd(weekStart);
          
          const assignmentsInWeek = assignments.filter(a => {
            const dueDate = new Date(a.due_date);
            return a.course_id === course.id && dueDate >= weekStart && dueDate <= weekEnd;
          });

          const total = assignmentsInWeek.length;
          const completed = assignmentsInWeek.filter(a => a.is_completed).length;
          const rate = total > 0 ? Math.round((completed / total) * 100) : null;

          return {
            week: formatDate(weekStart, 'MMM d'),
            rate,
            total,
            completed,
          };
        });

        return { course, points };
      }).filter(cd => cd.points.some(p => p.total > 0));

      const allRates = courseData.flatMap(cd => 
        cd.points.filter(p => p.rate !== null).map(p => p.rate!)
      );
      const overallAvgRate = allRates.length > 0 
        ? Math.round(allRates.reduce((sum, r) => sum + r, 0) / allRates.length) 
        : 0;

      const totalAssignments = courseData.reduce((sum, cd) => 
        sum + cd.points.reduce((pSum, p) => pSum + p.total, 0), 0
      );

      return {
        course_data: courseData.map(cd => ({
          course_id: cd.course.id,
          course_name: cd.course.name,
          color: cd.course.color,
          weekly_rates: cd.points,
        })),
        overall_avg_rate: overallAvgRate,
        total_assignments: totalAssignments,
        weeks,
      };
    };

    // ==================== COURSE PERFORMANCE ====================
    const computeCoursePerformance = () => {
      const coursePerformances = courses.map(course => {
        const courseAssignments = assignments.filter(a => a.course_id === course.id);
        const courseExams = exams.filter(e => e.course_id === course.id);

        const allGrades = [
          ...courseAssignments.filter(a => a.grade_points !== null).map(a => a.grade_points!),
          ...courseExams.filter(e => e.grade_points !== null).map(e => e.grade_points!),
        ];
        const avgGrade = allGrades.length > 0 
          ? allGrades.reduce((sum, g) => sum + g, 0) / allGrades.length 
          : 0;

        const totalAssignments = courseAssignments.length;
        const completedAssignments = courseAssignments.filter(a => a.is_completed).length;
        const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

        const courseStudySessions = studySessions.filter(s => 
          s.course_id === course.id && s.status === 'completed' && s.actual_start && s.actual_end
        );
        const studyHours = courseStudySessions.reduce((total, s) => {
          const duration = new Date(s.actual_end!).getTime() - new Date(s.actual_start!).getTime();
          return total + duration / (1000 * 60 * 60);
        }, 0);

        const totalWorkload = totalAssignments + courseExams.length;
        const performanceScore = (
          (avgGrade / 10) * 40 + 
          (completionRate / 100) * 30 + 
          Math.min(studyHours / 20, 1) * 20 + 
          Math.min(totalWorkload / 10, 1) * 10
        ) * 100;

        let trend: 'improving' | 'declining' | 'stable' = 'stable';
        if (avgGrade > 8) trend = 'improving';
        else if (avgGrade < 6) trend = 'declining';

        return {
          course_id: course.id,
          course_name: course.name,
          course_code: getCourseCode(course.id),
          color: course.color,
          avg_grade: Math.round(avgGrade * 100) / 100,
          completion_rate: Math.round(completionRate * 100) / 100,
          study_hours: Math.round(studyHours * 100) / 100,
          assignment_count: totalAssignments,
          exam_count: courseExams.length,
          performance_score: Math.round(performanceScore * 100) / 100,
          trend,
          total_workload: totalWorkload,
        };
      }).filter(c => c.total_workload > 0);

      const sortedCourses = [...coursePerformances].sort((a, b) => b.performance_score - a.performance_score);

      const overallAvgGrade = sortedCourses.length > 0 
        ? sortedCourses.reduce((sum, c) => sum + c.avg_grade, 0) / sortedCourses.length 
        : 0;
      const overallAvgCompletion = sortedCourses.length > 0 
        ? sortedCourses.reduce((sum, c) => sum + c.completion_rate, 0) / sortedCourses.length 
        : 0;
      const totalStudyHours = sortedCourses.reduce((sum, c) => sum + c.study_hours, 0);

      return {
        courses: sortedCourses.map(({ total_workload, ...rest }) => rest),
        active_courses: sortedCourses.length,
        overall_avg_grade: Math.round(overallAvgGrade * 100) / 100,
        overall_avg_completion: Math.round(overallAvgCompletion),
        total_study_hours: Math.round(totalStudyHours),
      };
    };

    // ==================== UPCOMING TASKS ====================
    const computeUpcomingTasks = () => {
      const tasks: Array<{
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
      }> = [];

      assignments
        .filter(a => new Date(a.due_date) > now && !a.is_completed)
        .forEach(a => {
          tasks.push({
            id: a.id,
            title: a.title,
            type: 'assignment',
            due_date: a.due_date,
            course_id: a.course_id,
            course_name: getCourseName(a.course_id),
            course_color: getCourseColor(a.course_id),
            priority: a.priority || undefined,
            is_completed: a.is_completed,
            description: a.description || undefined,
            estimated_hours: a.estimated_hours || undefined,
          });
        });

      exams
        .filter(e => new Date(e.exam_date) > now)
        .forEach(e => {
          tasks.push({
            id: e.id,
            title: e.title,
            type: 'exam',
            due_date: e.exam_date,
            course_id: e.course_id,
            course_name: getCourseName(e.course_id),
            course_color: getCourseColor(e.course_id),
            description: e.notes || undefined,
            exam_type: e.exam_type || undefined,
            location: e.location || undefined,
          });
        });

      tasks.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

      const today = tasks.filter(t => isToday(new Date(t.due_date)));
      const tomorrow = tasks.filter(t => isTomorrow(new Date(t.due_date)));
      const thisWeek = tasks.filter(t => {
        const dueDate = new Date(t.due_date);
        return isThisWeek(dueDate) && !isToday(dueDate) && !isTomorrow(dueDate);
      });
      const nextWeek = tasks.filter(t => {
        const daysDiff = Math.ceil((new Date(t.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff > 7 && daysDiff <= 14;
      });

      return {
        today,
        tomorrow,
        this_week: thisWeek,
        next_week: nextWeek,
        total_assignments: tasks.filter(t => t.type === 'assignment').length,
        total_exams: tasks.filter(t => t.type === 'exam').length,
      };
    };

    // Compute all analytics
    const response = {
      computed_at: now.toISOString(),
      time_range: {
        start: rangeStart.toISOString(),
        end: now.toISOString(),
        preset: timeRange,
      },
      study_hours_distribution: computeStudyHoursDistribution(),
      assignments_overview: computeAssignmentsOverview(),
      grade_trends: computeGradeTrends(),
      efficiency_metrics: computeEfficiencyMetrics(),
      daily_study_time: computeDailyStudyTime(),
      streak_progress: computeStreakProgress(),
      schedule_optimization: computeScheduleOptimization(),
      workload_distribution: computeWorkloadDistribution(),
      late_submissions: computeLateSubmissions(),
      completion_rate_trends: computeCompletionRateTrends(),
      course_performance: computeCoursePerformance(),
      upcoming_tasks: computeUpcomingTasks(),
    };

    console.log(`Analytics computed successfully for user ${user.id}`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error computing analytics:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper functions
function formatDate(date: Date, format: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const d = date.getDate();
  const m = date.getMonth();
  const y = date.getFullYear();
  const day = date.getDay();
  
  return format
    .replace('yyyy', y.toString())
    .replace('MM', (m + 1).toString().padStart(2, '0'))
    .replace('dd', d.toString().padStart(2, '0'))
    .replace('MMM', months[m])
    .replace('EEE', days[day]);
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekEnd(weekStart: Date): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();
}

function isSameWeek(date: Date, weekStart: Date): boolean {
  const weekEnd = getWeekEnd(weekStart);
  return date >= weekStart && date <= weekEnd;
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

function isTomorrow(date: Date): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameDay(date, tomorrow);
}

function isThisWeek(date: Date): boolean {
  return isSameWeek(date, getWeekStart(new Date()));
}
