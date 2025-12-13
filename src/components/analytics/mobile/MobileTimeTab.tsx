import { useMemo } from "react";
import { Clock, Flame, Calendar, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimeRange } from "./MobileTimeRangeSelector";
import { format, subDays, subMonths, startOfDay, isAfter, isBefore, eachDayOfInterval } from "date-fns";

interface MobileTimeTabProps {
  studySessions: any[];
  timeRange: TimeRange;
}

export function MobileTimeTab({ studySessions, timeRange }: MobileTimeTabProps) {
  const dailyData = useMemo(() => {
    const now = new Date();
    const daysBack = timeRange === "week" ? 7 : timeRange === "month" ? 30 : 90;
    const start = subDays(now, daysBack);

    const days = eachDayOfInterval({ start, end: now });
    const dailyMinutes: Record<string, number> = {};

    days.forEach((day) => {
      dailyMinutes[format(day, "yyyy-MM-dd")] = 0;
    });

    studySessions?.forEach((session) => {
      if (!session.actual_start || !session.actual_end) return;
      const sessionStart = new Date(session.actual_start);
      const dayKey = format(sessionStart, "yyyy-MM-dd");
      if (dailyMinutes[dayKey] !== undefined) {
        const duration = (new Date(session.actual_end).getTime() - sessionStart.getTime()) / (1000 * 60);
        dailyMinutes[dayKey] += duration;
      }
    });

    const chartData = Object.entries(dailyMinutes)
      .map(([date, minutes]) => ({
        date,
        day: format(new Date(date), timeRange === "week" ? "EEE" : "d"),
        hours: Math.round((minutes / 60) * 10) / 10,
      }))
      .slice(-14); // Last 14 entries for chart

    const totalHours = Object.values(dailyMinutes).reduce((sum, m) => sum + m, 0) / 60;
    const avgDaily = totalHours / days.length;

    return { chartData, totalHours: Math.round(totalHours * 10) / 10, avgDaily: Math.round(avgDaily * 10) / 10 };
  }, [studySessions, timeRange]);

  const streakData = useMemo(() => {
    const studyDays = new Set<string>();
    studySessions?.forEach((session) => {
      if (session.status === "completed" || session.actual_end) {
        studyDays.add(format(new Date(session.actual_start || session.scheduled_start), "yyyy-MM-dd"));
      }
    });

    let currentStreak = 0;
    let maxStreak = 0;
    const today = startOfDay(new Date());

    for (let i = 0; i <= 365; i++) {
      const checkDate = format(subDays(today, i), "yyyy-MM-dd");
      if (studyDays.has(checkDate)) {
        currentStreak++;
      } else if (i > 0) {
        break;
      }
    }

    // Calculate max streak
    const sortedDays = Array.from(studyDays).sort();
    let streak = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const prev = new Date(sortedDays[i - 1]);
      const curr = new Date(sortedDays[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        streak++;
        maxStreak = Math.max(maxStreak, streak);
      } else {
        streak = 1;
      }
    }
    maxStreak = Math.max(maxStreak, currentStreak);

    // Last 7 days activity
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(today, 6 - i);
      return {
        day: format(date, "EEE"),
        studied: studyDays.has(format(date, "yyyy-MM-dd")),
      };
    });

    return { currentStreak, maxStreak, last7Days };
  }, [studySessions]);

  return (
    <div className="space-y-4 p-4 pb-24">
      {/* Daily Study Time */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Daily Study Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dailyData.totalHours === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="w-10 h-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No study sessions recorded</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/30 text-center">
                  <p className="text-2xl font-bold">{dailyData.totalHours}</p>
                  <p className="text-xs text-muted-foreground">Total Hours</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 text-center">
                  <p className="text-2xl font-bold">{dailyData.avgDaily}</p>
                  <p className="text-xs text-muted-foreground">Daily Avg</p>
                </div>
              </div>
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData.chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [`${v}h`, "Study Time"]} />
                    <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Study Streak */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            Study Streak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                  <Flame className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{streakData.currentStreak}</p>
                  <p className="text-xs text-muted-foreground">Day Streak</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-muted-foreground">{streakData.maxStreak}</p>
                <p className="text-xs text-muted-foreground">Best Streak</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Last 7 Days</p>
              <div className="flex justify-between gap-1">
                {streakData.last7Days.map((day, i) => (
                  <div key={i} className="flex-1 text-center">
                    <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${day.studied ? "bg-orange-500" : "bg-muted/30"}`}>
                      {day.studied ? <Flame className="w-4 h-4 text-white" /> : <Target className="w-4 h-4 text-muted-foreground/50" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{day.day}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              {streakData.currentStreak > 0
                ? streakData.currentStreak >= 7
                  ? "Amazing consistency! Keep it up!"
                  : "Great progress! Study today to extend your streak."
                : "Start studying to build your streak!"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
