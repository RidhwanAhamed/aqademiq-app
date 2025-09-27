import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Target, 
  Clock,
  GraduationCap,
  AlertTriangle,
  Trophy,
  Flame
} from "lucide-react";
import { InlineInsightCard } from "./InlineInsightCard";

interface HeroKPI {
  title: string;
  value: string | number;
  trend?: string;
  trendValue?: string;
  icon: React.ReactNode;
  gradient: string;
  description?: string;
  progress?: number;
  badge?: string;
  needsAttention?: boolean;
  aiContext?: string;
  aiData?: any;
}

interface EnhancedHeroKPIsProps {
  overallGPA: number;
  semesterProgress: number;
  studyStreak: number;
  criticalAlertsCount: number;
}

export function EnhancedHeroKPIs({ 
  overallGPA, 
  semesterProgress, 
  studyStreak, 
  criticalAlertsCount
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
      needsAttention: overallGPA < 7,
      aiContext: 'gpa_improvement',
      aiData: { currentGPA: overallGPA }
    },
    {
      title: "Semester Progress",
      value: `${semesterProgress}%`,
      icon: <Target className="w-8 h-8 text-white" />,
      gradient: "bg-gradient-to-br from-success to-success/80",
      description: "Goals and milestones completed",
      progress: semesterProgress,
      needsAttention: false
    },
    {
      title: "Study Streak",
      value: studyStreak,
      icon: <Flame className="w-8 h-8 text-white" />,
      gradient: "bg-gradient-to-br from-warning to-warning/80",
      description: `${studyStreak} days of consistent studying`,
      badge: studyStreak > 7 ? "On Fire!" : studyStreak > 3 ? "Building" : "Start Today",
      needsAttention: studyStreak < 3,
      aiContext: 'study_consistency',
      aiData: { currentStreak: studyStreak }
    },
    {
      title: "Critical Alerts",
      value: criticalAlertsCount > 0 ? criticalAlertsCount : "All Good",
      icon: criticalAlertsCount > 0 ? <AlertTriangle className="w-8 h-8 text-white" /> : <Trophy className="w-8 h-8 text-white" />,
      gradient: criticalAlertsCount > 0 ? "bg-gradient-to-br from-destructive to-destructive/80" : "bg-gradient-to-br from-info to-info/80",
      description: criticalAlertsCount > 0 ? `${criticalAlertsCount} areas need attention` : "No critical issues detected",
      badge: criticalAlertsCount > 0 ? "Action Needed" : "Excellent",
      needsAttention: criticalAlertsCount > 0,
      aiContext: 'critical_alerts',
      aiData: { alertsCount: criticalAlertsCount }
    }
  ];

  // Filter KPIs that need attention for AI insights
  const needsAttentionKPIs = kpis.filter(kpi => kpi.needsAttention && kpi.aiContext);

  return (
    <div className="space-y-6 mb-8">
      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          </Card>
        ))}
      </div>

      {/* AI Insight Cards - Only for areas that need attention */}
      {needsAttentionKPIs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <h3 className="text-lg font-semibold">Areas for Improvement</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {needsAttentionKPIs.map((kpi, index) => (
              <InlineInsightCard
                key={index}
                context={kpi.aiContext!}
                data={kpi.aiData}
                title={`Improve ${kpi.title}`}
                description={`Get personalized advice to boost your ${kpi.title.toLowerCase()}`}
                variant={kpi.aiContext === 'critical_alerts' ? 'critical' : 'warning'}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}