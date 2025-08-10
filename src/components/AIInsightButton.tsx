import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Clock, Lightbulb, Target, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AIInsightButtonProps {
  type: 'assignment' | 'exam' | 'planning';
  title: string;
  dueDate?: string;
  estimatedHours?: number;
  availableSlots?: string[];
  description?: string;
  courseInfo?: string;
}

interface AIInsightResponse {
  suggestedSessions: Array<{
    date: string;
    time: string;
    duration: string;
    focus: string;
    description: string;
  }>;
  productivityTips: string[];
  planningRecommendations: string[];
}

export function AIInsightButton({ 
  type, 
  title, 
  dueDate, 
  estimatedHours, 
  availableSlots, 
  description, 
  courseInfo 
}: AIInsightButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [insights, setInsights] = useState<AIInsightResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateInsights = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Please log in to use AI insights');
      }

      const response = await supabase.functions.invoke('ai-insights', {
        body: {
          type,
          title,
          dueDate,
          estimatedHours,
          availableSlots,
          description,
          courseInfo
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate insights');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      // Ensure all required properties exist with defaults
      const safeInsights = {
        suggestedSessions: response.data?.suggestedSessions || [],
        productivityTips: response.data?.productivityTips || [],
        planningRecommendations: response.data?.planningRecommendations || []
      };
      setInsights(safeInsights);
    } catch (error: any) {
      console.error('Error generating insights:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate AI insights",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setIsOpen(true);
    if (!insights) {
      generateInsights();
    }
  };

  const regenerateInsights = () => {
    setInsights(null);
    generateInsights();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleOpenDialog}
          className="text-primary border-primary/20 hover:bg-primary/5"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Need Insight?
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Study Insights for "{title}"
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Generating study suggestions...</p>
            </div>
          </div>
        ) : insights ? (
          <div className="space-y-6">
            {/* Suggested Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  Suggested Study Sessions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(insights.suggestedSessions || []).map((session, index) => (
                  <div key={index} className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{session.date}</Badge>
                        <Badge variant="outline">{session.time}</Badge>
                        <Badge variant="outline">{session.duration}</Badge>
                      </div>
                    </div>
                    <h4 className="font-medium mb-1">{session.focus}</h4>
                    <p className="text-sm text-muted-foreground">{session.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Productivity Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  Productivity Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(insights.productivityTips || []).map((tip, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2 flex-shrink-0" />
                      <span className="text-sm">{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Planning Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-500" />
                  Planning Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(insights.planningRecommendations || []).map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                      <span className="text-sm">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={regenerateInsights}>
                <Sparkles className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
              <Button onClick={() => setIsOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Click the button above to generate AI insights</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}