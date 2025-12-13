import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";
import { TimeRange } from "./MobileTimeRangeSelector";
import { subWeeks } from "date-fns";
import { Clock } from "lucide-react";

interface MobileStudyDistributionProps {
  studySessions: any[];
  courses: any[];
  timeRange: TimeRange;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export function MobileStudyDistribution({ studySessions, courses, timeRange }: MobileStudyDistributionProps) {
  const { pieData, barData, totalHours } = useMemo(() => {
    const now = new Date();
    let start: Date;
    
    switch (timeRange) {
      case "week": start = subWeeks(now, 1); break;
      case "month": start = subWeeks(now, 4); break;
      case "3months": start = subWeeks(now, 12); break;
    }

    const byCourse: { [key: string]: number } = {};
    
    studySessions?.forEach((session) => {
      if (!session.actual_end || !session.actual_start) return;
      
      const sessionEnd = new Date(session.actual_end);
      if (sessionEnd < start || sessionEnd > now) return;
      
      const sessionStart = new Date(session.actual_start);
      const durationMinutes = (sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60);
      const courseId = session.course_id || 'general';
      
      byCourse[courseId] = (byCourse[courseId] || 0) + durationMinutes;
    });

    const pieData = Object.entries(byCourse)
      .map(([courseId, minutes]) => {
        const course = courses?.find((c) => c.id === courseId);
        return {
          name: course?.name || "General",
          fullName: course?.name || "General",
          value: Math.round((minutes / 60) * 10) / 10,
          color: course?.color || COLORS[0]
        };
      })
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const barData = pieData.map((item, index) => ({
      name: item.name.length > 8 ? item.name.substring(0, 8) + '...' : item.name,
      fullName: item.fullName,
      hours: item.value,
      fill: item.color || COLORS[index % COLORS.length]
    }));

    const total = pieData.reduce((sum, item) => sum + item.value, 0);

    return { pieData, barData, totalHours: total };
  }, [studySessions, courses, timeRange]);

  if (pieData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Clock className="w-8 h-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">No study data for this period</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Start a study session to see analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {/* Donut Chart */}
        <div className="relative w-[110px] h-[110px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={32}
                outerRadius={50}
                strokeWidth={0}
                paddingAngle={2}
              >
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.color || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-foreground">{totalHours.toFixed(1)}</span>
            <span className="text-[10px] text-muted-foreground">hours</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-1.5">
          {pieData.slice(0, 4).map((course, index) => (
            <div key={course.name} className="flex items-center gap-2">
              <div 
                className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                style={{ backgroundColor: course.color || COLORS[index % COLORS.length] }}
              />
              <span className="text-xs text-foreground truncate flex-1">{course.name}</span>
              <span className="text-xs font-medium text-muted-foreground">{course.value}h</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bar Chart */}
      {barData.length > 1 && (
        <div className="h-[80px] mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number, name: string, props: any) => [`${value}h`, props.payload.fullName]}
                labelFormatter={() => ''}
              />
              <Bar 
                dataKey="hours" 
                radius={[0, 4, 4, 0]}
                fill="hsl(var(--primary))"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
