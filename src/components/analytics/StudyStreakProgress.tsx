import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { addDays, format, startOfDay, endOfDay } from "date-fns";
import { Flame, TrendingUp, Target } from "lucide-react";

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
  }

  // Calculate streak progression over time
  const streakData = useMemo<StreakDataType>(() => {
    if (!studySessions || studySessions.length === 0) {
      return {
        progression: [],
        currentStreak: 0,
        maxStreak: 0,
        totalStudyDays: 0
      };
    }

    // Get all completed study sessions, sorted by date
    const completedSessions = studySessions
      .filter(session => session.actual_end && session.status === 'completed')
      .sort((a, b) => new Date(a.actual_end).getTime() - new Date(b.actual_end).getTime());

    if (completedSessions.length === 0) {
      return {
        progression: [],
        currentStreak: 0,
        maxStreak: 0,
        totalStudyDays: 0
      };
    };

    // Create a map of study days
    const studyDays = new Set<string>();
    completedSessions.forEach(session => {
      const studyDate = format(new Date(session.actual_end), 'yyyy-MM-dd');
      studyDays.add(studyDate);
    });

    // Generate date range from first study session to now
    const firstStudyDate = new Date(completedSessions[0].actual_end);
    const today = new Date();
    const dateRange = [];
    let currentDate = new Date(firstStudyDate);
    
    while (currentDate <= today) {
      dateRange.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
    }

    // Calculate streak for each day
    let currentStreak = 0;
    let maxStreak = 0;
    const streakProgression = [];

    for (let i = 0; i < dateRange.length; i++) {
      const date = dateRange[i];
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      // Check if there was a study session on this day
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

      // Only include data points where there was activity or significant streak changes
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

    return {
      progression: streakProgression,
      currentStreak,
      maxStreak,
      totalStudyDays: studyDays.size,
    };
  }, [studySessions]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card p-3 border border-border rounded-lg shadow-lg">
          <p className="font-medium mb-2">{data.fullDate}</p>
          <div className="space-y-1">
            <p className="text-primary">
              <span className="font-medium">{data.streak}</span> day streak
            </p>
            <p className="text-sm text-muted-foreground">
              {data.hasStudy ? 'Studied this day' : 'No study session'}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const getStreakStatus = (currentStreak: number) => {
    if (currentStreak === 0) return { status: 'broken', color: 'text-muted-foreground', icon: Target };
    if (currentStreak < 3) return { status: 'starting', color: 'text-warning', icon: TrendingUp };
    if (currentStreak < 7) return { status: 'building', color: 'text-primary', icon: TrendingUp };
    if (currentStreak < 14) return { status: 'strong', color: 'text-success', icon: Flame };
    return { status: 'on-fire', color: 'text-destructive', icon: Flame };
  };

  const streakStatus = getStreakStatus(streakData.currentStreak);
  const StatusIcon = streakStatus.icon;

  return (
    <Card className="bg-gradient-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-primary" />
            Study Streak Progress
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              variant={streakData.currentStreak > 0 ? "default" : "secondary"}
              className={`${streakStatus.color} bg-opacity-20`}
            >
              <StatusIcon className="w-3 h-3 mr-1" />
              {streakData.currentStreak} days
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="animate-pulse space-y-4">
              <div className="h-[200px] bg-muted rounded-lg"></div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-8 bg-muted rounded mx-auto w-12"></div>
                    <div className="h-4 bg-muted rounded w-20 mx-auto"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : streakData.progression.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No Study Streak</p>
            <p className="text-sm">
              Start studying to build your streak!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={streakData.progression} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  className="text-sm"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  allowDecimals={false}
                  className="text-sm"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Streak Days', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="streak"
                  stroke="#FFD233"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#FFD233' }}
                  activeDot={{ r: 6, fill: '#FFD233' }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Streak Statistics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {streakData.currentStreak}
                </div>
                <div className="text-sm text-muted-foreground">
                  Current Streak
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {streakData.maxStreak}
                </div>
                <div className="text-sm text-muted-foreground">
                  Best Streak
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {streakData.totalStudyDays}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Study Days
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {streakData.currentStreak > 0 ? '🔥' : '❄️'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Status
                </div>
              </div>
            </div>

            {/* Streak Motivation */}
            <div className="p-3 bg-muted/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <StatusIcon className={`w-4 h-4 ${streakStatus.color}`} />
                <span className="text-sm font-medium">Streak Status</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {streakData.currentStreak === 0 && "Your streak is broken. Start studying today to begin a new streak!"}
                {streakData.currentStreak > 0 && streakData.currentStreak < 3 && "Great start! Keep going to build momentum."}
                {streakData.currentStreak >= 3 && streakData.currentStreak < 7 && "You're building a solid habit! Keep it up!"}
                {streakData.currentStreak >= 7 && streakData.currentStreak < 14 && "Excellent consistency! You're on fire!"}
                {streakData.currentStreak >= 14 && "Incredible dedication! You're a study champion!"}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

