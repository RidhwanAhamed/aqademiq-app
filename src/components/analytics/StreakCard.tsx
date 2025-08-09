import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Target, Trophy } from "lucide-react";
import { UserStats } from "@/hooks/useUserStats";

interface StreakCardProps {
  stats: UserStats | null;
}

export function StreakCard({ stats }: StreakCardProps) {
  const streakDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    
    const isToday = i === 6;
    const isActive = stats?.current_streak && stats.current_streak >= (7 - i);
    
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      date: date.getDate(),
      isToday,
      isActive: isActive || false
    };
  });

  return (
    <Card className="bg-gradient-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-warning" />
          Study Streak
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Streak */}
        <div className="text-center">
          <div className="text-3xl font-bold text-warning">
            {stats?.current_streak || 0}
          </div>
          <p className="text-sm text-muted-foreground">day streak</p>
        </div>

        {/* Weekly Progress */}
        <div className="flex justify-between items-end gap-1">
          {streakDays.map((day, index) => (
            <div key={index} className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-12 rounded-lg flex items-end justify-center transition-colors ${
                  day.isActive
                    ? 'bg-warning text-warning-foreground'
                    : 'bg-muted'
                }`}
              >
                <div className={`w-6 h-${day.isActive ? '10' : '4'} rounded-sm transition-all ${
                  day.isActive ? 'bg-warning-foreground' : 'bg-muted-foreground/20'
                }`} />
              </div>
              <span className={`text-xs ${day.isToday ? 'font-medium' : 'text-muted-foreground'}`}>
                {day.day}
              </span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-accent">
              <Trophy className="w-4 h-4" />
              <span className="font-bold">{stats?.longest_streak || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground">Best Streak</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-success">
              <Target className="w-4 h-4" />
              <span className="font-bold">{stats?.weekly_study_goal || 0}h</span>
            </div>
            <p className="text-xs text-muted-foreground">Weekly Goal</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}