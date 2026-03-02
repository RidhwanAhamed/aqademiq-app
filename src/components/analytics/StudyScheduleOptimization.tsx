import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, addDays, isSameDay } from "date-fns";
import { Calendar, Clock, Target, AlertTriangle, CheckCircle, Zap } from "lucide-react";

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

      const daySessions = studySessions.filter(session => {
        const sessionDate = new Date(session.scheduled_start);
        return sessionDate >= dayStart && sessionDate <= dayEnd;
      });

      const dayAssignments = assignments.filter(assignment => {
        const dueDate = new Date(assignment.due_date);
        return isSameDay(dueDate, date) && !assignment.is_completed;
      });

      const dayExams = exams.filter(exam => {
        const examDate = new Date(exam.exam_date);
        return isSameDay(examDate, date);
      });

      const totalHours = daySessions.reduce((total, session) => {
        if (session.scheduled_start && session.scheduled_end) {
          const duration = new Date(session.scheduled_end).getTime() - new Date(session.scheduled_start).getTime();
          return total + (duration / (1000 * 60 * 60));
        }
        return total;
      }, 0);

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

  // Generate insights
  const insights = useMemo(() => {
    const insightsList: ScheduleInsight[] = [];
    const now = new Date();

    scheduleAnalysis.forEach(day => {
      const dayDate = new Date(day.date);

      if (day.conflicts > 0) {
        insightsList.push({
          type: 'conflict',
          title: 'Conflict Detected',
          description: `${day.conflicts} overlaps on ${format(dayDate, 'MMM d')}`,
          severity: 'high',
          date: day.date,
          recommendation: 'Reschedule sessions',
          icon: <AlertTriangle className="w-4 h-4" />
        });
      }

      if (day.totalHours > 8) {
        insightsList.push({
          type: 'overload',
          title: 'Heavy Load',
          description: `${day.totalHours}h study on ${format(dayDate, 'MMM d')}`,
          severity: 'medium',
          date: day.date,
          recommendation: 'Break into smaller blocks',
          icon: <Clock className="w-4 h-4" />
        });
      }

      if ((day.assignments.length > 0 || day.exams.length > 0) && day.sessions.length === 0) {
        insightsList.push({
          type: 'gap',
          title: 'Unprepared',
          description: `Deadlines on ${format(dayDate, 'MMM d')}, no study time`,
          severity: 'high',
          date: day.date,
          recommendation: 'Add study session now',
          icon: <Target className="w-4 h-4" />
        });
      }
    });

    const upcomingDeadlines = assignments
      .filter(assignment => {
        const dueDate = new Date(assignment.due_date);
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilDue <= 7 && daysUntilDue > 0 && !assignment.is_completed;
      })
      .filter(assignment => {
        return !studySessions.some(session =>
          session.assignment_id === assignment.id &&
          new Date(session.scheduled_start) <= new Date(assignment.due_date)
        );
      });

    upcomingDeadlines.forEach(assignment => {
      const course = courses.find(c => c.id === assignment.course_id);
      insightsList.push({
        type: 'reminder',
        title: 'Plan Study Time',
        description: `${assignment.title} due soon`,
        severity: 'medium',
        course: course?.name,
        date: assignment.due_date,
        recommendation: `Schedule time for ${course?.name}`,
        icon: <CheckCircle className="w-4 h-4" />
      });
    });

    return insightsList.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return new Date(a.date || '').getTime() - new Date(b.date || '').getTime();
    });
  }, [scheduleAnalysis, assignments, studySessions, courses]);

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
      overloaded: overloadedDays
    };
  }, [scheduleAnalysis]);

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-card/50 to-muted/20 border-border/50 backdrop-blur-sm overflow-hidden h-full flex flex-col hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-5 h-5 text-primary" />
            AI Schedule Optimizer
          </CardTitle>
          <Badge variant={scheduleHealth.score > 80 ? 'default' : 'secondary'} className={scheduleHealth.score > 80 ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
            {scheduleHealth.score}% Healthy
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto pr-1 space-y-4">

        {/* Insights List */}
        <div className="space-y-2">
          {insights.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground bg-background/30 rounded-xl border border-border/30">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-30 text-emerald-500" />
              <p className="text-sm font-medium">Schedule is optimized!</p>
            </div>
          ) : (
            insights.slice(0, 3).map((insight, index) => (
              <div key={index} className={`p-3 rounded-xl border flex items-start gap-3 ${getSeverityStyles(insight.severity)}`}>
                <div className="mt-0.5">{insight.icon}</div>
                <div>
                  <p className="text-sm font-bold">{insight.title}</p>
                  <p className="text-xs opacity-90">{insight.description}</p>
                  <p className="text-[10px] mt-1 font-semibold opacity-75">Try: {insight.recommendation}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Mini Calendar Strip */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Next 7 Days</h4>
          <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
            {scheduleAnalysis.slice(0, 7).map((day, i) => (
              <div key={i} className={`
                    flex-shrink-0 w-12 h-16 rounded-lg border flex flex-col items-center justify-center gap-0.5
                    ${day.conflicts > 0 ? 'bg-destructive/10 border-destructive/30' : day.totalHours > 0 ? 'bg-primary/10 border-primary/20' : 'bg-background/20 border-border/20'}
                 `}>
                <span className="text-[10px] text-muted-foreground">{day.dayName}</span>
                <span className="text-sm font-bold">{format(new Date(day.date), 'd')}</span>
                {day.conflicts > 0 && <div className="w-1 h-1 rounded-full bg-destructive mt-1" />}
                {day.totalHours > 0 && !day.conflicts && <div className="w-1 h-1 rounded-full bg-primary mt-1" />}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
