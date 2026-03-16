import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format, addDays, startOfWeek, endOfWeek, isSameWeek } from "date-fns";
import { BarChart3, TrendingUp, AlertTriangle } from "lucide-react";

interface WorkloadDistributionAnalysisProps {
  assignments: any[];
  exams: any[];
  courses: any[];
}

interface WeeklyWorkload {
  week: string;
  assignments: any[];
  exams: any[];
  totalItems: number;
  estimatedHours: number;
  workloadLevel: 'light' | 'moderate' | 'heavy' | 'critical';
}

export function WorkloadDistributionAnalysis({ assignments, exams, courses }: WorkloadDistributionAnalysisProps) {
  const workloadAnalysis = useMemo(() => {
    const now = new Date();
    const weeks: WeeklyWorkload[] = [];

    for (let i = 0; i < 4; i++) {
      const weekStart = startOfWeek(addDays(now, i * 7));
      const weekKey = i === 0 ? "This Week" : i === 1 ? "Next Week" : format(weekStart, 'MMM d');

      const weekAssignments = assignments.filter(assignment => {
        const dueDate = new Date(assignment.due_date);
        return isSameWeek(dueDate, weekStart) && !assignment.is_completed;
      });

      const weekExams = exams.filter(exam => {
        const examDate = new Date(exam.exam_date);
        return isSameWeek(examDate, weekStart);
      });

      const totalItems = weekAssignments.length + weekExams.length;

      const estimatedHours = weekAssignments.reduce((total, assignment) => {
        return total + (assignment.estimated_hours || 2);
      }, 0) + weekExams.reduce((total, exam) => {
        return total + (exam.study_hours_planned || 10);
      }, 0);

      let workloadLevel: 'light' | 'moderate' | 'heavy' | 'critical' = 'light';
      if (totalItems >= 8 || estimatedHours >= 25) {
        workloadLevel = 'critical';
      } else if (totalItems >= 5 || estimatedHours >= 15) {
        workloadLevel = 'heavy';
      } else if (totalItems >= 3 || estimatedHours >= 8) {
        workloadLevel = 'moderate';
      }

      weeks.push({
        week: weekKey,
        assignments: weekAssignments,
        exams: weekExams,
        totalItems,
        estimatedHours: Math.round(estimatedHours * 100) / 100,
        workloadLevel
      });
    }

    return weeks;
  }, [assignments, exams, courses]);

  const getWorkloadColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'heavy': return 'bg-orange-500 text-white';
      case 'moderate': return 'bg-blue-500 text-white';
      default: return 'bg-emerald-500 text-white';
    }
  };

  const getProgressColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-destructive';
      case 'heavy': return 'bg-orange-500';
      case 'moderate': return 'bg-blue-500';
      default: return 'bg-emerald-500';
    }
  }

  return (
    <Card className="bg-gradient-to-br from-card/50 to-muted/20 border-border/50 backdrop-blur-sm overflow-hidden h-full flex flex-col hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="w-5 h-5 text-primary" />
          Workload Forecast
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {workloadAnalysis.map((week, index) => (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-muted-foreground">{week.week}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${getWorkloadColor(week.workloadLevel)}`}>
                {week.totalItems} items
              </span>
            </div>
            {/* Custom Progress Bar */}
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressColor(week.workloadLevel)} transition-all duration-500`}
                style={{ width: `${Math.min((week.estimatedHours / 40) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{week.estimatedHours}h est.</span>
              <span>{week.exams.length > 0 ? `${week.exams.length} Exams` : ''}</span>
            </div>
          </div>
        ))}

        <div className="pt-2 border-t border-border/30">
          <div className="flex items-start gap-2 p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <TrendingUp className="w-4 h-4 text-indigo-500 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-indigo-500">Weekly Insight</p>
              <p className="text-[10px] text-indigo-400/80 leading-tight">
                {workloadAnalysis[0].workloadLevel === 'light'
                  ? "Light week ahead. Good time to prep for future exams."
                  : "Heavy week upcoming. Prioritize high-impact tasks."}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
