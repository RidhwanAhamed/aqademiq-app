import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Target, Clock, CheckCircle } from "lucide-react";
import { useUserStats } from "@/hooks/useUserStats";
import { useAssignments } from "@/hooks/useAssignments";

export function QuickStats() {
  const { stats } = useUserStats();
  const { assignments } = useAssignments();

  // Calculate weekly stats
  const completedThisWeek = assignments.filter(a => a.is_completed).length;
  const totalThisWeek = assignments.length;
  const completionProgress = totalThisWeek > 0 ? Math.round((completedThisWeek / totalThisWeek) * 100) : 0;
  
  const studyHours = stats?.total_study_hours || 0;
  const weeklyGoal = stats?.weekly_study_goal || 20;
  const goalProgress = Math.min(Math.round((studyHours / weeklyGoal) * 100), 100);

  const quickStats = [
    {
      title: "Tasks Completed",
      value: completedThisWeek.toString(),
      subtitle: `out of ${totalThisWeek} total`,
      progress: completionProgress,
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success-muted"
    },
    {
      title: "Study Hours",
      value: studyHours.toString(),
      subtitle: "total hours logged",
      progress: Math.min(studyHours * 5, 100), // Rough estimate for visual
      icon: Clock,
      color: "text-primary",
      bgColor: "bg-primary-muted"
    },
    {
      title: "Weekly Goal",
      value: `${goalProgress}%`,
      subtitle: "on track",
      progress: goalProgress,
      icon: Target,
      color: "text-accent",
      bgColor: "bg-accent-muted"
    },
    {
      title: "Current Streak",
      value: `${stats?.current_streak || 0}`,
      subtitle: "days in a row",
      progress: Math.min((stats?.current_streak || 0) * 10, 100),
      icon: TrendingUp,
      color: "text-warning",
      bgColor: "bg-warning-muted"
    }
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {quickStats.map((stat, index) => {
        const Icon = stat.icon;
        
        return (
          <Card key={index} className="bg-gradient-card shadow-card hover:shadow-elevated transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.subtitle}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-muted-foreground">{stat.title}</span>
                  <span className="text-xs font-semibold">{stat.progress}%</span>
                </div>
                <Progress value={stat.progress} className="h-1.5" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}