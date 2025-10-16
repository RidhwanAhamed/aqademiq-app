import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { addDays, format, subWeeks, startOfDay, endOfDay } from "date-fns";
import { Clock, TrendingUp } from "lucide-react";

interface DailyStudyTimeChartProps {
  studySessions: any[];
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

export function DailyStudyTimeChart({ studySessions }: DailyStudyTimeChartProps) {
  const [range, setRange] = useState<DateRange>(() => {
    const now = new Date();
    return {
      start: subWeeks(now, 1),
      end: now,
      preset: "Past Week",
    };
  });

  // Generate array of dates in the selected range
  const dates = useMemo(() => {
    const dateArray = [];
    let currentDate = new Date(range.start);
    
    while (currentDate <= range.end) {
      dateArray.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
    }
    
    return dateArray;
  }, [range]);

  // Calculate study hours for each day
  const dailyData = useMemo(() => {
    return dates.map((date) => {
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      const dayStr = format(date, "MMM d");
      
      // Find study sessions that occurred on this day
      const sessionsOnDay = studySessions.filter((session) => {
        const actualEnd = session.actual_end ? new Date(session.actual_end) : null;
        const actualStart = session.actual_start ? new Date(session.actual_start) : new Date(session.scheduled_start);
        
        if (!actualEnd) return false;
        
        // Check if session overlaps with this day
        return actualEnd >= dayStart && actualStart <= dayEnd;
      });

      // Calculate total study time for this day
      const totalMinutes = sessionsOnDay.reduce((sum, session) => {
        const actualEnd = new Date(session.actual_end);
        const actualStart = session.actual_start ? new Date(session.actual_start) : new Date(session.scheduled_start);
        
        // Clamp session times to the day boundaries
        const sessionStart = actualStart < dayStart ? dayStart : actualStart;
        const sessionEnd = actualEnd > dayEnd ? dayEnd : actualEnd;
        
        if (sessionEnd <= sessionStart) return sum;
        
        const durationMinutes = (sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60);
        return sum + durationMinutes;
      }, 0);

      const hours = Math.round((totalMinutes / 60) * 100) / 100;
      
      return {
        date: dayStr,
        hours,
        minutes: Math.round(totalMinutes),
        sessions: sessionsOnDay.length,
        dayOfWeek: format(date, "EEE"),
        fullDate: format(date, "yyyy-MM-dd"),
      };
    });
  }, [dates, studySessions]);

  const handlePresetChange = (preset: typeof presets[0]) => {
    const newRange = preset.range();
    setRange({
      start: newRange.start,
      end: newRange.end,
      preset: preset.label,
    });
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalHours = dailyData.reduce((sum, day) => sum + day.hours, 0);
    const daysWithStudy = dailyData.filter(day => day.hours > 0).length;
    const averageHours = dailyData.length > 0 ? totalHours / dailyData.length : 0;
    const maxHours = Math.max(...dailyData.map(day => day.hours));
    const maxDay = dailyData.find(day => day.hours === maxHours);

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      daysWithStudy,
      averageHours: Math.round(averageHours * 100) / 100,
      maxHours: Math.round(maxHours * 100) / 100,
      maxDay: maxDay?.date || "N/A",
      totalDays: dailyData.length,
    };
  }, [dailyData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card p-3 border border-border rounded-lg shadow-lg">
          <p className="font-medium mb-2">{data.fullDate}</p>
          <div className="space-y-1">
            <p className="text-primary">
              <span className="font-medium">{data.hours}</span> hours
            </p>
            <p className="text-sm text-muted-foreground">
              {data.sessions} session{data.sessions !== 1 ? 's' : ''}
            </p>
            <p className="text-sm text-muted-foreground">
              {data.minutes} minutes total
            </p>
          </div>
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
            Daily Study Time
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            {format(range.start, "MMM d")} - {format(range.end, "MMM d")}
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
        {dailyData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No Study Data</p>
            <p className="text-sm">
              No study sessions recorded for the selected period.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  className="text-sm"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  domain={[0, 'dataMax + 1']}
                  className="text-sm"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="#5183F5"
                  fill="#5183F5"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Summary Statistics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {stats.totalHours}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Hours
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {stats.daysWithStudy}
                </div>
                <div className="text-sm text-muted-foreground">
                  Study Days
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {stats.averageHours}
                </div>
                <div className="text-sm text-muted-foreground">
                  Avg Hours/Day
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {stats.maxHours}
                </div>
                <div className="text-sm text-muted-foreground">
                  Peak Day ({stats.maxDay})
                </div>
              </div>
            </div>

            {/* Consistency Indicator */}
            <div className="p-3 bg-muted/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Study Consistency</span>
              </div>
              <div className="text-sm text-muted-foreground">
                You studied on {stats.daysWithStudy} out of {stats.totalDays} days 
                ({Math.round((stats.daysWithStudy / stats.totalDays) * 100)}% consistency)
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

