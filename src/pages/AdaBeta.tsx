import { AdaAIChat } from "@/components/AdaAIChat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Sparkles, 
  Zap, 
  Clock, 
  Shield, 
  Users, 
  RefreshCw,
  MessageSquare,
  Brain,
  Target,
  TrendingUp,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useState } from "react";

export default function AdaBeta() {
  const [refreshKey, setRefreshKey] = useState(0);

  const features = [
    {
      icon: <Brain className="w-5 h-5" />,
      title: "AI-Powered Study Assistant",
      description: "Get intelligent help with homework, explanations, and study strategies tailored to your learning style."
    },
    {
      icon: <MessageSquare className="w-5 h-5" />,
      title: "Interactive Chat Interface",
      description: "Natural conversation flow with context awareness and memory of your academic preferences."
    },
    {
      icon: <Target className="w-5 h-5" />,
      title: "Academic Goal Tracking",
      description: "Set and monitor academic goals with AI-powered recommendations for improvement."
    },
    {
      icon: <Clock className="w-5 h-5" />,
      title: "Study Schedule Optimization",
      description: "AI analyzes your schedule to suggest optimal study times and break intervals."
    }
  ];

  const betaFeatures = [
    "Advanced natural language processing",
    "Context-aware academic assistance", 
    "Smart study recommendations",
    "Real-time learning analytics",
    "Accessibility-first design",
    "Mobile-optimized interface"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
        
        {/* Beta Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Ada AI Beta
              </h1>
              <div className="flex items-center justify-center gap-2">
                <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Beta Version
                </Badge>
                <Badge variant="outline" className="border-primary/20 text-primary">
                  Testing Phase
                </Badge>
              </div>
            </div>
          </div>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Experience cutting-edge AI academic assistance in beta. Help us shape the future of 
            intelligent study support through your feedback and testing.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          
          {/* Main Chat Interface */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            <Card className="h-[600px] sm:h-[700px] lg:h-[800px] flex flex-col shadow-xl border-primary/10">
              <CardHeader className="pb-4 space-y-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
                      <Brain className="w-5 h-5 text-primary" />
                      Ada AI Chat
                      <Badge variant="secondary" className="text-xs">Beta</Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Your intelligent academic companion
                    </p>
                  </div>
                  <Button
                    onClick={() => setRefreshKey(prev => prev + 1)}
                    variant="outline"
                    size="sm"
                    className="self-start sm:self-auto"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset Chat
                  </Button>
                </div>
              </CardHeader>
              <div className="flex-1 overflow-hidden">
                <AdaAIChat key={refreshKey} />
              </div>
            </Card>
          </div>

          {/* Beta Information Sidebar */}
          <div className="lg:col-span-1 order-1 lg:order-2 space-y-6">
            
            {/* Beta Status */}
            <Card className="border-orange-200 dark:border-orange-800/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  Beta Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Version</span>
                  <Badge variant="secondary" className="text-xs">v0.9.2-beta</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Active Testing
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Uptime</span>
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">99.2%</span>
                </div>
                <Separator />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This beta version includes experimental features and may experience occasional issues. 
                  Your feedback helps us improve!
                </p>
              </CardContent>
            </Card>

            {/* Beta Features */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Beta Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {betaFeatures.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Feedback Request */}
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Help Us Improve
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your feedback is invaluable for improving Ada AI. Report bugs, suggest features, 
                  or share your experience.
                </p>
                <Button size="sm" className="w-full" variant="outline">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send Feedback
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Features Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              What's New in Beta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <div key={index} className="space-y-3 p-4 rounded-lg border border-border/50 hover:border-primary/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {feature.icon}
                    </div>
                    <h3 className="font-semibold text-sm">{feature.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}