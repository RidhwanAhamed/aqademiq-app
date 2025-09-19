import { AdaAIChat } from "@/components/AdaAIChat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Bot, Upload, MessageSquare, Calendar, Zap, Sparkles, FileText, Users, Lightbulb, ChevronRight, ChevronDown, RefreshCw, Accessibility, Smartphone, Globe } from "lucide-react";
import { useState } from "react";

const Ada = () => {
  const [capabilitiesOpen, setCapabilitiesOpen] = useState(true);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [formatsOpen, setFormatsOpen] = useState(false);
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const handleRefreshChat = () => {
    // Clear all chat messages and reset
    setRefreshKey(prev => prev + 1);
  };

  const handleFullScreenToggle = () => {
    setIsFullScreen(prev => !prev);
  };

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
    <>
      {/* Full-screen Ada AI Chat Overlay */}
      {isFullScreen && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
          <div className="h-full flex flex-col">
            <AdaAIChat 
              key={refreshKey} 
              isFullScreen={isFullScreen}
              onFullScreenToggle={handleFullScreenToggle}
            />
          </div>
        </div>
      )}

      {/* Normal Layout */}
      {!isFullScreen && (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 pb-16 sm:pb-0">
          <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 max-w-7xl">
            {/* Enhanced Hero Header */}
            <div className="text-center mb-6 sm:mb-8 lg:mb-12">
              <div className="inline-flex flex-col sm:flex-row items-center gap-3 mb-4 sm:mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-2xl blur-lg opacity-25 scale-110"></div>
                  <div className="relative p-3 sm:p-4 bg-gradient-to-br from-primary/90 to-secondary/90 rounded-2xl">
                    <Bot className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                  </div>
                </div>
                <div className="text-center sm:text-left">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-br from-primary via-primary to-secondary bg-clip-text text-transparent">
                    Ada AI Wizard
                  </h1>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1 sm:gap-2 mt-1">
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Beta
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-600 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
                      <Accessibility className="w-3 h-3 mr-1" />
                      Accessible
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800">
                      <Smartphone className="w-3 h-3 mr-1" />
                      Mobile-First
                    </Badge>
                  </div>
                </div>
              </div>
              
              <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">
                Experience the next generation of academic AI assistance with accessibility features, 
                mobile-optimized interface, and intelligent interactions designed for everyone.
              </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
              {/* Enhanced Main Chat Interface */}
              <div className="xl:col-span-8">
                <Card className="h-[500px] sm:h-[600px] lg:h-[700px] flex flex-col bg-gradient-to-br from-card to-card/80 border-2 shadow-2xl overflow-hidden">
                  <CardHeader className="pb-3 border-b bg-gradient-to-r from-primary/5 to-secondary/5">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <div className="relative">
                          <Bot className="w-5 h-5 text-primary" />
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        </div>
                        Ada AI Chat
                        <Badge variant="secondary" className="text-xs">v2.0</Badge>
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRefreshChat}
                          className="h-8 w-8 p-0"
                          aria-label="Refresh chat"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <div className="flex-1 overflow-hidden">
                    <AdaAIChat 
                      key={refreshKey} 
                      isFullScreen={isFullScreen}
                      onFullScreenToggle={handleFullScreenToggle}
                    />
                  </div>
                </Card>
              </div>

              {/* Enhanced Sidebar with New Sections */}
              <div className="xl:col-span-4 space-y-4 sm:space-y-6">
                {/* Enhanced Features Overview */}
                <Card className="bg-gradient-to-br from-card to-card/80 border-0 shadow-lg">
                  <Collapsible open={capabilitiesOpen} onOpenChange={setCapabilitiesOpen}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="pb-4 cursor-pointer hover:bg-muted/20 transition-colors rounded-t-lg">
                        <CardTitle className="flex items-center justify-between text-lg">
                          <div className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-primary" />
                            AI Features
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

                {/* New Accessibility Features */}
                <Card className="bg-gradient-to-br from-card to-card/80 border-0 shadow-lg">
                  <Collapsible open={accessibilityOpen} onOpenChange={setAccessibilityOpen}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="pb-4 cursor-pointer hover:bg-muted/20 transition-colors rounded-t-lg">
                        <CardTitle className="flex items-center justify-between text-lg">
                          <div className="flex items-center gap-2">
                            <Accessibility className="w-5 h-5 text-primary" />
                            Accessibility Features
                          </div>
                          {accessibilityOpen ? 
                            <ChevronDown className="w-4 h-4 text-muted-foreground" /> : 
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          }
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="space-y-4 pt-0">
                        {accessibilityFeatures.map((feature, index) => (
                          <div key={index} className="p-3 bg-gradient-to-r from-muted/30 to-muted/10 rounded-xl border-l-4 border-l-primary/50 hover:shadow-md transition-all duration-200">
                            <div className="flex items-start gap-3">
                              <span className="text-xl">{feature.emoji}</span>
                              <div>
                                <h4 className="font-semibold text-sm text-foreground mb-1">{feature.title}</h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>

                {/* Enhanced Tips */}
                <Card className="bg-gradient-to-br from-card to-card/80 border-0 shadow-lg">
                  <Collapsible open={tipsOpen} onOpenChange={setTipsOpen}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="pb-4 cursor-pointer hover:bg-muted/20 transition-colors rounded-t-lg">
                        <CardTitle className="flex items-center justify-between text-lg">
                          <div className="flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-primary" />
                            Usage Tips & Tricks
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

                {/* File Support - Enhanced */}
                <Card className="bg-gradient-to-br from-card to-card/80 border-0 shadow-lg">
                  <Collapsible open={formatsOpen} onOpenChange={setFormatsOpen}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="pb-4 cursor-pointer hover:bg-muted/20 transition-colors rounded-t-lg">
                        <CardTitle className="flex items-center justify-between text-lg">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            Drag & Drop Support
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
                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                            💡 New: Drag files directly onto the chat area for instant upload!
                          </p>
                        </div>
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
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-600 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
                                Supported
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>

                {/* Enhanced Status & Stats */}
                <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20 shadow-lg">
                  <CardContent className="p-6 text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-green-700 dark:text-green-400">AI Ready</span>
                    </div>
                    <div className="flex items-center justify-center gap-4 mb-3">
                      <div className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-blue-500" />
                        <span className="text-xs text-muted-foreground">Universal Access</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Smartphone className="w-3 h-3 text-green-500" />
                        <span className="text-xs text-muted-foreground">Mobile Optimized</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Experience next-generation AI assistance with accessibility-first design and mobile interactions.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Ada;