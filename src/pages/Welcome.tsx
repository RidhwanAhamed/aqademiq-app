import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, Brain, ArrowRight, BookOpen, Calendar, BarChart3 } from "lucide-react";

export default function Welcome() {
  const navigate = useNavigate();

  const features = [
    {
      icon: BookOpen,
      title: "Smart Organization",
      description: "Keep track of all your assignments, exams, and courses in one place"
    },
    {
      icon: Calendar,
      title: "Intelligent Scheduling",
      description: "AI-powered scheduling that adapts to your academic calendar"
    },
    {
      icon: BarChart3,
      title: "Progress Analytics",
      description: "Track your academic progress with detailed insights and GPA calculation"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-card/50 backdrop-blur-sm border-border/50 shadow-elevated">
        <CardContent className="p-8 text-center space-y-8">
          {/* Logo and Branding */}
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-primary">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <GraduationCap className="h-12 w-12 text-primary" />
            </div>
            
            <div className="space-y-3">
              <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Aqademiq
              </h1>
              <p className="text-xl text-muted-foreground font-medium">
                Your intelligent academic planner and productivity companion
              </p>
              <p className="text-muted-foreground max-w-md mx-auto">
                Organize your studies with AI-powered insights and smart scheduling. 
                Meet Ada, your personal academic assistant.
              </p>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 my-8">
            {features.map((feature, index) => (
              <div key={index} className="space-y-3 p-4 rounded-lg bg-muted/50">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm">{feature.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Call to Action */}
          <div className="space-y-4">
            <Button 
              onClick={() => navigate('/onboarding')}
              size="lg"
              className="w-full bg-gradient-primary hover:opacity-90 transition-opacity shadow-primary"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            
            <p className="text-xs text-muted-foreground">
              Already have an account?{" "}
              <button 
                onClick={() => navigate('/auth')}
                className="text-primary hover:underline font-medium"
              >
                Sign In
              </button>
            </p>
          </div>

          {/* Privacy Statement */}
          <p className="text-xs text-muted-foreground opacity-80">
            We respect your privacy. Your academic data is secure and never shared.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}