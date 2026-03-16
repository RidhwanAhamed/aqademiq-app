import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { AlertTriangle, ThumbsUp } from "lucide-react";

interface LateSubmissionsChartProps {
  assignments: any[];
}

export function LateSubmissionsChart({ assignments }: LateSubmissionsChartProps) {
  const lateSubmissionData = useMemo(() => {
    const now = new Date();
    // Generate 4 weeks of data
    const weeks = Array.from({ length: 4 }, (_, i) => {
      const weekStart = startOfWeek(subWeeks(now, 3 - i));
      const weekEnd = endOfWeek(weekStart);
      return { weekStart, weekEnd };
    });

    return weeks.map(({ weekStart, weekEnd }) => {
      const assignmentsInWeek = assignments.filter(assignment => {
        const dueDate = new Date(assignment.due_date);
        return dueDate >= weekStart && dueDate <= weekEnd;
      });

      const lateSubmissions = assignmentsInWeek.filter(assignment => {
        if (!assignment.is_completed) return false;
        const dueDate = new Date(assignment.due_date);
        const completionDate = new Date(assignment.updated_at || assignment.created_at);
        return completionDate > dueDate;
      });

      return {
        week: format(weekStart, "MMM d"),
        lateCount: lateSubmissions.length,
        totalAssignments: assignmentsInWeek.length,
      };
    });
  }, [assignments]);

  const totalLate = useMemo(() => lateSubmissionData.reduce((sum, w) => sum + w.lateCount, 0), [lateSubmissionData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/90 backdrop-blur opacity-90 p-2 border border-border rounded shadow text-xs">
          <p className="font-bold mb-1">{label}</p>
          <p>Late: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-gradient-to-br from-card/50 to-muted/20 border-border/50 backdrop-blur-sm overflow-hidden h-full flex flex-col hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-5 h-5 text-primary" />
            Late Submissions
          </CardTitle>
          <Badge variant={totalLate === 0 ? "default" : "destructive"} className={totalLate === 0 ? "bg-emerald-500" : ""}>
            {totalLate === 0 ? "Perfect" : `${totalLate} Late`}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-[150px] relative">
        {totalLate === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground pb-4">
            <ThumbsUp className="w-10 h-10 text-emerald-500 mb-2 opacity-50" />
            <p className="text-sm font-medium">No late submissions!</p>
            <p className="text-xs opacity-70">Keep up the streak.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={lateSubmissionData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="week"
                className="text-xs"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                dy={5}
              />
              <YAxis
                allowDecimals={false}
                className="text-xs"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="lateCount" radius={[6, 6, 6, 6]} barSize={24}>
                {lateSubmissionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.lateCount > 0 ? '#EF4444' : '#10B981'} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
