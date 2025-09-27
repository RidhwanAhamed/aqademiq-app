import { useMemo } from 'react';

interface Course {
  id: string;
  name: string;
  credits: number;
  progress_percentage: number;
  current_gpa?: number;
}

interface Assignment {
  id: string;
  course_id: string;
  title: string;
  is_completed?: boolean;
  grade_points?: number;
  grade_total?: number;
  due_date: string;
  created_at: string;
}

interface StudySession {
  id: string;
  course_id?: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string;
  actual_end?: string;
  status: string;
}

interface FallbackAnalyticsProps {
  courses: Course[];
  assignments: Assignment[];
  studySessions: StudySession[];
}

export function useFallbackAnalytics({ courses, assignments, studySessions }: FallbackAnalyticsProps) {
  const fallbackMetrics = useMemo(() => {
    // Calculate overall GPA from assignments
    const gradedAssignments = assignments.filter(a => a.grade_points != null && a.grade_total != null && a.grade_total > 0);
    let overallGPA = 0;
    
    if (gradedAssignments.length > 0) {
      const totalPoints = gradedAssignments.reduce((sum, a) => sum + (a.grade_points || 0), 0);
      const totalPossible = gradedAssignments.reduce((sum, a) => sum + (a.grade_total || 0), 0);
      overallGPA = totalPossible > 0 ? (totalPoints / totalPossible) * 10 : 0; // Convert to 10-point scale
    }

    // Calculate completion rate
    const completionRate = assignments.length > 0 
      ? (assignments.filter(a => a.is_completed).length / assignments.length) * 100 
      : 0;

    // Calculate study consistency (days with study sessions in last 30 days)
    const completedSessions = studySessions.filter(s => s.status === 'completed');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentSessions = completedSessions.filter(s => 
      new Date(s.scheduled_start) >= thirtyDaysAgo
    );
    
    const uniqueStudyDays = new Set(
      recentSessions.map(s => new Date(s.scheduled_start).toDateString())
    ).size;
    
    const studyConsistency = (uniqueStudyDays / 30) * 100;

    // Calculate total study hours
    const totalStudyHours = completedSessions.reduce((total, session) => {
      const start = new Date(session.actual_start || session.scheduled_start);
      const end = new Date(session.actual_end || session.scheduled_end);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return total + Math.max(0, hours);
    }, 0);

    return {
      overallGPA: Math.round(overallGPA * 100) / 100,
      completionRate: Math.round(completionRate),
      studyConsistency: Math.round(studyConsistency),
      totalStudyHours: Math.round(totalStudyHours * 10) / 10,
      totalCourses: courses.length,
      totalAssignments: assignments.length,
      completedAssignments: assignments.filter(a => a.is_completed).length,
      gradedAssignments: gradedAssignments.length,
      studySessionsCount: completedSessions.length
    };
  }, [courses, assignments, studySessions]);

  const fallbackGradeForecasts = useMemo(() => {
    return courses.map(course => {
      const courseAssignments = assignments.filter(a => a.course_id === course.id);
      const gradedAssignments = courseAssignments.filter(a => a.grade_points != null && a.grade_total != null);
      
      let currentAverage = 0;
      if (gradedAssignments.length > 0) {
        const totalPoints = gradedAssignments.reduce((sum, a) => sum + (a.grade_points || 0), 0);
        const totalPossible = gradedAssignments.reduce((sum, a) => sum + (a.grade_total || 0), 0);
        currentAverage = totalPossible > 0 ? (totalPoints / totalPossible) * 10 : 0;
      }

      // Simple trend calculation based on recent vs older assignments
      let trendDirection = 'stable';
      if (gradedAssignments.length >= 2) {
        const sortedByDate = gradedAssignments
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        const firstHalf = sortedByDate.slice(0, Math.ceil(sortedByDate.length / 2));
        const secondHalf = sortedByDate.slice(Math.ceil(sortedByDate.length / 2));
        
        const firstAvg = firstHalf.reduce((sum, a) => sum + ((a.grade_points || 0) / (a.grade_total || 1)) * 10, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, a) => sum + ((a.grade_points || 0) / (a.grade_total || 1)) * 10, 0) / secondHalf.length;
        
        const diff = secondAvg - firstAvg;
        if (diff > 0.5) trendDirection = 'improving';
        else if (diff < -0.5) trendDirection = 'declining';
      }

      return {
        course_id: course.id,
        course_name: course.name,
        current_average: Math.round(currentAverage * 100) / 100,
        projected_30_days: Math.round(currentAverage * 100) / 100, // Simple projection
        projected_semester_end: Math.round(currentAverage * 100) / 100,
        trend_direction: trendDirection,
        confidence_level: gradedAssignments.length >= 3 ? 'medium' : 'low'
      };
    });
  }, [courses, assignments]);

  const fallbackStudyAnalytics = useMemo(() => {
    const completedSessions = studySessions.filter(s => s.status === 'completed');
    
    return completedSessions.slice(0, 30).map((session, index) => {
      const start = new Date(session.actual_start || session.scheduled_start);
      const end = new Date(session.actual_end || session.scheduled_end);
      const effectiveMinutes = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60));
      
      return {
        id: `fallback-${session.id}`,
        session_id: session.id,
        course_id: session.course_id || 'general',
        productivity_score: Math.min(100, Math.max(60, 100 - Math.random() * 20)), // Mock score
        distraction_count: Math.floor(Math.random() * 3),
        effective_study_minutes: Math.round(effectiveMinutes * (0.8 + Math.random() * 0.2)), // 80-100% efficiency
        session_rating: 4 + Math.floor(Math.random() * 2), // 4-5 rating
        session_date: start.toISOString().split('T')[0]
      };
    });
  }, [studySessions]);

  const fallbackPerformanceRisks = useMemo(() => {
    const risks = [];
    
    // Check for overdue assignments
    const overdueAssignments = assignments.filter(a => 
      !a.is_completed && new Date(a.due_date) < new Date()
    );
    
    if (overdueAssignments.length >= 3) {
      risks.push({
        risk_type: 'overdue_assignments',
        severity: overdueAssignments.length >= 5 ? 'high' : 'medium',
        description: `You have ${overdueAssignments.length} overdue assignments`,
        affected_courses: [...new Set(overdueAssignments.map(a => a.course_id))],
        recommended_actions: [
          'Create a catch-up schedule for overdue work',
          'Prioritize assignments by due date and weight',
          'Consider speaking with instructors about extensions'
        ]
      });
    }

    // Check for low study hours
    const recentStudyHours = studySessions
      .filter(s => {
        const sessionDate = new Date(s.scheduled_start);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return sessionDate >= weekAgo && s.status === 'completed';
      })
      .reduce((total, session) => {
        const start = new Date(session.actual_start || session.scheduled_start);
        const end = new Date(session.actual_end || session.scheduled_end);
        const hours = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
        return total + hours;
      }, 0);

    if (recentStudyHours < 5) {
      risks.push({
        risk_type: 'insufficient_study_time',
        severity: recentStudyHours < 2 ? 'high' : 'medium',
        description: `Only ${Math.round(recentStudyHours * 10) / 10} study hours logged this week`,
        affected_courses: [],
        recommended_actions: [
          'Schedule dedicated study blocks in your calendar',
          'Set a minimum daily study goal',
          'Use the Pomodoro technique for focused sessions'
        ]
      });
    }

    return risks;
  }, [assignments, studySessions]);

  return {
    fallbackMetrics,
    fallbackGradeForecasts,
    fallbackStudyAnalytics,
    fallbackPerformanceRisks,
    hasFallbackData: courses.length > 0 || assignments.length > 0 || studySessions.length > 0
  };
}