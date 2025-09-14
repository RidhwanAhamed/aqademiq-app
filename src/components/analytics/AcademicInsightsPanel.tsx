import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lightbulb, X, Check, TrendingUp, BookOpen, Calendar, AlertTriangle } from "lucide-react";

interface AcademicInsight {
  id: string;
  insight_type: string;
  insight_title: string;
  insight_description: string;
  confidence_score: number;
  action_items: any;
  related_course_id: string | null;
  related_assignment_id: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  expires_at: string | null;
  created_at: string;
}

interface AcademicInsightsPanelProps {
  insights: AcademicInsight[];
  courses: Array<{ id: string; name: string; color: string }>;
  onDismissInsight: (insightId: string) => void;
  onMarkAsRead: (insightId: string) => void;
}

export function AcademicInsightsPanel({ 
  insights, 
  courses, 
  onDismissInsight, 
  onMarkAsRead 
}: AcademicInsightsPanelProps) {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'grade_prediction': return <TrendingUp className="w-4 h-4" />;
      case 'study_recommendation': return <BookOpen className="w-4 h-4" />;
      case 'schedule_optimization': return <Calendar className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getInsightVariant = (type: string) => {
    switch (type) {
      case 'grade_prediction': return 'default';
      case 'study_recommendation': return 'secondary';
      case 'schedule_optimization': return 'outline';
      default: return 'default';
    }
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 0.8) return <Badge className="bg-success text-success-foreground">High Confidence</Badge>;
    if (score >= 0.6) return <Badge variant="secondary">Medium Confidence</Badge>;
    return <Badge variant="outline">Low Confidence</Badge>;
  };

  const handleInsightClick = (insight: AcademicInsight) => {
    if (!insight.is_read) {
      onMarkAsRead(insight.id);
    }
  };

  const unreadInsights = insights.filter(insight => !insight.is_read);
  const readInsights = insights.filter(insight => insight.is_read);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Academic Insights
          </h3>
          <p className="text-sm text-muted-foreground">
            AI-powered recommendations to improve your academic performance
          </p>
        </div>
        {unreadInsights.length > 0 && (
          <Badge variant="default" className="bg-primary text-primary-foreground">
            {unreadInsights.length} new
          </Badge>
        )}
      </div>

      {/* No insights message */}
      {insights.length === 0 && (
        <Card className="bg-gradient-card">
          <CardContent className="p-6 text-center">
            <Lightbulb className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No insights available yet. Continue using Aqademiq to get personalized recommendations!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Unread Insights */}
      {unreadInsights.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-primary">New Insights ({unreadInsights.length})</h4>
          {unreadInsights.map(insight => {
            const course = courses.find(c => c.id === insight.related_course_id);
            
            return (
              <Card 
                key={insight.id} 
                className="bg-gradient-card border-primary/50 cursor-pointer transition-all hover:shadow-md"
                onClick={() => handleInsightClick(insight)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getInsightIcon(insight.insight_type)}
                      <div>
                        <CardTitle className="text-base">{insight.insight_title}</CardTitle>
                        {course && (
                          <p className="text-sm text-muted-foreground">{course.name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getConfidenceBadge(insight.confidence_score)}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDismissInsight(insight.id);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm">{insight.insight_description}</p>
                    
                    {Array.isArray(insight.action_items) && insight.action_items.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Recommended Actions:</p>
                        <ul className="space-y-1">
                          {insight.action_items.map((action: string, index: number) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                              <Check className="w-3 h-3 mt-0.5 text-success flex-shrink-0" />
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Generated {new Date(insight.created_at).toLocaleDateString()}</span>
                      {insight.expires_at && (
                        <span>Expires {new Date(insight.expires_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Read Insights */}
      {readInsights.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-muted-foreground">Previous Insights ({readInsights.length})</h4>
          {readInsights.slice(0, 5).map(insight => {
            const course = courses.find(c => c.id === insight.related_course_id);
            
            return (
              <Card key={insight.id} className="bg-gradient-card opacity-75">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getInsightIcon(insight.insight_type)}
                      <div>
                        <p className="font-medium text-sm">{insight.insight_title}</p>
                        <p className="text-xs text-muted-foreground">
                          {course?.name || 'General'} • {new Date(insight.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDismissInsight(insight.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}