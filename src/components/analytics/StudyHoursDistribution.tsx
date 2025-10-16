import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { addDays, format, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { Clock } from "lucide-react";

interface StudyHoursDistributionProps {
  studySessions: any[];
  courses: any[];
}

interface DateRange {
  start: Date;
  end: Date;
  preset: string;
}

const presets = [
  {
    label: "Past Week",
    range: () => {
      const now = new Date();
      return { start: subWeeks(now, 1), end: now };
    },
  },
  {
    label: "Past Month",
    range: () => {
      const now = new Date();
      return { start: subWeeks(now, 4), end: now };
    },
  },
  {
    label: "Past 3 Months",
    range: () => {
      const now = new Date();
      return { start: subWeeks(now, 12), end: now };
    },
  },
];

const pieColors = [
  "#5C7AEA", "#FF9234", "#FFC93C", "#3DECB1", "#E85D75", "#FFACC7", "#A8E6CF", "#FFD93D"
];

export function StudyHoursDistribution({ studySessions, courses }: StudyHoursDistributionProps) {
  const [range, setRange] = useState<DateRange>(() => {
    const now = new Date();
    return {
      start: subWeeks(now, 1),
      end: now,
      preset: "Past Week",
    };
  });

  // Calculate study hours by course within the selected date range
  const data = useMemo(() => {
    if (!studySessions || !courses) return [];
    
    const byCourse: { [key: string]: number } = {};
    
    studySessions.forEach((session) => {
      const actualEnd = session.actual_end ? new Date(session.actual_end) : null;
      const actualStart = session.actual_start ? new Date(session.actual_start) : new Date(session.scheduled_start);
      
      if (
        actualEnd &&
        actualEnd >= range.start &&
        actualEnd <= range.end &&
        session.course_id
      ) {
        if (!byCourse[session.course_id]) byCourse[session.course_id] = 0;
        
        // Calculate duration in minutes
        const durationMinutes = (actualEnd.getTime() - actualStart.getTime()) / (1000 * 60);
        byCourse[session.course_id] += durationMinutes;
      }
    });

    // Convert to hours and format for chart
    return Object.entries(byCourse)
      .map(([courseId, minutes]) => ({
        name: courses.find((c) => c.id === courseId)?.name || "Unknown Course",
        value: Math.round((minutes / 60) * 100) / 100, // Convert to hours, rounded to 2 decimals
        courseId,
      }))
      .filter(item => item.value > 0) // Only show courses with study time
      .sort((a, b) => b.value - a.value); // Sort by hours descending
  }, [studySessions, courses, range]);

  const totalHours = data.reduce((sum, item) => sum + item.value, 0);

  const handlePresetChange = (preset: typeof presets[0]) => {
    const newRange = preset.range();
    setRange({
      start: newRange.start,
      end: newRange.end,
      preset: preset.label,
    });
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card p-3 border border-border rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-primary">
            {data.value} hours
          </p>
          <p className="text-sm text-muted-foreground">
            {totalHours > 0 ? Math.round((data.value / totalHours) * 100) : 0}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-gradient-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Study Hours Distribution
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Total: {totalHours.toFixed(1)} hours
          </div>
        </div>
        
        {/* Date Range Presets */}
        <div className="flex gap-2 items-center flex-wrap">
          {presets.map((preset) => (
            <Button
              key={preset.label}
              variant={range.preset === preset.label ? "default" : "outline"}
              size="sm"
              onClick={() => handlePresetChange(preset)}
              className="text-xs"
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No Study Data</p>
            <p className="text-sm">
              No study sessions recorded for the selected period.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={40}
                  label={({ name, value }) => `${name}: ${value}h`}
                  labelLine={false}
                >
                  {data.map((_, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={pieColors[index % pieColors.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value, entry) => (
                    <span style={{ color: entry.color }}>
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {data.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Active Courses
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {data.length > 0 ? (totalHours / data.length).toFixed(1) : 0}
                </div>
                <div className="text-sm text-muted-foreground">
                  Avg Hours/Course
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

