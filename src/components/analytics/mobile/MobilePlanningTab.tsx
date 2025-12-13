import { useMemo } from "react";
import { CalendarDays, FileText, BookOpen, AlertTriangle, Layers, Clock, Target, CheckCircle, Zap, Brain } from "lucide-react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TimeRange } from "./MobileTimeRangeSelector";
import { addDays, addMonths, isAfter, isBefore, differenceInDays, format, isSameDay } from "date-fns";

interface MobilePlanningTabProps {
  assignments: any[];
  exams: any[];
  courses: any[];
  studySessions: any[];
  timeRange: TimeRange;
}

interface ScheduleInsight {
  type: 'conflict' | 'gap' | 'overload' | 'optimization';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
  icon: React.ReactNode;
}

export function MobilePlanningTab({ assignments, exams, courses, studySessions, timeRange }: MobilePlanningTabProps) {
  // Calculate schedule analysis for next 14 days (matching desktop StudyScheduleOptimization)
  const scheduleAnalysis = useMemo(() => {
    const now = new Date();
    const next14Days = Array.from({ length: 14 }, (_, i) => addDays(now, i));
    
    return next14Days.map(date => {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const daySessions = studySessions?.filter(session => {
        const sessionDate = new Date(session.scheduled_start);
        return sessionDate >= dayStart && sessionDate <= dayEnd;
      }) || [];

      const dayAssignments = assignments?.filter(assignment => {
        const dueDate = new Date(assignment.due_date);
        return isSameDay(dueDate, date) && !assignment.is_completed;
      }) || [];

      const dayExams = exams?.filter(exam => {
        const examDate = new Date(exam.exam_date);
        return isSameDay(examDate, date);
      }) || [];

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
        date: format(date, 'yyyy-MM-dd'),
        dayName: format(date, 'EEE'),
        displayDate: format(date, 'MMM d'),
        sessions: daySessions,
        assignments: dayAssignments,
        exams: dayExams,
        totalHours: Math.round(totalHours * 100) / 100,
        conflicts,
        efficiency: Math.round(efficiency),
        items: dayAssignments.length + dayExams.length
      };
    });
  }, [studySessions, assignments, exams]);

  // Calculate schedule health (matching desktop)
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

  // Generate insights (matching desktop)
  const insights = useMemo(() => {
    const insightsList: ScheduleInsight[] = [];

    scheduleAnalysis.forEach(day => {
      if (day.conflicts > 0) {
        insightsList.push({
          type: 'conflict',
          title: 'Schedule Conflict',
          description: `${day.conflicts} overlapping sessions on ${day.displayDate}`,
          severity: 'high',
          recommendation: 'Reschedule overlapping sessions',
          icon: <AlertTriangle className="w-3 h-3" />
        });
      }

      if (day.totalHours > 8) {
        insightsList.push({
          type: 'overload',
          title: 'Heavy Study Day',
          description: `${day.totalHours}h scheduled on ${day.displayDate}`,
          severity: 'medium',
          recommendation: 'Consider spreading study time',
          icon: <Clock className="w-3 h-3" />
        });
      }

      if ((day.assignments.length > 0 || day.exams.length > 0) && day.sessions.length === 0) {
        insightsList.push({
          type: 'gap',
          title: 'Missing Study Time',
          description: `${day.items} items due on ${day.displayDate} with no study scheduled`,
          severity: 'high',
          recommendation: 'Schedule study sessions',
          icon: <Target className="w-3 h-3" />
        });
      }
    });

    return insightsList.slice(0, 5); // Show top 5 insights
  }, [scheduleAnalysis]);

  // Workload distribution (matching desktop WorkloadDistributionAnalysis)
  const workloadAnalysis = useMemo(() => {
    const now = new Date();
    const weeks = [];
    
    for (let w = 0; w < 4; w++) {
      const weekStart = addDays(now, w * 7);
      const weekEnd = addDays(weekStart, 6);
      
      const weekAssignments = assignments?.filter(a => {
        const dueDate = new Date(a.due_date);
        return !a.is_completed && isAfter(dueDate, weekStart) && isBefore(dueDate, weekEnd);
      }) || [];
      
      const weekExams = exams?.filter(e => {
        const examDate = new Date(e.exam_date);
        return isAfter(examDate, weekStart) && isBefore(examDate, weekEnd);
      }) || [];
      
      const items = weekAssignments.length + weekExams.length;
      const estimatedHours = weekAssignments.reduce((sum, a) => sum + (a.estimated_hours || 2), 0) + weekExams.length * 4;
      
      let level: 'light' | 'moderate' | 'heavy' | 'critical' = 'light';
      if (items > 6 || estimatedHours > 20) level = 'critical';
      else if (items > 4 || estimatedHours > 15) level = 'heavy';
      else if (items > 2 || estimatedHours > 8) level = 'moderate';
      
      weeks.push({
        label: w === 0 ? 'This Week' : w === 1 ? 'Next Week' : `Week ${w + 1}`,
        items,
        hours: Math.round(estimatedHours),
        level,
        assignments: weekAssignments.length,
        exams: weekExams.length
      });
    }
    
    return weeks;
  }, [assignments, exams]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-yellow-500';
      default: return 'text-muted-foreground';
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'critical': return <Badge variant="destructive" className="text-[10px] h-4">Critical</Badge>;
      case 'heavy': return <Badge className="text-[10px] h-4 bg-orange-500">Heavy</Badge>;
      case 'moderate': return <Badge variant="secondary" className="text-[10px] h-4">Moderate</Badge>;
      default: return <Badge variant="outline" className="text-[10px] h-4">Light</Badge>;
    }
  };

  return (
    <div className="space-y-4 p-4 pb-24">
      {/* Schedule Health Card */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              Schedule Optimization
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">Next 14 days</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Health Score */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 text-center">
              <p className="text-4xl font-bold text-primary mb-1">{scheduleHealth.score}%</p>
              <p className="text-xs text-muted-foreground">Schedule Health Score</p>
              <Progress value={scheduleHealth.score} className="h-2 mt-3" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-2 rounded-lg bg-muted/20">
                <p className="text-lg font-bold text-primary">{scheduleHealth.score}%</p>
                <p className="text-[10px] text-muted-foreground">Health</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-destructive/10">
                <p className="text-lg font-bold text-destructive">{scheduleHealth.conflicts}</p>
                <p className="text-[10px] text-muted-foreground">Conflicts</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-yellow-500/10">
                <p className="text-lg font-bold text-yellow-500">{scheduleHealth.gaps}</p>
                <p className="text-[10px] text-muted-foreground">Gaps</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-orange-500/10">
                <p className="text-lg font-bold text-orange-500">{scheduleHealth.overloaded}</p>
                <p className="text-[10px] text-muted-foreground">Overloaded</p>
              </div>
            </div>

            {/* Insights */}
            {insights.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Insights & Recommendations</p>
                <div className="space-y-2 max-h-[150px] overflow-y-auto">
                  {insights.map((insight, i) => (
                    <div key={i} className="p-2 rounded-lg border bg-card/50">
                      <div className="flex items-start gap-2">
                        <div className={`${getSeverityColor(insight.severity)} mt-0.5`}>{insight.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{insight.title}</p>
                          <p className="text-[10px] text-muted-foreground">{insight.description}</p>
                          <p className="text-[10px] text-primary mt-1">💡 {insight.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium">Great Schedule!</p>
                <p className="text-[10px]">No major issues detected</p>
              </div>
            )}

            {/* Weekly Preview */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Next 7 Days</p>
              <div className="space-y-1">
                {scheduleAnalysis.slice(0, 7).map((day, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/20">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium w-8">{day.dayName}</span>
                      <span className="text-[10px] text-muted-foreground">{day.displayDate}</span>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="w-2.5 h-2.5" />{day.totalHours}h
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Target className="w-2.5 h-2.5" />{day.items}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {day.conflicts > 0 && <Badge variant="destructive" className="text-[9px] h-4 px-1">{day.conflicts}</Badge>}
                      <span className="text-[10px] text-muted-foreground">{day.efficiency}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workload Distribution Card */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Workload Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Bar Chart */}
            <div className="h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadAnalysis} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
                    formatter={(v: number) => [`${v} items`, "Workload"]}
                  />
                  <Bar dataKey="items" radius={[4, 4, 0, 0]}>
                    {workloadAnalysis.map((entry, i) => (
                      <Cell 
                        key={i} 
                        fill={entry.level === 'critical' ? 'hsl(var(--destructive))' : 
                              entry.level === 'heavy' ? '#f97316' : 
                              entry.level === 'moderate' ? 'hsl(var(--primary))' : 
                              'hsl(var(--muted-foreground))'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Weekly Breakdown */}
            <div className="space-y-2">
              {workloadAnalysis.map((week, i) => (
                <div key={i} className="p-3 rounded-lg border bg-card/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">{week.label}</span>
                    {getLevelBadge(week.level)}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                    <span><FileText className="w-3 h-3 inline mr-1" />{week.assignments} assignments</span>
                    <span><BookOpen className="w-3 h-3 inline mr-1" />{week.exams} exams</span>
                    <span><Clock className="w-3 h-3 inline mr-1" />~{week.hours}h</span>
                  </div>
                  <Progress 
                    value={Math.min(week.items * 15, 100)} 
                    className="h-1.5"
                  />
                </div>
              ))}
            </div>

            {/* Peak Alert */}
            {workloadAnalysis.some(w => w.level === 'critical' || w.level === 'heavy') && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-3 h-3 text-destructive" />
                  <span className="text-xs font-medium text-destructive">Peak Workload Alert</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Consider starting assignments early and spreading study time across multiple days.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
