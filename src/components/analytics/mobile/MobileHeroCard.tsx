import { useMemo } from "react";
import { Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { TimeRange } from "./MobileTimeRangeSelector";
import { subWeeks } from "date-fns";

interface MobileHeroCardProps {
  studySessions: any[];
  timeRange: TimeRange;
}

export function MobileHeroCard({ studySessions, timeRange }: MobileHeroCardProps) {
  const { totalHours, trend, trendLabel } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let previousStart: Date;
    
    switch (timeRange) {
      case "week":
        start = subWeeks(now, 1);
        previousStart = subWeeks(now, 2);
        break;
      case "month":
        start = subWeeks(now, 4);
        previousStart = subWeeks(now, 8);
        break;
      case "3months":
        start = subWeeks(now, 12);
        previousStart = subWeeks(now, 24);
        break;
    }

    // Calculate current period hours
    let currentMinutes = 0;
    let previousMinutes = 0;

    studySessions?.forEach((session) => {
      if (!session.actual_end || !session.actual_start) return;
      
      const sessionEnd = new Date(session.actual_end);
      const sessionStart = new Date(session.actual_start);
      const duration = (sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60);

      if (sessionEnd >= start && sessionEnd <= now) {
        currentMinutes += duration;
      } else if (sessionEnd >= previousStart && sessionEnd < start) {
        previousMinutes += duration;
      }
    });

    const currentHours = Math.round(currentMinutes / 60 * 10) / 10;
    const previousHours = Math.round(previousMinutes / 60 * 10) / 10;

    let trend: "up" | "down" | "stable" = "stable";
    let trendLabel = "No change";

    if (previousHours > 0) {
      const change = ((currentHours - previousHours) / previousHours) * 100;
      if (change > 5) {
        trend = "up";
        trendLabel = `+${Math.round(change)}% vs previous`;
      } else if (change < -5) {
        trend = "down";
        trendLabel = `${Math.round(change)}% vs previous`;
      }
    } else if (currentHours > 0) {
      trend = "up";
      trendLabel = "Great start!";
    }

    return { totalHours: currentHours, trend, trendLabel };
  }, [studySessions, timeRange]);

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <div className="mx-4 mb-4 p-5 rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium opacity-80 mb-1">Total Study Time</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight">{totalHours}</span>
            <span className="text-lg font-medium opacity-80">hours</span>
          </div>
        </div>
        <div className="p-2.5 bg-white/20 rounded-xl">
          <Clock className="w-6 h-6" />
        </div>
      </div>
      
      <div className="flex items-center gap-1.5 mt-3 text-xs opacity-90">
        <TrendIcon className="w-3.5 h-3.5" />
        <span>{trendLabel}</span>
      </div>
    </div>
  );
}
