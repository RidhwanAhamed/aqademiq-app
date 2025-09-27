import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Brain, Zap, Target } from "lucide-react";
import { format, startOfWeek, addDays, subWeeks, isToday } from "date-fns";

interface StudyPatternHeatmapProps {
  studyAnalytics: any[];
  onNeedAIInsights?: (context: string, data: any) => void;
}

export function StudyPatternHeatmap({ studyAnalytics, onNeedAIInsights }: StudyPatternHeatmapProps) {
  // Generate heatmap data for the last 8 weeks
  const weeks = 8;
  const startDate = subWeeks(startOfWeek(new Date()), weeks - 1);
  
  const heatmapData = Array.from({ length: weeks }, (_, weekIndex) => {
    const weekStart = addDays(startDate, weekIndex * 7);
    
    return Array.from({ length: 7 }, (_, dayIndex) => {
      const date = addDays(weekStart, dayIndex);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Find study data for this date
      const dayStudy = studyAnalytics.filter(session => 
        format(new Date(session.session_date), 'yyyy-MM-dd') === dateStr
      );
      
      const totalMinutes = dayStudy.reduce((sum, session) => 
        sum + (session.effective_study_minutes || 0), 0
      );
      
      const avgProductivity = dayStudy.length > 0 
        ? dayStudy.reduce((sum, session) => sum + (session.productivity_score || 0), 0) / dayStudy.length
        : 0;
      
      // Calculate intensity level (0-4)
      const intensity = totalMinutes === 0 ? 0 :
                       totalMinutes < 30 ? 1 :
                       totalMinutes < 60 ? 2 :
                       totalMinutes < 120 ? 3 : 4;
      
      return {
        date: dateStr,
        displayDate: format(date, 'd'),
        dayName: format(date, 'EEE'),
        totalMinutes,
        avgProductivity,
        intensity,
        isToday: isToday(date),
        sessions: dayStudy.length
      };
    });
  });

  // Calculate pattern insights
  const totalStudyDays = heatmapData.flat().filter(day => day.totalMinutes > 0).length;
  const averageDailyMinutes = heatmapData.flat().reduce((sum, day) => sum + day.totalMinutes, 0) / (weeks * 7);
  const bestDay = heatmapData.flat().reduce((best, day) => 
    day.totalMinutes > best.totalMinutes ? day : best, { totalMinutes: 0 }
  );
  
  // Find patterns
  const weekdayTotals = Array.from({ length: 7 }, (_, i) => {
    const dayTotal = heatmapData.reduce((sum, week) => sum + week[i].totalMinutes, 0);
    return { day: i, total: dayTotal, name: format(addDays(startOfWeek(new Date()), i), 'EEEE') };
  });
  const bestWeekday = weekdayTotals.reduce((best, day) => day.total > best.total ? day : best);
  
  const getIntensityColor = (intensity: number) => {
    switch (intensity) {
      case 0: return 'bg-muted border-border';
      case 1: return 'bg-success/20 border-success/40';
      case 2: return 'bg-success/40 border-success/60';
      case 3: return 'bg-success/60 border-success/80';
      case 4: return 'bg-success border-success';
      default: return 'bg-muted border-border';
    }
  };

  const getIntensityText = (intensity: number) => {
    switch (intensity) {
      case 0: return 'No study';
      case 1: return 'Light study';
      case 2: return 'Moderate study';
      case 3: return 'Intensive study';
      case 4: return 'Peak study';
      default: return 'No data';
    }
  };

  return (
    <Card className="bg-gradient-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Study Pattern Analysis
            </CardTitle>
            <Badge variant="outline">{totalStudyDays} Active Days</Badge>
          </div>
          <Button 
            variant="outline"
            size="sm"
            onClick={() => onNeedAIInsights?.('study_patterns', {
              studyAnalytics,
              heatmapData: heatmapData.flat(),
              totalStudyDays,
              averageDailyMinutes,
              bestDay,
              bestWeekday,
              weekdayTotals
            })}
            className="bg-gradient-card hover:bg-gradient-card/80"
          >
            <Brain className="w-4 h-4 mr-2" />
            Pattern Insights
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Heatmap Grid */}
        <div className="space-y-4">
          {/* Weekday Labels */}
          <div className="grid grid-cols-8 gap-1">
            <div></div> {/* Empty cell for alignment */}
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <div key={index} className="text-xs text-center text-muted-foreground font-medium py-1">
                {day}
              </div>
            ))}
          </div>
          
          {/* Heatmap Rows */}
          {heatmapData.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-8 gap-1 items-center">
              {/* Week label */}
              <div className="text-xs text-muted-foreground text-right pr-2">
                {format(addDays(startDate, weekIndex * 7), 'MMM d')}
              </div>
              
              {/* Days in week */}
              {week.map((day, dayIndex) => (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className={`
                    aspect-square rounded-sm border transition-all duration-200 hover:scale-110 cursor-pointer
                    ${getIntensityColor(day.intensity)}
                    ${day.isToday ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}
                  `}
                  title={`${day.dayName} ${format(new Date(day.date), 'MMM d')}: ${day.totalMinutes}min (${day.sessions} sessions) - ${getIntensityText(day.intensity)}`}
                >
                  <div className="w-full h-full flex items-center justify-center">
                    {day.isToday && (
                      <div className="w-1 h-1 bg-primary rounded-full"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map(intensity => (
              <div
                key={intensity}
                className={`w-3 h-3 rounded-sm border ${getIntensityColor(intensity)}`}
              />
            ))}
            <span>More</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-primary rounded-full ring-2 ring-primary ring-offset-1 ring-offset-background"></div>
              <span>Today</span>
            </div>
          </div>
        </div>

        {/* Pattern Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-card border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">Study Consistency</span>
              </div>
              <p className="text-2xl font-bold">{totalStudyDays}</p>
              <p className="text-xs text-muted-foreground">
                days out of {weeks * 7} ({Math.round((totalStudyDays / (weeks * 7)) * 100)}%)
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-l-4 border-l-success">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-success" />
                <span className="font-medium text-sm">Daily Average</span>
              </div>
              <p className="text-2xl font-bold">{Math.round(averageDailyMinutes)}</p>
              <p className="text-xs text-muted-foreground">
                minutes per day
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-l-4 border-l-warning">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-warning" />
                <span className="font-medium text-sm">Best Day</span>
              </div>
              <p className="text-2xl font-bold">{bestWeekday.name.slice(0, 3)}</p>
              <p className="text-xs text-muted-foreground">
                {Math.round(bestWeekday.total / weeks)} min average
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recommendations */}
        {totalStudyDays > 0 && (
          <div className="p-4 bg-primary-muted rounded-lg border border-primary/20">
            <h4 className="font-medium text-sm mb-2 text-primary">Pattern Insights</h4>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {averageDailyMinutes < 30 && (
                <li>• Consider increasing daily study time to build stronger habits</li>
              )}
              {totalStudyDays < (weeks * 7 * 0.5) && (
                <li>• Aim for more consistent daily study sessions</li>
              )}
              {bestWeekday.total > 0 && (
                <li>• You study most effectively on {bestWeekday.name}s - consider scheduling important topics then</li>
              )}
              {bestDay.totalMinutes > averageDailyMinutes * 2 && (
                <li>• Your peak performance was {Math.round(bestDay.totalMinutes)} minutes - try to replicate those conditions</li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}