import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Store, 
  Sparkles, 
  Users, 
  Brain, 
  Calendar, 
  BookOpen,
  Shield,
  Star,
  ChevronDown,
  ChevronUp,
  Check,
  Mail,
  ArrowRight
} from "lucide-react";
import { EarlyAccessForm } from "./EarlyAccessForm";
import { toast } from "sonner";

export function MarketplaceTeaser() {
  const [showDetails, setShowDetails] = useState(false);

  const benefits = [
    {
      icon: Brain,
      title: "Smart Tutor Matching",
      description: "AI analyzes your schedule and learning style to connect you with the perfect tutor"
    },
    {
      icon: Calendar,
      title: "Seamless Integration",
      description: "Syncs with your academic calendar and deadlines for effortless scheduling"
    },
    {
      icon: BookOpen,
      title: "Curated Resources",
      description: "Task-aware recommendations for tools and materials tailored to your needs"
    },
    {
      icon: Users,
      title: "Study Communities",
      description: "Algorithm-matched collaborative groups based on your courses and goals"
    }
  ];

  const milestones = [
    { label: "Concept & Research", completed: true },
    { label: "Platform Development", completed: true },
    { label: "AI Integration", completed: false, current: true },
    { label: "Partner Onboarding", completed: false },
    { label: "Beta Testing", completed: false },
    { label: "Public Launch", completed: false }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-marketplace/5 via-background to-primary/5">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="relative max-w-4xl mx-auto px-4 py-12 sm:py-16 text-center">
          <Badge className="bg-marketplace/10 text-marketplace border-marketplace/20 mb-6 text-sm px-4 py-2">
            Launching Early 2026
          </Badge>
          
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-marketplace flex items-center justify-center shadow-marketplace">
              <Store className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-marketplace via-primary to-marketplace bg-clip-text text-transparent">
              Transform Your Academic Journey
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              The first AI-powered academic marketplace designed for students, by students. 
              Connect with tutors, find resources, and build communities that adapt to your learning style.
            </p>
          </div>

          {/* Mock Interface Preview */}
          <div className="relative max-w-3xl mx-auto mb-12">
            <div className="bg-card rounded-xl shadow-2xl border p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-marketplace/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-marketplace/20 flex items-center justify-center">
                      <Brain className="w-5 h-5 text-marketplace" />
                    </div>
                    <div>
                      <div className="font-medium">AI Tutor Match Found!</div>
                      <div className="text-sm text-muted-foreground">Sarah M. - Advanced Calculus</div>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700">98% Match</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-sm font-medium">Next Session</div>
                    <div className="text-xs text-muted-foreground">Tomorrow 3:00 PM</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-sm font-medium">Study Groups</div>
                    <div className="text-xs text-muted-foreground">3 matches found</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Why Students Love Our Marketplace</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            More than just a platform - it's your personalized academic ecosystem
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {benefits.map((benefit, index) => (
            <Card key={index} className="bg-gradient-card shadow-card hover:shadow-card-hover transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-marketplace/10 flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-6 h-6 text-marketplace" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                    <p className="text-muted-foreground">{benefit.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Social Proof Section */}
      <div className="bg-muted/30 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div>
              <div className="text-3xl font-bold text-marketplace mb-2">500+</div>
              <div className="text-muted-foreground">Students on early access list</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-marketplace mb-2">20+</div>
              <div className="text-muted-foreground">Verified academic partners</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-marketplace mb-2">50+</div>
              <div className="text-muted-foreground">Universities represented</div>
            </div>
          </div>

          {/* Testimonial Preview */}
          <Card className="max-w-2xl mx-auto bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-1 mb-4 justify-center">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current text-warning" />
                ))}
              </div>
              <blockquote className="text-lg italic mb-4">
                "Finally, a platform that understands how students actually learn. 
                The AI matching is incredible!"
              </blockquote>
              <div className="text-sm text-muted-foreground">
                — Emily R., Computer Science Student
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Early Access Form Section */}
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">Get Early Access</h2>
          <p className="text-muted-foreground text-lg">
            Be among the first to experience the future of academic collaboration
          </p>
        </div>
        
        <EarlyAccessForm />
      </div>

      {/* Timeline Section */}
      <div className="bg-muted/30 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Development Timeline</h2>
            <p className="text-muted-foreground text-lg">
              Track our progress toward launch
            </p>
          </div>

          <div className="space-y-4">
            {milestones.map((milestone, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  milestone.completed 
                    ? 'bg-green-500 text-white' 
                    : milestone.current 
                    ? 'bg-marketplace text-white' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {milestone.completed ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-current" />
                  )}
                </div>
                <div className="flex-1">
                  <div className={`font-medium ${
                    milestone.current ? 'text-marketplace' : 
                    milestone.completed ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {milestone.label}
                    {milestone.current && (
                      <Badge className="ml-2 bg-marketplace/10 text-marketplace border-marketplace/20 text-xs">
                        In Progress
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Badge className="bg-marketplace/10 text-marketplace border-marketplace/20 text-lg px-6 py-2">
              Expected Launch: Early 2026
            </Badge>
          </div>
        </div>
      </div>

      {/* Learn More Section */}
      <Collapsible open={showDetails} onOpenChange={setShowDetails}>
        <div className="max-w-4xl mx-auto px-4 py-16">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full text-lg py-6 text-marketplace border-marketplace/20 hover:bg-marketplace/5">
              Learn More About Our Features
              {showDetails ? (
                <ChevronUp className="w-5 h-5 ml-2" />
              ) : (
                <ChevronDown className="w-5 h-5 ml-2" />
              )}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="bg-gradient-card shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-marketplace" />
                    Security & Privacy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      End-to-end encrypted messaging
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      Verified tutor backgrounds
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      Secure payment processing
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      FERPA compliant
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-gradient-card shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-marketplace" />
                    AI-Powered Features
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      Intelligent scheduling optimization
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      Personalized learning recommendations
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      Automated progress tracking
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      Smart group formation
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}