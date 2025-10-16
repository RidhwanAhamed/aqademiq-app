import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { AlertTriangle, TrendingDown, Clock } from "lucide-react";

interface LateSubmissionsChartProps {
  assignments: any[];
}

export function LateSubmissionsChart({ assignments }: LateSubmissionsChartProps) {
  // Calculate late submissions for the past 30 days, grouped by week
  const lateSubmissionData = useMemo(() => {
    const now = new Date();
    const fourWeeksAgo = subWeeks(now, 4);
    
    // Generate 4 weeks of data
    const weeks = Array.from({ length: 4 }, (_, i) => {
      const weekStart = startOfWeek(subWeeks(now, 3 - i));
      const weekEnd = endOfWeek(weekStart);
      return { weekStart, weekEnd };
    });

    return weeks.map(({ weekStart, weekEnd }) => {
      // Find assignments that were due in this week
      const assignmentsInWeek = assignments.filter(assignment => {
        const dueDate = new Date(assignment.due_date);
        return dueDate >= weekStart && dueDate <= weekEnd;
      });

      // Count late submissions (completed after due date)
      const lateSubmissions = assignmentsInWeek.filter(assignment => {
        if (!assignment.is_completed) return false;
        
        const dueDate = new Date(assignment.due_date);
        const completionDate = new Date(assignment.updated_at || assignment.created_at);
        
        return completionDate > dueDate;
      });

      // Calculate days late for each late submission
      const lateSubmissionDetails = lateSubmissions.map(assignment => {
        const dueDate = new Date(assignment.due_date);
        const completionDate = new Date(assignment.updated_at || assignment.created_at);
        const daysLate = Math.ceil((completionDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          assignment,
          daysLate: Math.max(0, daysLate),
        };
      });

      const averageDaysLate = lateSubmissionDetails.length > 0 
        ? lateSubmissionDetails.reduce((sum, item) => sum + item.daysLate, 0) / lateSubmissionDetails.length
        : 0;

      return {
        week: format(weekStart, "MMM d"),
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        lateCount: lateSubmissions.length,
        totalAssignments: assignmentsInWeek.length,
        averageDaysLate: Math.round(averageDaysLate * 10) / 10,
        lateRate: assignmentsInWeek.length > 0 
          ? Math.round((lateSubmissions.length / assignmentsInWeek.length) * 100)
          : 0,
        lateSubmissions: lateSubmissionDetails,
      };
    });
  }, [assignments]);

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    const totalLate = lateSubmissionData.reduce((sum, week) => sum + week.lateCount, 0);
    const totalAssignments = lateSubmissionData.reduce((sum, week) => sum + week.totalAssignments, 0);
    const overallLateRate = totalAssignments > 0 ? Math.round((totalLate / totalAssignments) * 100) : 0;
    
    const allLateSubmissions = lateSubmissionData.flatMap(week => week.lateSubmissions);
    const averageDaysLate = allLateSubmissions.length > 0
      ? allLateSubmissions.reduce((sum, item) => sum + item.daysLate, 0) / allLateSubmissions.length
      : 0;

    return {
      totalLate,
      totalAssignments,
      overallLateRate,
      averageDaysLate: Math.round(averageDaysLate * 10) / 10,
    };
  }, [lateSubmissionData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card p-3 border border-border rounded-lg shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-primary">
              <span className="font-medium">{data.lateCount}</span> late submissions
            </p>
            <p className="text-sm text-muted-foreground">
              {data.totalAssignments} total assignments
            </p>
            <p className="text-sm text-muted-foreground">
              {data.lateRate}% late rate
            </p>
            {data.averageDaysLate > 0 && (
              <p className="text-sm text-muted-foreground">
                Avg {data.averageDaysLate} days late
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const getLateRateColor = (rate: number) => {
    if (rate === 0) return 'text-success';
    if (rate <= 25) return 'text-warning';
    if (rate <= 50) return 'text-orange-500';
    return 'text-destructive';
  };

  const getLateRateBadge = (rate: number) => {
    if (rate === 0) return <Badge variant="default" className="bg-success text-success-foreground text-xs">Perfect</Badge>;
    if (rate <= 25) return <Badge variant="secondary" className="text-xs">Good</Badge>;
    if (rate <= 50) return <Badge variant="outline" className="text-warning text-xs">Needs Improvement</Badge>;
    return <Badge variant="destructive" className="text-xs">Critical</Badge>;
  };

  return (
    <Card className="bg-gradient-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-primary" />
            Late Submission Trends
          </CardTitle>
          <div className="flex items-center gap-2">
            {getLateRateBadge(overallStats.overallLateRate)}
            <Badge variant="outline" className="text-xs">
              Past 30 days
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {overallStats.totalAssignments === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No Assignment Data</p>
            <p className="text-sm">
              No assignments found in the past 30 days.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={lateSubmissionData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="week" 
                  className="text-sm"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  allowDecimals={false}
                  className="text-sm"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Late Submissions', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="lateCount" 
                  fill="#E85D75"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>

            {/* Summary Statistics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {overallStats.totalLate}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Late
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {overallStats.overallLateRate}%
                </div>
                <div className="text-sm text-muted-foreground">
                  Late Rate
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {overallStats.averageDaysLate}
                </div>
                <div className="text-sm text-muted-foreground">
                  Avg Days Late
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {overallStats.totalAssignments}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Assignments
                </div>
              </div>
            </div>

            {/* Weekly Breakdown */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Weekly Breakdown</h4>
              <div className="space-y-2">
                {lateSubmissionData.map((week, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/20">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{week.week}</span>
                      <Badge variant="outline" className="text-xs">
                        {week.lateCount}/{week.totalAssignments}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${getLateRateColor(week.lateRate)}`}>
                        {week.lateRate}%
                      </span>
                      {week.averageDaysLate > 0 && (
                        <span className="text-xs text-muted-foreground">
                          avg {week.averageDaysLate}d late
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Improvement Suggestions */}
            {overallStats.overallLateRate > 25 && (
              <div className="p-3 bg-warning/5 border border-warning/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <TrendingDown className="w-5 h-5 text-warning mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-warning mb-2">
                      Improvement Needed
                    </h4>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      <li>• Set earlier personal deadlines to avoid last-minute rushes</li>
                      <li>• Break large assignments into smaller, manageable tasks</li>
                      <li>• Use calendar reminders for upcoming due dates</li>
                      <li>• Consider time management techniques like Pomodoro</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

