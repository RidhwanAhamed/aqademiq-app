import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Target, Clock, CheckCircle } from "lucide-react";

const stats = [
  {
    title: "Tasks Completed",
    value: "12",
    subtitle: "out of 18 this week",
    progress: 67,
    icon: CheckCircle,
    color: "text-success",
    bgColor: "bg-success-muted"
  },
  {
    title: "Study Hours",
    value: "24.5",
    subtitle: "hours this week",
    progress: 82,
    icon: Clock,
    color: "text-primary",
    bgColor: "bg-primary-muted"
  },
  {
    title: "Weekly Goal",
    value: "82%",
    subtitle: "on track",
    progress: 82,
    icon: Target,
    color: "text-accent",
    bgColor: "bg-accent-muted"
  },
  {
    title: "Productivity",
    value: "↑15%",
    subtitle: "vs last week",
    progress: 90,
    icon: TrendingUp,
    color: "text-warning",
    bgColor: "bg-warning-muted"
  }
];

export function QuickStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
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