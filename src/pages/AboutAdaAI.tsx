import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Upload, Calendar, MessageSquare, Accessibility, Smartphone, Globe, Sparkles, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AboutAdaAI = () => {
  const navigate = useNavigate();

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
      title: "Interactive Chat Interface",
      description: "Drag-and-drop file uploads, message reactions, copy functionality, and mobile-optimized experience.",
      color: "text-green-600",
      bgColor: "bg-green-50",
      darkBgColor: "dark:bg-green-950/30"
    },
    {
      icon: Accessibility,
      title: "Accessibility Features",
      description: "Font scaling, high contrast mode, sound notifications, and full keyboard navigation support.",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      darkBgColor: "dark:bg-orange-950/30"
    }
  ];

  const quickTips = [
    {
      emoji: "📱",
      title: "Mobile-First Design",
      description: "Optimized for touch interactions with responsive layouts, larger touch targets, and intuitive gestures.",
      accent: "border-l-blue-500"
    },
    {
      emoji: "🎯",
      title: "Quick Actions",
      description: "Use message reactions, copy buttons, and quick suggestions for faster interactions with Ada.",
      accent: "border-l-purple-500"
    },
    {
      emoji: "🔊",
      title: "Audio Feedback",
      description: "Enable sound notifications to get audio cues when Ada responds or important events occur.",
      accent: "border-l-green-500"
    },
    {
      emoji: "⌨️",
      title: "Keyboard Navigation",
      description: "Full keyboard support with Enter to send, Tab navigation, and screen reader compatibility.",
      accent: "border-l-orange-500"
    }
  ];

  const accessibilityFeatures = [
    {
      emoji: "🔍",
      title: "Font Scaling",
      description: "Adjust text size from 12px to 24px for better readability and visual comfort."
    },
    {
      emoji: "⚫",
      title: "High Contrast Mode",
      description: "Improved visual contrast for users with visual impairments or in bright environments."
    },
    {
      emoji: "🔊",
      title: "Sound Notifications",
      description: "Audio feedback for new messages and important interactions."
    },
    {
      emoji: "🎯",
      title: "Focus Outlines",
      description: "Clear visual indicators for keyboard navigation and screen reader users."
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
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/ada')}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Chat
        </Button>

        {/* Hero Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-2xl blur-lg opacity-25 scale-110"></div>
              <div className="relative p-4 bg-gradient-to-br from-primary/90 to-secondary/90 rounded-2xl">
                <Bot className="w-12 h-12 text-white" />
              </div>
            </div>
            <div className="text-left">
              <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-br from-primary via-primary to-secondary bg-clip-text text-transparent">
                Ada AI Wizard
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Beta
                </Badge>
                <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
                  <Accessibility className="w-3 h-3 mr-1" />
                  Accessible
                </Badge>
                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800">
                  <Smartphone className="w-3 h-3 mr-1" />
                  Mobile-First
                </Badge>
              </div>
            </div>
          </div>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Experience the next generation of academic AI assistance with accessibility features, 
            mobile-optimized interface, and intelligent interactions designed for everyone.
          </p>
        </div>

        {/* AI Features */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-primary" />
            AI Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="bg-gradient-to-br from-card to-card/80 border-2 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${feature.bgColor} ${feature.darkBgColor}`}>
                      <feature.icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Accessibility Features */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
            <Accessibility className="w-7 h-7 text-primary" />
            Accessibility Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accessibilityFeatures.map((feature, index) => (
              <Card key={index} className="bg-gradient-to-br from-card to-card/80 shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{feature.emoji}</span>
                    <div>
                      <h4 className="font-semibold text-base mb-1">{feature.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Usage Tips */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
            💡 Usage Tips & Tricks
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickTips.map((tip, index) => (
              <Card key={index} className={`bg-gradient-to-br from-card to-card/80 shadow-md border-l-4 ${tip.accent}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{tip.emoji}</span>
                    <div>
                      <h4 className="font-semibold text-base mb-1">{tip.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{tip.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* File Support */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
            📎 Drag & Drop Support
          </h2>
          <Card className="bg-gradient-to-br from-card to-card/80 shadow-lg">
            <CardHeader>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                  💡 New: Drag files directly onto the chat area for instant upload!
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {fileTypes.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{file.icon}</span>
                      <div>
                        <span className="font-semibold text-sm block">{file.type}</span>
                        <span className="text-xs text-muted-foreground">{file.desc}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-600 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
                      ✓
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Status Footer */}
        <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-lg font-medium text-green-700 dark:text-green-400">AI Ready</span>
            </div>
            <div className="flex items-center justify-center gap-6 mb-4">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Universal Access</span>
              </div>
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Mobile Optimized</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              Experience next-generation AI assistance with accessibility-first design and mobile interactions.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AboutAdaAI;
