import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { TimeRange } from "./MobileTimeRangeSelector";
import { subWeeks } from "date-fns";
import { Clock } from "lucide-react";

interface MobileStudyDistributionProps {
  studySessions: any[];
  courses: any[];
  timeRange: TimeRange;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--success))", "hsl(var(--warning))"];

export function MobileStudyDistribution({ studySessions, courses, timeRange }: MobileStudyDistributionProps) {
  const { data, totalHours } = useMemo(() => {
    const now = new Date();
    let start: Date;
    
    switch (timeRange) {
      case "week": start = subWeeks(now, 1); break;
      case "month": start = subWeeks(now, 4); break;
      case "3months": start = subWeeks(now, 12); break;
    }

    const byCourse: { [key: string]: number } = {};
    
    studySessions?.forEach((session) => {
      if (!session.actual_end || !session.actual_start || !session.course_id) return;
      
      const sessionEnd = new Date(session.actual_end);
      if (sessionEnd < start || sessionEnd > now) return;
      
      const sessionStart = new Date(session.actual_start);
      const durationMinutes = (sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60);
      
      byCourse[session.course_id] = (byCourse[session.course_id] || 0) + durationMinutes;
    });

    const chartData = Object.entries(byCourse)
      .map(([courseId, minutes]) => ({
        name: courses?.find((c) => c.id === courseId)?.name || "Unknown",
        value: Math.round((minutes / 60) * 10) / 10,
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 4); // Max 4 courses for clean mobile display

    const total = chartData.reduce((sum, item) => sum + item.value, 0);

    return { data: chartData, totalHours: total };
  }, [studySessions, courses, timeRange]);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Clock className="w-8 h-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">No study data for this period</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Start a study session to see analytics</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {/* Mini Donut Chart */}
      <div className="relative w-28 h-28 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={28}
              outerRadius={48}
              strokeWidth={0}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-foreground">{totalHours}</span>
          <span className="text-[10px] text-muted-foreground">hours</span>
        </div>
      </div>

      {/* Course Legend */}
      <div className="flex-1 space-y-2">
        {data.map((course, index) => (
          <div key={course.name} className="flex items-center gap-2">
            <div 
              className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-xs text-foreground truncate flex-1">{course.name}</span>
            <span className="text-xs text-muted-foreground">{course.value}h</span>
          </div>
        ))}
      </div>
    </div>
  );
}
