import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  AlertCircle,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Keyboard,
  MousePointer
} from "lucide-react";

interface AccessibleAnalyticsProps {
  overallGPA: number;
  semesterProgress: number;
  studyStreak: number;
  criticalAlertsCount: number;
  onNeedAIInsights?: (context: string, data: any) => void;
}

export function AccessibleAnalytics({
  overallGPA,
  semesterProgress,
  studyStreak,
  criticalAlertsCount,
  onNeedAIInsights
}: AccessibleAnalyticsProps) {
  const [screenReaderMode, setScreenReaderMode] = useState(false);
  const [highContrastMode, setHighContrastMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [focusedMetric, setFocusedMetric] = useState<string | null>(null);
  const [keyboardNavIndex, setKeyboardNavIndex] = useState(0);
  
  const metricsRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio context for sound feedback
  useEffect(() => {
    if (typeof window !== 'undefined' && soundEnabled) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        // Create audio context for accessibility sounds
        const audioContext = new AudioContext();
        // Store reference for cleanup
        audioRef.current = new Audio();
      }
    }
  }, [soundEnabled]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!metricsRef.current) return;

      const metrics = metricsRef.current.querySelectorAll('[data-metric]');
      
      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault();
          setKeyboardNavIndex((prev) => (prev + 1) % metrics.length);
          playAccessibilitySound('navigate');
          break;
        case 'Tab':
          if (!event.shiftKey) {
            event.preventDefault();
            setKeyboardNavIndex((prev) => (prev + 1) % metrics.length);
            playAccessibilitySound('navigate');
          } else {
            event.preventDefault();
            setKeyboardNavIndex((prev) => (prev - 1 + metrics.length) % metrics.length);
            playAccessibilitySound('navigate');
          }
          break;
        case 'ArrowLeft':
          event.preventDefault();
          setKeyboardNavIndex((prev) => (prev - 1 + metrics.length) % metrics.length);
          playAccessibilitySound('navigate');
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          const focusedElement = metrics[keyboardNavIndex] as HTMLElement;
          if (focusedElement) {
            focusedElement.click();
            playAccessibilitySound('activate');
          }
          break;
        case 'Escape':
          setFocusedMetric(null);
          playAccessibilitySound('close');
          break;
      }
    };

    if (screenReaderMode) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [screenReaderMode, keyboardNavIndex]);

  // Focus management
  useEffect(() => {
    if (!metricsRef.current) return;
    
    const metrics = metricsRef.current.querySelectorAll('[data-metric]');
    const currentMetric = metrics[keyboardNavIndex] as HTMLElement;
    
    if (currentMetric && screenReaderMode) {
      currentMetric.focus();
    }
  }, [keyboardNavIndex, screenReaderMode]);

  const playAccessibilitySound = (type: 'navigate' | 'activate' | 'alert' | 'close') => {
    if (!soundEnabled) return;
    
    // Create audio feedback for different interactions
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Different frequencies for different actions
      const frequencies = {
        navigate: 800,
        activate: 1000,
        alert: 400,
        close: 600
      };
      
      oscillator.frequency.setValueAtTime(frequencies[type], audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    }
  };

  const getGPADescription = (gpa: number) => {
    if (gpa >= 9.0) return "Outstanding performance";
    if (gpa >= 8.0) return "Excellent performance";
    if (gpa >= 7.0) return "Good performance";
    if (gpa >= 6.0) return "Satisfactory performance";
    return "Performance needs improvement";
  };

  const getProgressDescription = (progress: number) => {
    if (progress >= 90) return "Excellent semester progress";
    if (progress >= 70) return "Good semester progress";
    if (progress >= 50) return "Moderate semester progress";
    return "Semester progress needs attention";
  };

  const getStreakDescription = (streak: number) => {
    if (streak >= 14) return "Outstanding study consistency";
    if (streak >= 7) return "Great study consistency";
    if (streak >= 3) return "Good study consistency";
    return "Inconsistent study pattern";
  };

  const metrics = [
    {
      id: 'gpa',
      title: 'Overall GPA',
      value: overallGPA.toFixed(1),
      description: getGPADescription(overallGPA),
      maxValue: '10.0',
      status: overallGPA >= 8.0 ? 'excellent' : overallGPA >= 7.0 ? 'good' : overallGPA >= 6.0 ? 'satisfactory' : 'needs-improvement',
      icon: overallGPA >= 7.0 ? TrendingUp : TrendingDown,
      ariaLabel: `Overall GPA is ${overallGPA.toFixed(1)} out of 10. ${getGPADescription(overallGPA)}.`
    },
    {
      id: 'progress',
      title: 'Semester Progress', 
      value: `${Math.round(semesterProgress)}%`,
      description: getProgressDescription(semesterProgress),
      maxValue: '100%',
      status: semesterProgress >= 80 ? 'excellent' : semesterProgress >= 60 ? 'good' : semesterProgress >= 40 ? 'satisfactory' : 'needs-improvement',
      icon: semesterProgress >= 70 ? Target : AlertCircle,
      ariaLabel: `Semester progress is ${Math.round(semesterProgress)}%. ${getProgressDescription(semesterProgress)}.`
    },
    {
      id: 'streak',
      title: 'Study Streak',
      value: `${studyStreak}`,
      description: getStreakDescription(studyStreak),
      maxValue: 'days',
      status: studyStreak >= 7 ? 'excellent' : studyStreak >= 3 ? 'good' : studyStreak >= 1 ? 'satisfactory' : 'needs-improvement',
      icon: studyStreak >= 3 ? TrendingUp : AlertCircle,
      ariaLabel: `Study streak is ${studyStreak} days. ${getStreakDescription(studyStreak)}.`
    },
    {
      id: 'alerts',
      title: 'Critical Alerts',
      value: `${criticalAlertsCount}`,
      description: criticalAlertsCount === 0 ? 'No critical issues' : 'Requires immediate attention',
      maxValue: 'items',
      status: criticalAlertsCount === 0 ? 'excellent' : criticalAlertsCount <= 2 ? 'satisfactory' : 'needs-improvement',
      icon: criticalAlertsCount === 0 ? Target : AlertCircle,
      ariaLabel: `${criticalAlertsCount} critical alerts. ${criticalAlertsCount === 0 ? 'No critical issues detected.' : 'Requires immediate attention.'}`
    }
  ];

  const getStatusClasses = (status: string) => {
    const baseClasses = "transition-all duration-200";
    const contrastClasses = highContrastMode ? "border-4" : "border-2";
    
    switch (status) {
      case 'excellent': 
        return `${baseClasses} ${contrastClasses} border-green-500 ${highContrastMode ? 'bg-green-100 text-green-900' : 'bg-green-50 text-green-700'}`;
      case 'good': 
        return `${baseClasses} ${contrastClasses} border-blue-500 ${highContrastMode ? 'bg-blue-100 text-blue-900' : 'bg-blue-50 text-blue-700'}`;
      case 'satisfactory': 
        return `${baseClasses} ${contrastClasses} border-yellow-500 ${highContrastMode ? 'bg-yellow-100 text-yellow-900' : 'bg-yellow-50 text-yellow-700'}`;
      case 'needs-improvement': 
        return `${baseClasses} ${contrastClasses} border-red-500 ${highContrastMode ? 'bg-red-100 text-red-900' : 'bg-red-50 text-red-700'}`;
      default: 
        return `${baseClasses} ${contrastClasses} border-gray-300`;
    }
  };

  return (
    <Card className={`bg-gradient-card ${highContrastMode ? 'bg-white border-black border-4' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={`${highContrastMode ? 'text-black' : ''}`}>
            Accessible Analytics Dashboard
          </CardTitle>
          
          {/* Accessibility Controls */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={screenReaderMode ? "default" : "outline"}
              onClick={() => {
                setScreenReaderMode(!screenReaderMode);
                playAccessibilitySound('activate');
              }}
              aria-label={`${screenReaderMode ? 'Disable' : 'Enable'} screen reader mode`}
            >
              <Keyboard className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              variant={highContrastMode ? "default" : "outline"}
              onClick={() => {
                setHighContrastMode(!highContrastMode);
                playAccessibilitySound('activate');
              }}
              aria-label={`${highContrastMode ? 'Disable' : 'Enable'} high contrast mode`}
            >
              {highContrastMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            
            <Button
              size="sm"
              variant={soundEnabled ? "default" : "outline"}
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playAccessibilitySound('activate');
              }}
              aria-label={`${soundEnabled ? 'Disable' : 'Enable'} sound feedback`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        
        {screenReaderMode && (
          <div className="text-sm text-muted-foreground" role="status" aria-live="polite">
            Screen reader mode active. Use arrow keys or tab to navigate metrics, Enter or Space to interact, Escape to close details.
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div 
          ref={metricsRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          role="grid"
          aria-label="Academic performance metrics"
        >
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            const isKeyboardFocused = screenReaderMode && keyboardNavIndex === index;
            
            return (
              <Card
                key={metric.id}
                data-metric={metric.id}
                className={`
                  cursor-pointer transition-all duration-200 hover:shadow-lg 
                  ${getStatusClasses(metric.status)}
                  ${isKeyboardFocused ? 'ring-4 ring-primary ring-opacity-50' : ''}
                  ${focusedMetric === metric.id ? 'scale-105 shadow-xl' : ''}
                `}
                role="gridcell"
                tabIndex={screenReaderMode ? 0 : -1}
                aria-label={metric.ariaLabel}
                aria-describedby={`metric-${metric.id}-description`}
                onClick={() => {
                  setFocusedMetric(focusedMetric === metric.id ? null : metric.id);
                  onNeedAIInsights?.(
                    `accessibility_${metric.id}`,
                    { metric: metric.id, value: metric.value, status: metric.status }
                  );
                  playAccessibilitySound('activate');
                }}
                onFocus={() => {
                  if (screenReaderMode) {
                    setFocusedMetric(metric.id);
                    playAccessibilitySound('navigate');
                  }
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                    <Badge 
                      variant={metric.status === 'excellent' ? 'default' : 
                              metric.status === 'good' ? 'secondary' : 
                              metric.status === 'satisfactory' ? 'outline' : 'destructive'}
                      className={highContrastMode ? 'font-bold' : ''}
                    >
                      {metric.status.replace('-', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className={`font-medium text-sm ${highContrastMode ? 'font-bold' : ''}`}>
                      {metric.title}
                    </h3>
                    
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-bold ${highContrastMode ? 'text-black' : ''}`}>
                        {metric.value}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {metric.maxValue}
                      </span>
                    </div>
                    
                    <p 
                      id={`metric-${metric.id}-description`}
                      className={`text-xs ${highContrastMode ? 'text-black font-medium' : 'text-muted-foreground'}`}
                    >
                      {metric.description}
                    </p>
                    
                    {/* Visual progress indicator for screen readers */}
                    {(metric.id === 'gpa' || metric.id === 'progress') && (
                      <Progress
                        value={metric.id === 'gpa' ? (overallGPA / 10) * 100 : semesterProgress}
                        className={`h-2 ${highContrastMode ? 'border border-black' : ''}`}
                        aria-label={`Progress: ${metric.id === 'gpa' ? Math.round((overallGPA / 10) * 100) : Math.round(semesterProgress)}%`}
                      />
                    )}
                  </div>
                  
                  {focusedMetric === metric.id && (
                    <div className="mt-3 pt-3 border-t" role="region" aria-label="Detailed metric information">
                      <p className="text-xs text-muted-foreground mb-2">
                        Click for AI-powered insights and improvement suggestions for this metric.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNeedAIInsights?.(
                            `detailed_${metric.id}_analysis`,
                            { 
                              metric: metric.id, 
                              value: metric.value, 
                              status: metric.status,
                              isAccessibilityMode: true
                            }
                          );
                          playAccessibilitySound('activate');
                        }}
                        className="w-full"
                        aria-label={`Get AI insights for ${metric.title}`}
                      >
                        Get AI Insights
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {/* Keyboard instructions */}
        {screenReaderMode && (
          <div className="mt-6 p-4 bg-muted rounded-lg" role="complementary" aria-label="Keyboard navigation help">
            <h4 className="font-medium mb-2">Keyboard Navigation:</h4>
            <ul className="text-sm space-y-1" role="list">
              <li>• <kbd className="px-2 py-1 bg-background rounded">Tab</kbd> or <kbd className="px-2 py-1 bg-background rounded">→</kbd>: Next metric</li>
              <li>• <kbd className="px-2 py-1 bg-background rounded">Shift+Tab</kbd> or <kbd className="px-2 py-1 bg-background rounded">←</kbd>: Previous metric</li>
              <li>• <kbd className="px-2 py-1 bg-background rounded">Enter</kbd> or <kbd className="px-2 py-1 bg-background rounded">Space</kbd>: Select/interact</li>
              <li>• <kbd className="px-2 py-1 bg-background rounded">Escape</kbd>: Close details</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}