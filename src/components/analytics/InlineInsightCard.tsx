import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Target,
  Lightbulb,
  TrendingUp,
  Clock,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InlineInsightCardProps {
  context: string;
  data: any;
  title: string;
  description: string;
  variant?: 'default' | 'critical' | 'warning' | 'success';
}

interface AIInsight {
  mainInsight?: string;
  recommendations?: string[];
  quickWins?: string[];
  urgentActions?: string[];
  emergencyActions?: string[];
  studyAdjustments?: string[];
  resources?: string[];
  dailyActions?: string[];
  streakTips?: string[];
  habitStrategy?: string;
  recoveryPlan?: string;
  timeframe?: string;
}

export function InlineInsightCard({ 
  context, 
  data, 
  title, 
  description,
  variant = 'default' 
}: InlineInsightCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  const generateInsight = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('contextual-ai-insights', {
        body: { context, data }
      });
      
      if (error) throw error;
      
      if (response.success) {
        setInsight(response.insight);
        setIsExpanded(true);
      } else {
        throw new Error(response.error || 'Failed to generate insights');
      }
    } catch (error) {
      console.error('Error generating insights:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI insights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'critical':
        return 'border-destructive/50 bg-destructive/5';
      case 'warning':
        return 'border-warning/50 bg-warning/5';
      case 'success':
        return 'border-success/50 bg-success/5';
      default:
        return 'border-border/50 bg-card';
    }
  };

  const getIcon = () => {
    switch (context) {
      case 'gpa_improvement':
        return <TrendingUp className="w-4 h-4" />;
      case 'critical_alerts':
        return <AlertCircle className="w-4 h-4" />;
      case 'declining_course':
        return <Target className="w-4 h-4" />;
      case 'study_consistency':
        return <Clock className="w-4 h-4" />;
      default:
        return <Brain className="w-4 h-4" />;
    }
  };

  const renderInsightContent = () => {
    if (!insight) return null;

    return (
      <div className="space-y-4 mt-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h4 className="font-medium">AI Insights</h4>
        </div>

        {insight.mainInsight && (
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-medium text-foreground">{insight.mainInsight}</p>
          </div>
        )}

        {insight.urgentActions && insight.urgentActions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <h5 className="text-sm font-medium">Urgent Actions</h5>
            </div>
            <ul className="space-y-1">
              {insight.urgentActions.map((action, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <ArrowRight className="w-3 h-3 mt-0.5 text-destructive flex-shrink-0" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {insight.recommendations && insight.recommendations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              <h5 className="text-sm font-medium">Recommendations</h5>
            </div>
            <ul className="space-y-1">
              {insight.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <ArrowRight className="w-3 h-3 mt-0.5 text-primary flex-shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {insight.quickWins && insight.quickWins.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <h5 className="text-sm font-medium">Quick Wins</h5>
            </div>
            <ul className="space-y-1">
              {insight.quickWins.map((win, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <ArrowRight className="w-3 h-3 mt-0.5 text-success flex-shrink-0" />
                  <span>{win}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {insight.emergencyActions && insight.emergencyActions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <h5 className="text-sm font-medium">Emergency Actions</h5>
            </div>
            <ul className="space-y-1">
              {insight.emergencyActions.map((action, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <ArrowRight className="w-3 h-3 mt-0.5 text-destructive flex-shrink-0" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {insight.studyAdjustments && insight.studyAdjustments.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-warning" />
              <h5 className="text-sm font-medium">Study Adjustments</h5>
            </div>
            <ul className="space-y-1">
              {insight.studyAdjustments.map((adjustment, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <ArrowRight className="w-3 h-3 mt-0.5 text-warning flex-shrink-0" />
                  <span>{adjustment}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {insight.dailyActions && insight.dailyActions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-info" />
              <h5 className="text-sm font-medium">Daily Actions</h5>
            </div>
            <ul className="space-y-1">
              {insight.dailyActions.map((action, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <ArrowRight className="w-3 h-3 mt-0.5 text-info flex-shrink-0" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {insight.habitStrategy && (
          <div className="p-3 rounded-lg bg-info/10 border border-info/20">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-info" />
              <h5 className="text-sm font-medium">Strategy</h5>
            </div>
            <p className="text-sm text-muted-foreground">{insight.habitStrategy}</p>
          </div>
        )}

        {insight.recoveryPlan && (
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-warning" />
              <h5 className="text-sm font-medium">Recovery Plan</h5>
            </div>
            <p className="text-sm text-muted-foreground">{insight.recoveryPlan}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className={`transition-all duration-200 ${getVariantStyles()} ${isExpanded ? 'ring-1 ring-primary/20' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted/50">
              {getIcon()}
            </div>
            <div>
              <h4 className="font-medium text-sm">{title}</h4>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          
          {!insight ? (
            <Button 
              variant="outline" 
              size="sm"
              onClick={generateInsight}
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Brain className="w-4 h-4" />
              )}
              {isGenerating ? 'Analyzing...' : 'Get AI Help'}
            </Button>
          ) : (
            <Badge variant="secondary" className="bg-success/10 text-success">
              <CheckCircle className="w-3 h-3 mr-1" />
              Insights Ready
            </Badge>
          )}
        </div>
        
        {renderInsightContent()}
      </CardContent>
    </Card>
  );
}