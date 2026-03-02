import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { addDays, format, startOfDay, endOfDay } from "date-fns";
import { Flame, TrendingUp, Target, Zap, Calendar, Medal, Sword, Crown } from "lucide-react";

import { StudySession } from '@/hooks/useStudySessions';

interface StudyStreakProgressProps {
  studySessions: StudySession[];
  loading?: boolean;
}

export function StudyStreakProgress({ studySessions, loading = false }: StudyStreakProgressProps) {
  interface StreakDataType {
    progression: Array<{
      date: string;
      fullDate: string;
      streak: number;
      hasStudy: boolean;
      dayOfWeek: string;
    }>;
    currentStreak: number;
    maxStreak: number;
    totalStudyDays: number;
    nextMilestone: number;
    rank: string;
  }

  // Calculate streak progression over time
  const streakData = useMemo<StreakDataType>(() => {
    if (!studySessions || studySessions.length === 0) {
      const mockProgression = Array.from({ length: 7 }, (_, i) => {
        const d = addDays(new Date(), i - 6);
        return {
          date: format(d, 'MMM d'),
          fullDate: format(d, 'yyyy-MM-dd'),
          streak: i < 4 ? 0 : i - 3,
          hasStudy: i >= 4,
          dayOfWeek: format(d, 'EEE')
        };
      });

      return {
        progression: mockProgression,
        currentStreak: 3,
        maxStreak: 3,
        totalStudyDays: 3,
        nextMilestone: 7,
        rank: "Soldier"
      };
    }

    const completedSessions = studySessions
      .filter(session => session.actual_end && session.status === 'completed')
      .sort((a, b) => new Date(a.actual_end).getTime() - new Date(b.actual_end).getTime());

    if (completedSessions.length === 0) {
      return {
        progression: [],
        currentStreak: 0,
        maxStreak: 0,
        totalStudyDays: 0,
        nextMilestone: 3,
        rank: "Novice"
      };
    };

    const studyDays = new Set<string>();
    completedSessions.forEach(session => {
      const studyDate = format(new Date(session.actual_end), 'yyyy-MM-dd');
      studyDays.add(studyDate);
    });

    const firstStudyDate = new Date(completedSessions[0].actual_end);
    const today = new Date();
    const dateRange = [];
    let currentDate = new Date(firstStudyDate);

    while (currentDate <= today) {
      dateRange.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
    }

    let currentStreak = 0;
    let maxStreak = 0;
    const streakProgression = [];

    for (let i = 0; i < dateRange.length; i++) {
      const date = dateRange[i];
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const hasStudySession = studySessions.some(session => {
        if (!session.actual_end) return false;
        const sessionDate = new Date(session.actual_end);
        return sessionDate >= dayStart && sessionDate <= dayEnd;
      });

      if (hasStudySession) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }

      if (hasStudySession || (i > 0 && i < dateRange.length - 1)) {
        streakProgression.push({
          date: format(date, 'MMM d'),
          fullDate: dateStr,
          streak: currentStreak,
          hasStudy: hasStudySession,
          dayOfWeek: format(date, 'EEE'),
        });
      }
    }

    // Rank Logic
    let rank = "Novice";
    let nextMilestone = 3;

    if (currentStreak >= 30) { rank = "Godlike"; nextMilestone = 60; }
    else if (currentStreak >= 14) { rank = "Titan"; nextMilestone = 30; }
    else if (currentStreak >= 7) { rank = "Warrior"; nextMilestone = 14; }
    else if (currentStreak >= 3) { rank = "Soldier"; nextMilestone = 7; }

    return {
      progression: streakProgression,
      currentStreak,
      maxStreak,
      totalStudyDays: studyDays.size,
      nextMilestone,
      rank
    };
  }, [studySessions]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-orange-950/90 backdrop-blur-md p-3 border border-orange-500/30 rounded-lg shadow-lg text-orange-50">
          <p className="font-medium mb-1 border-b border-orange-500/20 pb-1">{data.fullDate}</p>
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="font-bold text-lg">{data.streak}</span>
            <span className="text-xs opacity-80">day combo</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const getRankIcon = (rank: string) => {
    switch (rank) {
      case 'Godlike': return <Zap className="w-5 h-5 text-purple-400" />;
      case 'Titan': return <Crown className="w-5 h-5 text-red-500" />;
      case 'Warrior': return <Sword className="w-5 h-5 text-orange-500" />;
      default: return <Medal className="w-5 h-5 text-amber-500" />;
    }
  };

  const daysToNext = streakData.nextMilestone - streakData.currentStreak;
  const progressPercent = (streakData.currentStreak / streakData.nextMilestone) * 100;

  return (
    <Card className="bg-gradient-to-br from-orange-500/5 to-red-500/5 border-orange-500/20 backdrop-blur-sm overflow-hidden h-full flex flex-col relative group hover:shadow-lg hover:border-orange-500/40 transition-all">
      {/* Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-orange-500/5 rounded-full blur-[80px] pointer-events-none group-hover:bg-orange-500/15 transition-all duration-700" />

      <CardHeader className="pb-2 z-10 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500 fill-orange-500 animate-pulse" />
          Momentum Engine
        </CardTitle>
        <div className="flex items-center gap-1 bg-background/50 backdrop-blur px-2.5 py-1 rounded-full border border-orange-500/20">
          {getRankIcon(streakData.rank)}
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{streakData.rank}</span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col z-10 justify-between">

        {/* Main Combo Display */}
        <div className="text-center py-4 relative">
          <div className="inline-block relative">
            <span className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-400 to-red-600 drop-shadow-sm font-mono tracking-tighter">
              x{streakData.currentStreak}
            </span>
            {streakData.currentStreak > 0 &&
              <div className="absolute -top-2 -right-4 rotate-12 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                COMBO
              </div>
            }
          </div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1 font-semibold opacity-70">Daily Streak Multiplier</p>
        </div>

        {/* Level Up Progress */}
        <div className="space-y-2 mb-4 bg-background/40 p-3 rounded-lg border border-orange-500/10">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-muted-foreground">Next Rank: <span className="text-orange-500">{streakData.nextMilestone} Days</span></span>
            <span className="text-orange-600">{daysToNext} days left</span>
          </div>
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="text-[10px] text-center text-muted-foreground italic">
            "Consistency beats intensity."
          </p>
        </div>

        {/* Sparkline */}
        {streakData.progression.length > 0 && (
          <div className="h-12 w-full opacity-40 hover:opacity-100 transition-opacity mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={streakData.progression}>
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#F97316', strokeWidth: 1, strokeDasharray: '2 2' }} />
                <Line
                  type="monotone"
                  dataKey="streak"
                  stroke="#F97316"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#F97316', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
