import { useMemo } from "react";
import { Flame, Target } from "lucide-react";
import { format, startOfDay, endOfDay, subDays } from "date-fns";

interface MobileStreakCardProps {
  studySessions: any[];
}

export function MobileStreakCard({ studySessions }: MobileStreakCardProps) {
  const { currentStreak, last7Days, maxStreak } = useMemo(() => {
    if (!studySessions || studySessions.length === 0) {
      return { currentStreak: 0, last7Days: Array(7).fill(false), maxStreak: 0 };
    }

    const completedSessions = studySessions.filter(
      (s) => s.actual_end && s.status === "completed"
    );

    // Build set of study days
    const studyDays = new Set<string>();
    completedSessions.forEach((session) => {
      studyDays.add(format(new Date(session.actual_end), "yyyy-MM-dd"));
    });

    // Calculate current streak
    let streak = 0;
    let checkDate = new Date();
    
    while (true) {
      const dateStr = format(checkDate, "yyyy-MM-dd");
      if (studyDays.has(dateStr)) {
        streak++;
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
    }

    // Last 7 days activity
    const today = new Date();
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, "yyyy-MM-dd");
      last7.push(studyDays.has(dateStr));
    }

    // Max streak calculation
    let maxStreak = 0;
    let tempStreak = 0;
    const sortedDates = Array.from(studyDays).sort();
    
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      maxStreak = Math.max(maxStreak, tempStreak);
    }

    return { currentStreak: streak, last7Days: last7, maxStreak };
  }, [studySessions]);

  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="space-y-4">
      {/* Streak Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="text-4xl font-bold text-foreground">{currentStreak}</div>
            {currentStreak > 0 && (
              <Flame className="absolute -top-1 -right-4 w-5 h-5 text-warning animate-pulse" />
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            day{currentStreak !== 1 ? "s" : ""}<br />streak
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-sm font-medium text-foreground">Best: {maxStreak}</div>
          <div className="text-[10px] text-muted-foreground">days</div>
        </div>
      </div>

      {/* 7-Day Grid */}
      <div className="flex justify-between gap-1">
        {last7Days.map((hasStudy, index) => (
          <div key={index} className="flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                hasStudy 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {hasStudy ? (
                <Flame className="w-4 h-4" />
              ) : (
                <Target className="w-3 h-3 opacity-40" />
              )}
            </div>
            <span className="text-[10px] text-muted-foreground">{dayLabels[index]}</span>
          </div>
        ))}
      </div>

      {/* Motivation */}
      <p className="text-xs text-muted-foreground text-center">
        {currentStreak === 0 && "Start today to begin your streak!"}
        {currentStreak > 0 && currentStreak < 7 && "Keep going to build momentum!"}
        {currentStreak >= 7 && "You're on fire! 🔥"}
      </p>
    </div>
  );
}
