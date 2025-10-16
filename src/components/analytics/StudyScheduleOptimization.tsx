import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, addDays, startOfWeek, endOfWeek, isSameDay, isToday, isTomorrow } from "date-fns";
import { Calendar, Clock, Target, AlertTriangle, CheckCircle, Brain, Zap } from "lucide-react";

interface StudyScheduleOptimizationProps {
  studySessions: any[];
  assignments: any[];
  exams: any[];
  courses: any[];
}

interface ScheduleInsight {
  type: 'conflict' | 'gap' | 'overload' | 'optimization' | 'reminder';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  course?: string;
  date?: string;
  time?: string;
  recommendation: string;
  icon: React.ReactNode;
}

interface WeeklySchedule {
  date: string;
  dayName: string;
  sessions: any[];
  assignments: any[];
  exams: any[];
  totalHours: number;
  conflicts: number;
  efficiency: number;
}

export function StudyScheduleOptimization({ studySessions, assignments, exams, courses }: StudyScheduleOptimizationProps) {
  // Analyze schedule for the next 2 weeks
  const scheduleAnalysis = useMemo(() => {
    const now = new Date();
    const next14Days = Array.from({ length: 14 }, (_, i) => addDays(now, i));
    
    const weeklySchedules: WeeklySchedule[] = next14Days.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      // Find study sessions for this day
      const daySessions = studySessions.filter(session => {
        const sessionDate = new Date(session.scheduled_start);
        return sessionDate >= dayStart && sessionDate <= dayEnd;
      });

      // Find assignments due on this day
      const dayAssignments = assignments.filter(assignment => {
        const dueDate = new Date(assignment.due_date);
        return isSameDay(dueDate, date) && !assignment.is_completed;
      });

      // Find exams on this day
      const dayExams = exams.filter(exam => {
        const examDate = new Date(exam.exam_date);
        return isSameDay(examDate, date);
      });

      // Calculate total study hours
      const totalHours = daySessions.reduce((total, session) => {
        if (session.scheduled_start && session.scheduled_end) {
          const duration = new Date(session.scheduled_end).getTime() - new Date(session.scheduled_start).getTime();
          return total + (duration / (1000 * 60 * 60));
        }
        return total;
      }, 0);

      // Detect conflicts (overlapping sessions)
      const conflicts = daySessions.filter((session, index) => {
        return daySessions.some((otherSession, otherIndex) => {
          if (index === otherIndex) return false;
          const sessionStart = new Date(session.scheduled_start);
          const sessionEnd = new Date(session.scheduled_end);
          const otherStart = new Date(otherSession.scheduled_start);
          const otherEnd = new Date(otherSession.scheduled_end);
          
          return (sessionStart < otherEnd && sessionEnd > otherStart);
        });
      }).length;

      // Calculate efficiency (sessions vs workload)
      const workload = dayAssignments.length + dayExams.length;
      const efficiency = workload > 0 ? Math.min((daySessions.length / workload) * 100, 100) : 100;

      return {
        date: dateStr,
        dayName: format(date, 'EEE'),
        sessions: daySessions,
        assignments: dayAssignments,
        exams: dayExams,
        totalHours: Math.round(totalHours * 100) / 100,
        conflicts,
        efficiency: Math.round(efficiency)
      };
    });

    return weeklySchedules;
  }, [studySessions, assignments, exams]);

  // Generate insights and recommendations
  const insights = useMemo(() => {
    const insightsList: ScheduleInsight[] = [];
    const now = new Date();

    // Analyze each day for insights
    scheduleAnalysis.forEach(day => {
      const dayDate = new Date(day.date);

      // Check for schedule conflicts
      if (day.conflicts > 0) {
        insightsList.push({
          type: 'conflict',
          title: 'Schedule Conflict Detected',
          description: `${day.conflicts} overlapping study sessions on ${format(dayDate, 'MMM d')}`,
          severity: 'high',
          date: day.date,
          recommendation: 'Reschedule overlapping sessions to avoid conflicts and maintain focus',
          icon: <AlertTriangle className="w-4 h-4" />
        });
      }

      // Check for overloaded days
      if (day.totalHours > 8) {
        insightsList.push({
          type: 'overload',
          title: 'Heavy Study Day',
          description: `${day.totalHours} hours of study scheduled on ${format(dayDate, 'MMM d')}`,
          severity: 'medium',
          date: day.date,
          recommendation: 'Consider spreading study time across multiple days for better retention',
          icon: <Clock className="w-4 h-4" />
        });
      }

      // Check for days with assignments/exams but no study time
      if ((day.assignments.length > 0 || day.exams.length > 0) && day.sessions.length === 0) {
        insightsList.push({
          type: 'gap',
          title: 'Missing Study Time',
          description: `${day.assignments.length + day.exams.length} items due on ${format(dayDate, 'MMM d')} but no study time scheduled`,
          severity: 'high',
          date: day.date,
          recommendation: 'Schedule study sessions to prepare for upcoming deadlines',
          icon: <Target className="w-4 h-4" />
        });
      }

      // Check for low efficiency days
      if (day.efficiency < 50 && day.sessions.length > 0) {
        insightsList.push({
          type: 'optimization',
          title: 'Low Study Efficiency',
          description: `Only ${day.efficiency}% efficiency on ${format(dayDate, 'MMM d')} - more study time than workload`,
          severity: 'low',
          date: day.date,
          recommendation: 'Consider reducing study time or adding more tasks to optimize your schedule',
          icon: <Zap className="w-4 h-4" />
        });
      }
    });

    // Check for upcoming deadlines without preparation
    const upcomingDeadlines = assignments
      .filter(assignment => {
        const dueDate = new Date(assignment.due_date);
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilDue <= 7 && daysUntilDue > 0 && !assignment.is_completed;
      })
      .filter(assignment => {
        // Check if there's study time scheduled for this assignment
        return !studySessions.some(session => 
          session.assignment_id === assignment.id && 
          new Date(session.scheduled_start) <= new Date(assignment.due_date)
        );
      });

    upcomingDeadlines.forEach(assignment => {
      const course = courses.find(c => c.id === assignment.course_id);
      insightsList.push({
        type: 'reminder',
        title: 'Assignment Needs Study Time',
        description: `${assignment.title} due ${format(new Date(assignment.due_date), 'MMM d')} but no study time scheduled`,
        severity: 'medium',
        course: course?.name,
        date: assignment.due_date,
        recommendation: 'Schedule dedicated study sessions to complete this assignment on time',
        icon: <CheckCircle className="w-4 h-4" />
      });
    });

    // Sort by severity and date
    return insightsList.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return new Date(a.date || '').getTime() - new Date(b.date || '').getTime();
    });
  }, [scheduleAnalysis, assignments, studySessions, courses]);

  // Calculate overall schedule health
  const scheduleHealth = useMemo(() => {
    const totalDays = scheduleAnalysis.length;
    const daysWithConflicts = scheduleAnalysis.filter(day => day.conflicts > 0).length;
    const daysWithGaps = scheduleAnalysis.filter(day => 
      (day.assignments.length > 0 || day.exams.length > 0) && day.sessions.length === 0
    ).length;
    const overloadedDays = scheduleAnalysis.filter(day => day.totalHours > 8).length;

    const healthScore = Math.max(0, 100 - 
      (daysWithConflicts / totalDays) * 40 - 
      (daysWithGaps / totalDays) * 30 - 
      (overloadedDays / totalDays) * 20
    );

    return {
      score: Math.round(healthScore),
      conflicts: daysWithConflicts,
      gaps: daysWithGaps,
      overloaded: overloadedDays,
      totalDays
    };
  }, [scheduleAnalysis]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high': return <Badge variant="destructive" className="text-xs">High</Badge>;
      case 'medium': return <Badge variant="secondary" className="text-xs">Medium</Badge>;
      default: return <Badge variant="outline" className="text-xs">Low</Badge>;
    }
  };

  return (
    <Card className="bg-gradient-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Study Schedule Optimization
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {scheduleHealth.score}% Health
            </Badge>
            <Badge variant="outline" className="text-xs">
              Next 14 days
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Schedule Health Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/20">
              <div className="text-2xl font-bold text-primary">
                {scheduleHealth.score}%
              </div>
              <div className="text-sm text-muted-foreground">
                Schedule Health
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/20">
              <div className="text-2xl font-bold text-destructive">
                {scheduleHealth.conflicts}
              </div>
              <div className="text-sm text-muted-foreground">
                Conflicts
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/20">
              <div className="text-2xl font-bold text-warning">
                {scheduleHealth.gaps}
              </div>
              <div className="text-sm text-muted-foreground">
                Study Gaps
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/20">
              <div className="text-2xl font-bold text-orange-500">
                {scheduleHealth.overloaded}
              </div>
              <div className="text-sm text-muted-foreground">
                Overloaded Days
              </div>
            </div>
          </div>

          {/* Insights and Recommendations */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Schedule Insights & Recommendations</h4>
            {insights.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Great Schedule!</p>
                <p className="text-sm">
                  No major issues detected in your upcoming study schedule.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {insights.map((insight, index) => (
                  <div key={index} className="p-3 rounded-lg border bg-card/50">
                    <div className="flex items-start gap-3">
                      <div className={`${getSeverityColor(insight.severity)} mt-0.5`}>
                        {insight.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{insight.title}</span>
                          {getSeverityBadge(insight.severity)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {insight.description}
                        </p>
                        <p className="text-xs text-primary">
                          💡 {insight.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weekly Schedule Preview */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Upcoming Schedule (Next 7 Days)</h4>
            <div className="space-y-2">
              {scheduleAnalysis.slice(0, 7).map((day, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className="w-12 text-sm font-medium">
                      {day.dayName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(day.date), 'MMM d')}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span className="text-xs">{day.totalHours}h</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      <span className="text-xs">{day.assignments.length + day.exams.length} items</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {day.conflicts > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {day.conflicts} conflicts
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {day.efficiency}% efficiency
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


