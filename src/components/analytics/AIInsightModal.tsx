import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Brain, 
  Sparkles, 
  ArrowRight, 
  Clock, 
  Target,
  Lightbulb,
  TrendingUp,
  Send,
  Loader2
} from "lucide-react";

interface AIInsightModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: string;
  contextData: any;
  onGenerateInsights: (context: string, data: any, customQuery?: string) => Promise<any>;
}

export function AIInsightModal({ 
  open, 
  onOpenChange, 
  context, 
  contextData,
  onGenerateInsights 
}: AIInsightModalProps) {
  const [customQuery, setCustomQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [insights, setInsights] = useState<any>(null);

  const handleGenerateInsights = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    try {
      const result = await onGenerateInsights(context, contextData, customQuery);
      setInsights(result);
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getContextTitle = (context: string) => {
    switch (context) {
      case 'gpa_improvement': return 'GPA Improvement Strategy';
      case 'semester_planning': return 'Semester Progress Optimization';
      case 'study_consistency': return 'Study Streak Building';
      case 'critical_insights': return 'Critical Performance Analysis';
      case 'goal_strategy': return 'Goal Achievement Strategy';
      case 'grade_trends': return 'Grade Trend Analysis';
      case 'risk_mitigation': return 'Performance Risk Mitigation';
      case 'declining_course': return 'Course Recovery Plan';
      case 'goal_detailed_strategy': return 'Detailed Goal Strategy';
      case 'detailed_risk_plan': return 'Comprehensive Recovery Plan';
      case 'performance_risk': return 'Performance Risk Analysis';
      case 'course_improvement': return 'Course Improvement Strategy';
      case 'course_overview': return 'Course Performance Overview';
      case 'dashboard_overview': return 'Academic Dashboard Analysis';
      default: return 'AI Academic Insights';
    }
  };

  const getContextDescription = (context: string) => {
    switch (context) {
      case 'gpa_improvement': return 'Get personalized recommendations to improve your academic performance';
      case 'semester_planning': return 'Optimize your semester progress with strategic planning';
      case 'study_consistency': return 'Build and maintain effective study habits';
      case 'critical_insights': return 'Address critical areas that need immediate attention';
      case 'goal_strategy': return 'Develop strategies to achieve your academic goals';
      case 'grade_trends': return 'Understand your grade patterns and future projections';
      case 'risk_mitigation': return 'Prevent performance decline with proactive measures';
      case 'course_improvement': return 'Get targeted strategies to improve this specific course';
      case 'course_overview': return 'Analyze your overall course portfolio and balance workload';
      case 'dashboard_overview': return 'Comprehensive insights based on your complete academic picture';
      default: return 'Get AI-powered insights tailored to your academic situation';
    }
  };

  const contextIcon = {
    gpa_improvement: <TrendingUp className="w-5 h-5" />,
    semester_planning: <Target className="w-5 h-5" />,
    study_consistency: <Clock className="w-5 h-5" />,
    critical_insights: <Brain className="w-5 h-5" />,
    goal_strategy: <Target className="w-5 h-5" />,
    grade_trends: <TrendingUp className="w-5 h-5" />,
    risk_mitigation: <Lightbulb className="w-5 h-5" />,
    default: <Sparkles className="w-5 h-5" />
  }[context] || <Sparkles className="w-5 h-5" />;

  const handleClose = () => {
    onOpenChange(false);
    setInsights(null);
    setCustomQuery('');
    setIsGenerating(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            {contextIcon}
            {getContextTitle(context)}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {getContextDescription(context)}
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Context Data Preview */}
          <Card className="bg-muted/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">Analysis Context</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {context === 'gpa_improvement' && `Current GPA: ${contextData?.currentGPA || 'N/A'}`}
                {context === 'semester_planning' && `Progress: ${contextData?.progress || 0}%`}
                {context === 'study_consistency' && `Current streak: ${contextData?.currentStreak || 0} days`}
                {context === 'critical_insights' && `Alerts: ${contextData?.alertsCount || 0} critical areas`}
                {context === 'goal_strategy' && `${contextData?.length || 0} active goals`}
                {context === 'grade_trends' && `${contextData?.length || 0} courses analyzed`}
                {context === 'risk_mitigation' && `${contextData?.length || 0} risk factors identified`}
                {context === 'declining_course' && `Course: ${contextData?.course_name || 'Unknown'}`}
                {context === 'performance_risk' && `Risk: ${contextData?.risk_type || 'Unknown'}`}
                {context === 'course_improvement' && `Course: ${contextData?.course?.name || 'Unknown'} - ${contextData?.course?.progress_percentage || 0}% progress`}
                {context === 'course_overview' && `${contextData?.totalCourses || 0} total courses, ${contextData?.coursesNeedingHelp || 0} need attention`}
                {context === 'dashboard_overview' && `${contextData?.courses?.length || 0} courses, ${contextData?.upcoming?.length || 0} upcoming deadlines`}
              </div>
            </CardContent>
          </Card>

          {/* Custom Query Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Ask a specific question (optional)
            </label>
            <Textarea
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              placeholder="e.g., 'How can I improve my performance in Mathematics?' or 'What's the best study schedule for my goals?'"
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Generate Button */}
          <Button 
            onClick={handleGenerateInsights}
            disabled={isGenerating}
            className="w-full bg-gradient-primary hover:opacity-90"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating AI Insights...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Generate AI Insights
              </>
            )}
          </Button>

          {/* Generated Insights */}
          {insights && (
            <div className="space-y-4">
              <div className="border-t my-4" />
              
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">AI-Generated Insights</h3>
              </div>

              <div className="space-y-4">
                {insights.suggestedSessions && insights.suggestedSessions.length > 0 && (
                  <Card className="bg-gradient-card">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-primary" />
                        <h4 className="font-medium">Suggested Study Sessions</h4>
                      </div>
                      <div className="space-y-2">
                        {insights.suggestedSessions.map((session: string, index: number) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <ArrowRight className="w-3 h-3 mt-0.5 text-primary" />
                            <span>{session}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {insights.productivityTips && insights.productivityTips.length > 0 && (
                  <Card className="bg-gradient-card">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="w-4 h-4 text-primary" />
                        <h4 className="font-medium">Productivity Tips</h4>
                      </div>
                      <div className="space-y-2">
                        {insights.productivityTips.map((tip: string, index: number) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <ArrowRight className="w-3 h-3 mt-0.5 text-primary" />
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {insights.planningRecommendations && insights.planningRecommendations.length > 0 && (
                  <Card className="bg-gradient-card">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Target className="w-4 h-4 text-primary" />
                        <h4 className="font-medium">Planning Recommendations</h4>
                      </div>
                      <div className="space-y-2">
                        {insights.planningRecommendations.map((rec: string, index: number) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <ArrowRight className="w-3 h-3 mt-0.5 text-primary" />
                            <span>{rec}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {insights.generatedText && !insights.generatedText.includes('```') && !insights.generatedText.startsWith('{') && (
                  <Card className="bg-gradient-card">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="w-4 h-4 text-primary" />
                        <h4 className="font-medium">Detailed Analysis</h4>
                      </div>
                      <div className="text-sm whitespace-pre-wrap">{insights.generatedText}</div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}