import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Target, 
  Brain, 
  Clock,
  GraduationCap,
  Zap,
  AlertTriangle,
  Trophy,
  Flame
} from "lucide-react";

interface HeroKPI {
  title: string;
  value: string | number;
  trend?: string;
  trendValue?: string;
  icon: React.ReactNode;
  gradient: string;
  description?: string;
  showAIButton?: boolean;
  progress?: number;
  badge?: string;
  onNeedAIInsights?: () => void;
}

interface EnhancedHeroKPIsProps {
  overallGPA: number;
  semesterProgress: number;
  studyStreak: number;
  criticalAlertsCount: number;
  onNeedAIInsights?: (context: string, data: any) => void;
}

export function EnhancedHeroKPIs({ 
  overallGPA, 
  semesterProgress, 
  studyStreak, 
  criticalAlertsCount,
  onNeedAIInsights 
}: EnhancedHeroKPIsProps) {
  const kpis: HeroKPI[] = [
    {
      title: "Overall Performance",
      value: overallGPA > 0 ? overallGPA.toFixed(2) : "—",
      trend: overallGPA > 7 ? "up" : overallGPA > 5 ? "stable" : "down",
      trendValue: overallGPA > 7 ? "+0.3 this month" : overallGPA > 5 ? "Stable" : "Needs attention",
      icon: <GraduationCap className="w-8 h-8 text-white" />,
      gradient: "bg-gradient-to-br from-primary to-primary/80",
      description: "Academic GPA across all courses",
      showAIButton: overallGPA < 7,
      onNeedAIInsights: () => onNeedAIInsights?.('gpa_improvement', { currentGPA: overallGPA })
    },
    {
      title: "Semester Progress",
      value: `${semesterProgress}%`,
      icon: <Target className="w-8 h-8 text-white" />,
      gradient: "bg-gradient-to-br from-success to-success/80",
      description: "Goals and milestones completed",
      progress: semesterProgress,
      showAIButton: semesterProgress < 70,
      onNeedAIInsights: () => onNeedAIInsights?.('semester_planning', { progress: semesterProgress })
    },
    {
      title: "Study Streak",
      value: studyStreak,
      icon: <Flame className="w-8 h-8 text-white" />,
      gradient: "bg-gradient-to-br from-warning to-warning/80",
      description: `${studyStreak} days of consistent studying`,
      badge: studyStreak > 7 ? "On Fire!" : studyStreak > 3 ? "Building" : "Start Today",
      showAIButton: studyStreak < 3,
      onNeedAIInsights: () => onNeedAIInsights?.('study_consistency', { currentStreak: studyStreak })
    },
    {
      title: "AI Insights",
      value: criticalAlertsCount > 0 ? criticalAlertsCount : "All Good",
      icon: criticalAlertsCount > 0 ? <AlertTriangle className="w-8 h-8 text-white" /> : <Trophy className="w-8 h-8 text-white" />,
      gradient: criticalAlertsCount > 0 ? "bg-gradient-to-br from-destructive to-destructive/80" : "bg-gradient-to-br from-info to-info/80",
      description: criticalAlertsCount > 0 ? `${criticalAlertsCount} areas need attention` : "No critical issues detected",
      showAIButton: true,
      badge: criticalAlertsCount > 0 ? "Action Needed" : "Excellent",
      onNeedAIInsights: () => onNeedAIInsights?.('critical_insights', { alertsCount: criticalAlertsCount })
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {kpis.map((kpi, index) => (
        <Card key={index} className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <div className={`${kpi.gradient} p-6 text-white relative overflow-hidden`}>
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-6 translate-x-6"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-4 -translate-x-4"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-white/20 rounded-lg">
                  {kpi.icon}
                </div>
                {kpi.badge && (
                  <Badge 
                    variant="secondary" 
                    className="bg-white/20 text-white border-white/30 hover:bg-white/30"
                  >
                    {kpi.badge}
                  </Badge>
                )}
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-white/80">{kpi.title}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{kpi.value}</span>
                  {kpi.trend && (
                    <div className={`flex items-center gap-1 text-sm ${
                      kpi.trend === 'up' ? 'text-green-200' : 
                      kpi.trend === 'down' ? 'text-red-200' : 'text-white/60'
                    }`}>
                      <TrendingUp className={`w-3 h-3 ${kpi.trend === 'down' ? 'rotate-180' : ''}`} />
                      <span>{kpi.trendValue}</span>
                    </div>
                  )}
                </div>
                
                {kpi.progress !== undefined && (
                  <div className="space-y-1">
                    <Progress value={kpi.progress} className="h-2 bg-white/20" />
                  </div>
                )}
                
                <p className="text-xs text-white/70">{kpi.description}</p>
              </div>
            </div>
          </div>
          
          {kpi.showAIButton && (
            <CardContent className="p-4 bg-card">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={kpi.onNeedAIInsights}
              >
                <Brain className="w-4 h-4 mr-2" />
                Need AI Insights?
              </Button>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}