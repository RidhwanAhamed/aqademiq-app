import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  AlertTriangle, 
  CheckCircle, 
  Brain,
  Calendar,
  Clock,
  Award,
  Lightbulb,
  Zap
} from "lucide-react";

interface InteractiveInsightsSummaryProps {
  overallGPA: number;
  goalsProgress: {
    total: number;
    onTrack: number;
    behindSchedule: number;
  };
  decliningCourses: any[];
  criticalRisks: any[];
  studyAnalytics: any[];
  onNeedAIInsights?: (context: string, data: any) => void;
}

export function InteractiveInsightsSummary({
  overallGPA,
  goalsProgress,
  decliningCourses,
  criticalRisks,
  studyAnalytics,
  onNeedAIInsights
}: InteractiveInsightsSummaryProps) {

  // Calculate insights
  const totalStudyHours = studyAnalytics.reduce((sum, session) => 
    sum + (session.effective_study_minutes || 0), 0
  ) / 60;
  
  const avgProductivity = studyAnalytics.length > 0 
    ? studyAnalytics.reduce((sum, session) => sum + (session.productivity_score || 0), 0) / studyAnalytics.length
    : 0;

  const recentSessions = studyAnalytics.filter(session => {
    const sessionDate = new Date(session.session_date);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return sessionDate >= sevenDaysAgo;
  }).length;

  // Generate insights
  const insights = [
    {
      type: 'performance',
      title: 'Academic Performance',
      status: overallGPA >= 8.0 ? 'excellent' : overallGPA >= 7.0 ? 'good' : overallGPA >= 6.0 ? 'satisfactory' : 'needs-attention',
      value: overallGPA.toFixed(1),
      description: overallGPA >= 8.0 
        ? 'Outstanding academic performance! Keep up the excellent work.'
        : overallGPA >= 7.0
        ? 'Strong performance with room for optimization in key areas.'
        : overallGPA >= 6.0
        ? 'Satisfactory progress. Focus on consistency and improvement strategies.'
        : 'Performance needs attention. Consider restructuring your study approach.',
      icon: overallGPA >= 7.0 ? Award : overallGPA >= 6.0 ? Target : AlertTriangle,
      action: 'gpa_strategy'
    },
    {
      type: 'goals',
      title: 'Goal Achievement',
      status: goalsProgress.total === 0 ? 'no-data' :
              (goalsProgress.onTrack / goalsProgress.total) >= 0.8 ? 'excellent' :
              (goalsProgress.onTrack / goalsProgress.total) >= 0.6 ? 'good' : 'needs-attention',
      value: goalsProgress.total > 0 ? `${Math.round((goalsProgress.onTrack / goalsProgress.total) * 100)}%` : 'N/A',
      description: goalsProgress.total === 0
        ? 'Set academic goals to track your progress and stay motivated.'
        : (goalsProgress.onTrack / goalsProgress.total) >= 0.8
        ? 'Excellent goal achievement rate! Your planning is paying off.'
        : (goalsProgress.onTrack / goalsProgress.total) >= 0.6
        ? 'Good progress on goals. Fine-tune strategies for better results.'
        : 'Several goals are behind schedule. Time to reassess and adjust.',
      icon: goalsProgress.total === 0 ? Target : (goalsProgress.onTrack / goalsProgress.total) >= 0.6 ? CheckCircle : AlertTriangle,
      action: 'goal_optimization'
    },
    {
      type: 'productivity',
      title: 'Study Productivity',
      status: avgProductivity >= 80 ? 'excellent' : 
              avgProductivity >= 60 ? 'good' : 
              avgProductivity >= 40 ? 'satisfactory' : 'needs-attention',
      value: totalStudyHours > 0 ? `${Math.round(avgProductivity)}%` : 'N/A',
      description: totalStudyHours === 0
        ? 'Start logging study sessions to track your productivity patterns.'
        : avgProductivity >= 80
        ? 'Excellent focus and productivity! Your study methods are highly effective.'
        : avgProductivity >= 60
        ? 'Good productivity levels. Consider optimizing your study environment.'
        : avgProductivity >= 40
        ? 'Moderate productivity. Try techniques like Pomodoro or active recall.'
        : 'Low productivity detected. Let\'s identify and eliminate distractions.',
      icon: totalStudyHours === 0 ? Clock : avgProductivity >= 60 ? Zap : AlertTriangle,
      action: 'productivity_boost'
    },
    {
      type: 'consistency',
      title: 'Study Consistency',
      status: recentSessions >= 5 ? 'excellent' : 
              recentSessions >= 3 ? 'good' : 
              recentSessions >= 1 ? 'satisfactory' : 'needs-attention',
      value: `${recentSessions} days`,
      description: recentSessions >= 5
        ? 'Fantastic consistency! Regular study habits are your key to success.'
        : recentSessions >= 3
        ? 'Good study rhythm. Try to maintain this consistency long-term.'
        : recentSessions >= 1
        ? 'Starting to build habits. Aim for daily study sessions for better results.'
        : 'Inconsistent study pattern detected. Build a sustainable daily routine.',
      icon: recentSessions >= 3 ? CheckCircle : recentSessions >= 1 ? Calendar : AlertTriangle,
      action: 'consistency_plan'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-success border-success/20 bg-success/5';
      case 'good': return 'text-primary border-primary/20 bg-primary/5';
      case 'satisfactory': return 'text-warning border-warning/20 bg-warning/5';
      case 'needs-attention': return 'text-destructive border-destructive/20 bg-destructive/5';
      case 'no-data': return 'text-muted-foreground border-muted/20 bg-muted/5';
      default: return 'text-muted-foreground border-muted/20 bg-muted/5';
    }
  };

  return (
    <Card className="bg-gradient-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            Performance Insights Summary
          </CardTitle>
          <Badge variant="outline" className="animate-pulse">
            Live Analysis
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {insights.map((insight, index) => {
            const Icon = insight.icon;
            return (
              <div key={insight.type} className="text-center space-y-2">
                <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${getStatusColor(insight.status)}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <p className="text-2xl font-bold">{insight.value}</p>
                <p className="text-xs text-muted-foreground">{insight.title}</p>
              </div>
            );
          })}
        </div>

        <Separator />

        {/* Detailed Insights */}
        <div className="space-y-4">
          {insights.map((insight, index) => {
            const Icon = insight.icon;
            return (
              <div key={insight.type} className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${getStatusColor(insight.status)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <Icon className="w-5 h-5 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{insight.title}</h4>
                        <Badge variant={insight.status === 'excellent' ? 'default' : 
                                      insight.status === 'good' ? 'secondary' :
                                      insight.status === 'satisfactory' ? 'outline' : 'destructive'} 
                               className="text-xs">
                          {insight.value}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{insight.description}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onNeedAIInsights?.(insight.action, {
                      type: insight.type,
                      status: insight.status,
                      value: insight.value,
                      overallGPA,
                      goalsProgress,
                      studyAnalytics: {
                        totalHours: totalStudyHours,
                        avgProductivity,
                        recentSessions
                      }
                    })}
                    className="opacity-70 hover:opacity-100"
                  >
                    <Brain className="w-4 h-4 mr-1" />
                    Improve
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Critical Alerts */}
        {(criticalRisks.length > 0 || decliningCourses.length > 0) && (
          <>
            <Separator />
            <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                  <div>
                    <h4 className="font-medium text-destructive mb-1">Immediate Action Required</h4>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {criticalRisks.length > 0 && (
                        <p>• {criticalRisks.length} critical performance risk{criticalRisks.length > 1 ? 's' : ''} detected</p>
                      )}
                      {decliningCourses.length > 0 && (
                        <p>• {decliningCourses.length} course{decliningCourses.length > 1 ? 's are' : ' is'} showing declining trends</p>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onNeedAIInsights?.('emergency_intervention', {
                    criticalRisks,
                    decliningCourses,
                    overallGPA,
                    goalsProgress
                  })}
                >
                  <Brain className="w-4 h-4 mr-1" />
                  Get Help Now
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}