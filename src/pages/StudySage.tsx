import { StudySageChat } from "@/components/StudySageChat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Bot, Upload, MessageSquare, Calendar, Zap, Sparkles, FileText, Users, Lightbulb, ChevronRight, ChevronDown } from "lucide-react";
import { useState } from "react";

const StudySage = () => {
  const [capabilitiesOpen, setCapabilitiesOpen] = useState(true);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [formatsOpen, setFormatsOpen] = useState(false);
  const features = [
    {
      icon: Upload,
      title: "Intelligent File Analysis",
      description: "Upload syllabi, timetables, or academic schedules for instant AI-powered parsing and organization.",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      darkBgColor: "dark:bg-blue-950/30"
    },
    {
      icon: Calendar,
      title: "Smart Conflict Detection",
      description: "Automatically identify scheduling conflicts and get intelligent suggestions for resolution.",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      darkBgColor: "dark:bg-purple-950/30"
    },
    {
      icon: MessageSquare,
      title: "Conversational Planning",
      description: "Chat naturally about your academic goals and receive personalized study plans and recommendations.",
      color: "text-green-600",
      bgColor: "bg-green-50",
      darkBgColor: "dark:bg-green-950/30"
    },
    {
      icon: Zap,
      title: "Automated Organization",
      description: "Transform chaotic schedules into beautifully organized academic calendars with recurring task automation.",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      darkBgColor: "dark:bg-orange-950/30"
    }
  ];

  const quickTips = [
    {
      emoji: "📄",
      title: "Upload & Parse",
      description: "I can read PDF syllabi, image screenshots of timetables, and text documents to extract your schedule automatically.",
      accent: "border-l-blue-500"
    },
    {
      emoji: "🧠",
      title: "Smart Conversations",
      description: "Ask me about creating study schedules, managing deadlines, optimizing your time, or resolving schedule conflicts.",
      accent: "border-l-purple-500"
    },
    {
      emoji: "⚡",
      title: "Instant Integration",
      description: "I'll automatically create courses, assignments, and exams from your documents, then sync them to your calendar.",
      accent: "border-l-green-500"
    }
  ];

  const fileTypes = [
    { type: "PDF", desc: "Syllabi & Documents", icon: "📄" },
    { type: "JPG", desc: "Schedule Screenshots", icon: "📸" },
    { type: "PNG", desc: "Timetable Images", icon: "🖼️" },
    { type: "TXT", desc: "Plain Text Files", icon: "📝" },
    { type: "DOC", desc: "Word Documents", icon: "📋" },
    { type: "DOCX", desc: "Modern Word Files", icon: "📄" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-2xl blur-lg opacity-25 scale-110"></div>
              <div className="relative p-4 bg-gradient-to-br from-primary/90 to-secondary/90 rounded-2xl">
                <Bot className="w-10 h-10 text-white" />
              </div>
            </div>
            <div className="text-left">
              <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-br from-primary via-primary to-secondary bg-clip-text text-transparent">
                StudySage
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs font-medium">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI-Powered
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Academic Assistant
                </Badge>
              </div>
            </div>
          </div>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Transform chaos into clarity with intelligent schedule management, 
            automated conflict detection, and personalized academic planning.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Main Chat Interface */}
          <div className="xl:col-span-8">
            <Card className="h-[700px] flex flex-col bg-gradient-to-br from-card to-card/80 border-2 shadow-2xl">
              <StudySageChat />
            </Card>
          </div>

          {/* Enhanced Sidebar */}
          <div className="xl:col-span-4 space-y-6">
            {/* Features Overview */}
            <Card className="bg-gradient-to-br from-card to-card/80 border-0 shadow-lg">
              <Collapsible open={capabilitiesOpen} onOpenChange={setCapabilitiesOpen}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-4 cursor-pointer hover:bg-muted/20 transition-colors rounded-t-lg">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-primary" />
                        Capabilities
                      </div>
                      {capabilitiesOpen ? 
                        <ChevronDown className="w-4 h-4 text-muted-foreground" /> : 
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      }
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    {features.map((feature, index) => (
                      <div key={index} className="group cursor-pointer">
                        <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-all duration-200">
                          <div className={`p-2 rounded-lg ${feature.bgColor} ${feature.darkBgColor} group-hover:scale-110 transition-transform duration-200`}>
                            <feature.icon className={`w-4 h-4 ${feature.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm leading-tight">{feature.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Interactive Tips */}
            <Card className="bg-gradient-to-br from-card to-card/80 border-0 shadow-lg">
              <Collapsible open={tipsOpen} onOpenChange={setTipsOpen}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-4 cursor-pointer hover:bg-muted/20 transition-colors rounded-t-lg">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-primary" />
                        How to Get Started
                      </div>
                      {tipsOpen ? 
                        <ChevronDown className="w-4 h-4 text-muted-foreground" /> : 
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      }
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    {quickTips.map((tip, index) => (
                      <div key={index} className={`p-4 bg-gradient-to-r from-muted/30 to-muted/10 rounded-xl border-l-4 ${tip.accent} hover:shadow-md transition-all duration-200`}>
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{tip.emoji}</span>
                          <div>
                            <h4 className="font-semibold text-sm text-foreground mb-1">{tip.title}</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">{tip.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* File Support */}
            <Card className="bg-gradient-to-br from-card to-card/80 border-0 shadow-lg">
              <Collapsible open={formatsOpen} onOpenChange={setFormatsOpen}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-4 cursor-pointer hover:bg-muted/20 transition-colors rounded-t-lg">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        Supported Formats
                      </div>
                      {formatsOpen ? 
                        <ChevronDown className="w-4 h-4 text-muted-foreground" /> : 
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      }
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 gap-3">
                      {fileTypes.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors duration-200">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{file.icon}</span>
                            <div>
                              <span className="font-semibold text-sm">{file.type}</span>
                              <p className="text-xs text-muted-foreground">{file.desc}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Supported
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Status & Stats */}
            <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20 shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">AI Ready</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Connected to advanced language models for intelligent schedule parsing and academic assistance.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudySage;