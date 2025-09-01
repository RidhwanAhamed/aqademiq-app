import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, Target, TrendingUp, CheckCircle2, Circle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DataRequirement {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  isComplete: boolean;
  actionText: string;
  actionPath: string;
}

interface AnalyticsEmptyStateProps {
  dataRequirements: {
    courses: boolean;
    assignments: boolean;
    studySessions: boolean;
    grades: boolean;
  };
}

export function AnalyticsEmptyState({ dataRequirements }: AnalyticsEmptyStateProps) {
  const navigate = useNavigate();

  const requirements: DataRequirement[] = [
    {
      icon: BookOpen,
      title: "Add Courses",
      description: "Create your course structure to organize your academic data",
      isComplete: dataRequirements.courses,
      actionText: "Add Courses",
      actionPath: "/courses"
    },
    {
      icon: Target,
      title: "Create Assignments",
      description: "Add assignments to track your academic workload and progress",
      isComplete: dataRequirements.assignments,
      actionText: "Add Assignments",
      actionPath: "/assignments"
    },
    {
      icon: Clock,
      title: "Complete Study Sessions",
      description: "Track your study time to analyze productivity patterns",
      isComplete: dataRequirements.studySessions,
      actionText: "Start Timer",
      actionPath: "/timer"
    },
    {
      icon: TrendingUp,
      title: "Record Grades",
      description: "Add grades to assignments and exams for performance analytics",
      isComplete: dataRequirements.grades,
      actionText: "View Assignments",
      actionPath: "/assignments"
    }
  ];

  const completedCount = requirements.filter(req => req.isComplete).length;
  const progressPercentage = (completedCount / requirements.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-foreground">
            Welcome to Analytics
          </CardTitle>
          <p className="text-muted-foreground">
            Get deep insights into your academic performance and study patterns
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Setup Progress</span>
            <Badge variant={completedCount === requirements.length ? "default" : "secondary"}>
              {completedCount}/{requirements.length} Complete
            </Badge>
          </div>
          <div className="w-full bg-secondary rounded-full h-2 mb-4">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Complete these steps to unlock powerful analytics insights
          </p>
        </CardContent>
      </Card>

      {/* Requirements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {requirements.map((req, index) => {
          const Icon = req.icon;
          const StatusIcon = req.isComplete ? CheckCircle2 : Circle;
          
          return (
            <Card key={index} className={`relative ${req.isComplete ? 'bg-gradient-card' : 'bg-card'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${req.isComplete ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Icon className={`w-5 h-5 ${req.isComplete ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{req.title}</h3>
                    </div>
                  </div>
                  <StatusIcon 
                    className={`w-5 h-5 ${req.isComplete ? 'text-primary' : 'text-muted-foreground'}`}
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-4">
                  {req.description}
                </p>
                {!req.isComplete && (
                  <Button 
                    onClick={() => navigate(req.actionPath)}
                    className="w-full"
                    variant="outline"
                  >
                    {req.actionText}
                  </Button>
                )}
                {req.isComplete && (
                  <div className="flex items-center gap-2 text-primary">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Completed</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Help Section */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-foreground">Need Help Getting Started?</h3>
            <p className="text-sm text-muted-foreground">
              Analytics become more powerful as you add more data. Start with courses and assignments, 
              then track study sessions to see comprehensive insights.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate("/courses")}
              >
                Add First Course
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate("/timer")}
              >
                Start Study Session
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}