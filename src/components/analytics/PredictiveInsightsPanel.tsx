import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  ArrowRight,
  Clock,
  BookOpen
} from "lucide-react";
import { InlineInsightCard } from "./InlineInsightCard";

interface GoalPrediction {
  goal_id: string;
  probability_percentage: number;
  risk_level: string;
  recommended_actions: string[];
}

interface GradeForecast {
  course_id: string;
  course_name: string;
  current_average: number;
  projected_30_days: number;
  projected_semester_end: number;
  trend_direction: string;
  confidence_level: string;
}

interface PerformanceRisk {
  risk_type: string;
  severity: string;
  description: string;
  affected_courses: string[];
  recommended_actions: string[];
}

interface AcademicGoal {
  id: string;
  goal_title: string;
  target_value: number;
  current_value: number;
}

interface PredictiveInsightsPanelProps {
  goalPredictions: GoalPrediction[];
  gradeForecasts: GradeForecast[];
  performanceRisks: PerformanceRisk[];
  academicGoals: AcademicGoal[];
}

export function PredictiveInsightsPanel({ 
  goalPredictions, 
  gradeForecasts, 
  performanceRisks,
  academicGoals
}: PredictiveInsightsPanelProps) {
  const getRiskBadge = (severity: string) => {
    switch (severity) {
      case 'high': return <Badge variant="destructive">High Risk</Badge>;
      case 'medium': return <Badge variant="secondary">Medium Risk</Badge>;
      case 'low': return <Badge variant="outline">Low Risk</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-success" />;
      case 'declining': return <TrendingDown className="w-4 h-4 text-destructive" />;
      default: return <ArrowRight className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getGoalForPrediction = (goalId: string) => {
    return academicGoals.find(goal => goal.id === goalId);
  };

  const criticalRisks = performanceRisks.filter(risk => risk.severity === 'high');
  const decliningCourses = gradeForecasts.filter(f => f.trend_direction === 'declining');
  const highRiskGoals = goalPredictions.filter(p => p.risk_level === 'high');

  return (
    <div className="space-y-6">
      {/* Critical Alerts Section with AI Insights */}
      {(criticalRisks.length > 0 || highRiskGoals.length > 0 || decliningCourses.length > 0) && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h3 className="text-lg font-semibold text-destructive">Critical Alerts</h3>
          </div>
          
          {criticalRisks.map((risk, index) => (
            <Alert key={index} className="border-destructive/50 bg-destructive/5">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div>
                  <p className="font-medium">{risk.description}</p>
                  {risk.affected_courses.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Affected courses: {risk.affected_courses.join(', ')}
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          ))}

          {/* AI Insight Card for Critical Alerts */}
          {criticalRisks.length > 0 && (
            <InlineInsightCard
              context="critical_alerts"
              data={{ 
                alertsCount: criticalRisks.length,
                risks: criticalRisks.map(r => r.risk_type),
                affectedCourses: criticalRisks.flatMap(r => r.affected_courses)
              }}
              title="Get Emergency Help"
              description="AI-powered action plan for your critical academic issues"
              variant="critical"
            />
          )}
        </div>
      )}

      {/* Grade Forecasts */}
      <Card className="bg-gradient-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <CardTitle>Grade Forecasts</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {gradeForecasts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No grade data available for forecasting</p>
              <p className="text-sm">Complete some assignments to see predictions</p>
            </div>
          ) : (
            <div className="space-y-4">
              {gradeForecasts.map((forecast) => (
                <div key={forecast.course_id} className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border">
                  <div className="flex items-center gap-3">
                    {getTrendIcon(forecast.trend_direction)}
                    <div>
                      <p className="font-medium">{forecast.course_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Current: {forecast.current_average} • 
                        30-day projection: {forecast.projected_30_days} • 
                        Semester: {forecast.projected_semester_end}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={forecast.confidence_level === 'high' ? 'default' : 'secondary'}>
                      {forecast.confidence_level} confidence
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* AI Insight for Declining Courses */}
          {decliningCourses.length > 0 && (
            <div className="mt-6">
              <InlineInsightCard
                context="declining_course"
                data={{
                  courses: decliningCourses,
                  count: decliningCourses.length
                }}
                title="Course Recovery Plan"
                description="AI-powered strategies to improve declining course performance"
                variant="warning"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Goal Achievement Predictions */}
      <Card className="bg-gradient-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <CardTitle>Goal Achievement Predictions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {goalPredictions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No active goals to predict</p>
              <p className="text-sm">Create some goals to see achievement probabilities</p>
            </div>
          ) : (
            <div className="space-y-4">
              {goalPredictions.map((prediction) => {
                const goal = getGoalForPrediction(prediction.goal_id);
                if (!goal) return null;

                return (
                  <div key={prediction.goal_id} className="p-4 rounded-lg bg-muted/20 border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        <p className="font-medium">{goal.goal_title}</p>
                      </div>
                      {getRiskBadge(prediction.risk_level)}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Achievement Probability</span>
                        <span className="font-medium">{prediction.probability_percentage}%</span>
                      </div>
                      <Progress 
                        value={prediction.probability_percentage} 
                        className={`h-2 ${
                          prediction.probability_percentage >= 70 ? 'text-success' : 
                          prediction.probability_percentage >= 40 ? 'text-warning' : 'text-destructive'
                        }`}
                      />
                      
                      {prediction.recommended_actions.length > 0 && prediction.risk_level !== 'low' && (
                        <div className="mt-3 p-3 rounded bg-muted/50">
                          <p className="text-sm font-medium mb-2">Recommended Actions:</p>
                          <ul className="text-sm text-muted-foreground space-y-1">
                          {prediction.recommended_actions.slice(0, 3).map((action, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              {action}
                            </li>
                          ))}
                        </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Risk Analysis */}
      <Card className="bg-gradient-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-primary" />
            <CardTitle>Performance Risk Analysis</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {performanceRisks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No performance risks detected</p>
              <p className="text-sm">Keep up the great work!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {performanceRisks.map((risk, index) => (
                <div key={index} className="p-4 rounded-lg bg-muted/20 border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <p className="font-medium capitalize">{risk.risk_type.replace('_', ' ')}</p>
                    </div>
                    {getRiskBadge(risk.severity)}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">{risk.description}</p>
                  
                  {risk.recommended_actions.length > 0 && (
                    <div className="p-3 rounded bg-muted/50">
                      <p className="text-sm font-medium mb-2">Quick Actions:</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {risk.recommended_actions.slice(0, 2).map((action, actionIndex) => (
                          <li key={actionIndex} className="flex items-start gap-2">
                            <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}