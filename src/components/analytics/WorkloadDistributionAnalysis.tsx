import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format, addDays, startOfWeek, endOfWeek, isSameWeek } from "date-fns";
import { BarChart3, Calendar, Clock, Target, AlertTriangle, TrendingUp, BookOpen } from "lucide-react";

interface WorkloadDistributionAnalysisProps {
  assignments: any[];
  exams: any[];
  courses: any[];
}

interface WeeklyWorkload {
  week: string;
  weekStart: Date;
  weekEnd: Date;
  assignments: any[];
  exams: any[];
  totalItems: number;
  estimatedHours: number;
  completedItems: number;
  completionRate: number;
  workloadLevel: 'light' | 'moderate' | 'heavy' | 'critical';
  courses: string[];
}

export function WorkloadDistributionAnalysis({ assignments, exams, courses }: WorkloadDistributionAnalysisProps) {
  // Analyze workload distribution over the next 8 weeks
  const workloadAnalysis = useMemo(() => {
    const now = new Date();
    const weeks: WeeklyWorkload[] = [];
    
    // Generate next 8 weeks
    for (let i = 0; i < 8; i++) {
      const weekStart = startOfWeek(addDays(now, i * 7));
      const weekEnd = endOfWeek(weekStart);
      const weekKey = format(weekStart, 'MMM d');
      
      // Find assignments due in this week
      const weekAssignments = assignments.filter(assignment => {
        const dueDate = new Date(assignment.due_date);
        return isSameWeek(dueDate, weekStart) && !assignment.is_completed;
      });
      
      // Find exams in this week
      const weekExams = exams.filter(exam => {
        const examDate = new Date(exam.exam_date);
        return isSameWeek(examDate, weekStart);
      });
      
      const totalItems = weekAssignments.length + weekExams.length;
      const completedItems = weekAssignments.filter(a => a.is_completed).length;
      const completionRate = totalItems > 0 ? (completedItems / totalItems) * 100 : 100;
      
      // Calculate estimated hours
      const estimatedHours = weekAssignments.reduce((total, assignment) => {
        return total + (assignment.estimated_hours || 2); // Default 2 hours if not specified
      }, 0) + weekExams.reduce((total, exam) => {
        return total + (exam.study_hours_planned || 10); // Default 10 hours for exams
      }, 0);
      
      // Determine workload level
      let workloadLevel: 'light' | 'moderate' | 'heavy' | 'critical' = 'light';
      if (totalItems >= 8 || estimatedHours >= 25) {
        workloadLevel = 'critical';
      } else if (totalItems >= 5 || estimatedHours >= 15) {
        workloadLevel = 'heavy';
      } else if (totalItems >= 3 || estimatedHours >= 8) {
        workloadLevel = 'moderate';
      }
      
      // Get unique courses for this week
      const weekCourses = new Set([
        ...weekAssignments.map(a => a.course_id),
        ...weekExams.map(e => e.course_id)
      ]);
      
      const courseNames = Array.from(weekCourses).map(courseId => {
        const course = courses.find(c => c.id === courseId);
        return course?.name || 'Unknown Course';
      });
      
      weeks.push({
        week: weekKey,
        weekStart,
        weekEnd,
        assignments: weekAssignments,
        exams: weekExams,
        totalItems,
        estimatedHours: Math.round(estimatedHours * 100) / 100,
        completedItems,
        completionRate: Math.round(completionRate * 100) / 100,
        workloadLevel,
        courses: courseNames
      });
    }
    
    return weeks;
  }, [assignments, exams, courses]);

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    const totalWeeks = workloadAnalysis.length;
    const lightWeeks = workloadAnalysis.filter(w => w.workloadLevel === 'light').length;
    const moderateWeeks = workloadAnalysis.filter(w => w.workloadLevel === 'moderate').length;
    const heavyWeeks = workloadAnalysis.filter(w => w.workloadLevel === 'heavy').length;
    const criticalWeeks = workloadAnalysis.filter(w => w.workloadLevel === 'critical').length;
    
    const totalItems = workloadAnalysis.reduce((sum, week) => sum + week.totalItems, 0);
    const totalHours = workloadAnalysis.reduce((sum, week) => sum + week.estimatedHours, 0);
    const avgItemsPerWeek = totalItems / totalWeeks;
    const avgHoursPerWeek = totalHours / totalWeeks;
    
    // Find peak workload week
    const peakWeek = workloadAnalysis.length > 0 
      ? workloadAnalysis.reduce((peak, week) => 
          week.totalItems > peak.totalItems ? week : peak
        )
      : null;
    
    return {
      totalWeeks,
      lightWeeks,
      moderateWeeks,
      heavyWeeks,
      criticalWeeks,
      totalItems,
      totalHours: Math.round(totalHours * 100) / 100,
      avgItemsPerWeek: Math.round(avgItemsPerWeek * 100) / 100,
      avgHoursPerWeek: Math.round(avgHoursPerWeek * 100) / 100,
      peakWeek
    };
  }, [workloadAnalysis]);

  const getWorkloadColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-destructive';
      case 'heavy': return 'text-warning';
      case 'moderate': return 'text-primary';
      default: return 'text-success';
    }
  };

  const getWorkloadBadge = (level: string) => {
    switch (level) {
      case 'critical': return <Badge variant="destructive" className="text-xs">Critical</Badge>;
      case 'heavy': return <Badge variant="secondary" className="text-xs">Heavy</Badge>;
      case 'moderate': return <Badge variant="outline" className="text-xs">Moderate</Badge>;
      default: return <Badge variant="default" className="text-xs">Light</Badge>;
    }
  };

  const getWorkloadBarColor = (level: string) => {
    switch (level) {
      case 'critical': return '#EF4444';
      case 'heavy': return '#F59E0B';
      case 'moderate': return '#3B82F6';
      default: return '#10B981';
    }
  };

  return (
    <Card className="bg-gradient-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Workload Distribution Analysis
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Overall Statistics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/20">
              <div className="text-2xl font-bold text-primary">
                {overallStats.totalItems}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Items
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/20">
              <div className="text-2xl font-bold text-primary">
                {overallStats.totalHours}
              </div>
              <div className="text-sm text-muted-foreground">
                Estimated Hours
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/20">
              <div className="text-2xl font-bold text-primary">
                {overallStats.avgItemsPerWeek}
              </div>
              <div className="text-sm text-muted-foreground">
                Avg Items/Week
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/20">
              <div className="text-2xl font-bold text-primary">
                {overallStats.avgHoursPerWeek}
              </div>
              <div className="text-sm text-muted-foreground">
                Avg Hours/Week
              </div>
            </div>
          </div>

          {/* Workload Level Distribution */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Workload Level Distribution</h4>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="text-center p-3 rounded-lg bg-success/10">
                <div className="text-xl font-bold text-success">
                  {overallStats.lightWeeks}
                </div>
                <div className="text-sm text-muted-foreground">
                  Light Weeks
                </div>
              </div>
              <div className="text-center p-3 rounded-lg bg-primary/10">
                <div className="text-xl font-bold text-primary">
                  {overallStats.moderateWeeks}
                </div>
                <div className="text-sm text-muted-foreground">
                  Moderate Weeks
                </div>
              </div>
              <div className="text-center p-3 rounded-lg bg-warning/10">
                <div className="text-xl font-bold text-warning">
                  {overallStats.heavyWeeks}
                </div>
                <div className="text-sm text-muted-foreground">
                  Heavy Weeks
                </div>
              </div>
              <div className="text-center p-3 rounded-lg bg-destructive/10">
                <div className="text-xl font-bold text-destructive">
                  {overallStats.criticalWeeks}
                </div>
                <div className="text-sm text-muted-foreground">
                  Critical Weeks
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Breakdown */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Weekly Workload Breakdown</h4>
            <div className="space-y-2">
              {workloadAnalysis.map((week, index) => (
                <div key={index} className="p-3 rounded-lg border bg-card/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-sm">{week.week}</span>
                      {getWorkloadBadge(week.workloadLevel)}
                      <Badge variant="outline" className="text-xs">
                        {week.totalItems} items
                      </Badge>
                    </div>
                    <div className="text-sm font-medium">
                      {week.estimatedHours}h estimated
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Workload Intensity</span>
                      <span className="font-medium">{week.totalItems} items</span>
                    </div>
                    <Progress 
                      value={Math.min((week.totalItems / 10) * 100, 100)} 
                      className="h-2"
                    />
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {week.assignments.length} assignments, {week.exams.length} exams
                      </span>
                      <span>
                        {week.courses.length} course{week.courses.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    {week.courses.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {week.courses.map((course, courseIndex) => (
                          <Badge key={courseIndex} variant="outline" className="text-xs">
                            {course}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Peak Workload Alert */}
          {overallStats.peakWeek && 'week' in overallStats.peakWeek && overallStats.peakWeek.totalItems > 0 && (
            <div className="p-3 bg-warning/5 border border-warning/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-sm text-warning mb-2">
                    Peak Workload Alert
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Week of {overallStats.peakWeek.week} has the highest workload with {overallStats.peakWeek.totalItems} items 
                    and {overallStats.peakWeek.estimatedHours} estimated hours.
                  </p>
                  <div className="text-xs text-muted-foreground">
                    <strong>Recommendations:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Start preparing early for this week</li>
                      <li>Consider spreading some tasks to lighter weeks</li>
                      <li>Block dedicated study time in your calendar</li>
                      <li>Prioritize tasks by importance and deadline</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Workload Balance Insights */}
          <div className="p-3 bg-muted/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Workload Balance Insights</span>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              {overallStats.criticalWeeks > 0 && (
                <p>• You have {overallStats.criticalWeeks} critical workload week{overallStats.criticalWeeks !== 1 ? 's' : ''} - consider redistributing tasks</p>
              )}
              {overallStats.lightWeeks > overallStats.heavyWeeks + overallStats.criticalWeeks && (
                <p>• You have more light weeks than heavy ones - good balance for catch-up time</p>
              )}
              <p>• Average weekly workload: {overallStats.avgItemsPerWeek} items, {overallStats.avgHoursPerWeek} hours</p>
              {overallStats.avgHoursPerWeek > 20 && (
                <p>• Your average weekly hours exceed 20 - ensure you have adequate rest time</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


