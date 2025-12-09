import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  Bot,
  Maximize2,
  Minimize2,
  Settings2,
  X
} from 'lucide-react';

interface AccessibilitySettings {
  fontSize: number;
  highContrast: boolean;
  soundEnabled: boolean;
  focusOutlines: boolean;
}

interface AdaChatHeaderProps {
  messageCount: number;
  messageLimit: number;
  isFullScreen: boolean;
  showAccessibility: boolean;
  accessibilitySettings: AccessibilitySettings;
  onFullScreenToggle?: () => void;
  onAccessibilityToggle: () => void;
  onAccessibilityChange: (settings: AccessibilitySettings) => void;
}

export const AdaChatHeader = memo(function AdaChatHeader({
  messageCount,
  messageLimit,
  isFullScreen,
  showAccessibility,
  accessibilitySettings,
  onFullScreenToggle,
  onAccessibilityToggle,
  onAccessibilityChange
}: AdaChatHeaderProps) {
  // Calculate message usage dots (max 6 dots)
  const totalDots = 6;
  const filledDots = Math.min(Math.ceil((messageCount / messageLimit) * totalDots), totalDots);

  return (
    <div className="flex-shrink-0">
      {/* Header - Compact on mobile */}
      <div className={cn(
        "border-b bg-gradient-to-r from-primary/8 via-primary/5 to-secondary/8",
        "px-3 py-2 sm:px-6 sm:py-3"
      )}>
        <div className="flex items-center justify-between gap-2">
          {/* Left: Avatar + Name */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="relative flex-shrink-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">Ada</h3>
                <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0 h-4 sm:h-5">Beta</Badge>
              </div>
              {/* Subtitle hidden on mobile */}
              <p className="hidden sm:block text-xs text-muted-foreground">Ready to help organize your academic life</p>
            </div>
          </div>
          
          {/* Right: Message dots + Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Message usage dots - mobile compact */}
            <div className="flex items-center gap-0.5" aria-label={`${messageCount} of ${messageLimit} messages used`}>
              {Array.from({ length: totalDots }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-colors",
                    i < filledDots ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                />
              ))}
              <span className="hidden sm:inline text-xs text-muted-foreground ml-1.5">
                {messageCount}/{messageLimit}
              </span>
            </div>

            {/* Fullscreen button - desktop only */}
            {onFullScreenToggle && (
              <Button
                size="icon"
                variant="ghost"
                onClick={onFullScreenToggle}
                className="hidden sm:flex h-8 w-8 touch-target"
                aria-label={isFullScreen ? "Exit full screen" : "Enter full screen"}
              >
                {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            )}

            {/* Accessibility - Sheet on mobile, panel on desktop */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 sm:h-8 sm:w-8 touch-target sm:hidden"
                  aria-label="Accessibility settings"
                >
                  <Settings2 className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-auto max-h-[60vh]">
                <SheetHeader>
                  <SheetTitle>Accessibility Settings</SheetTitle>
                </SheetHeader>
                <div className="py-4 space-y-6">
                  <AccessibilityControls 
                    settings={accessibilitySettings} 
                    onChange={onAccessibilityChange} 
                  />
                </div>
              </SheetContent>
            </Sheet>

            {/* Desktop accessibility toggle */}
            <Button
              size="icon"
              variant="ghost"
              onClick={onAccessibilityToggle}
              className="hidden sm:flex h-8 w-8"
              aria-label="Accessibility settings"
            >
              <Settings2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop Accessibility Panel */}
      {showAccessibility && (
        <div className="hidden sm:block px-4 sm:px-6 py-4 border-b bg-muted/30 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Accessibility Settings</h4>
            <Button
              size="sm"
              variant="ghost"
              onClick={onAccessibilityToggle}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <AccessibilityControls 
            settings={accessibilitySettings} 
            onChange={onAccessibilityChange} 
          />
        </div>
      )}
    </div>
  );
});

// Extracted accessibility controls for reuse
function AccessibilityControls({ 
  settings, 
  onChange 
}: { 
  settings: AccessibilitySettings; 
  onChange: (settings: AccessibilitySettings) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
      <div className="space-y-3">
        <Label htmlFor="font-size" className="text-xs sm:text-sm font-medium">Font Size</Label>
        <Slider
          id="font-size"
          min={12}
          max={24}
          step={2}
          value={[settings.fontSize]}
          onValueChange={(value) => 
            onChange({ ...settings, fontSize: value[0] })
          }
          className="w-full"
        />
        <span className="text-xs text-muted-foreground">{settings.fontSize}px</span>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="high-contrast" className="text-xs sm:text-sm font-medium">High Contrast</Label>
          <Switch
            id="high-contrast"
            checked={settings.highContrast}
            onCheckedChange={(checked) => 
              onChange({ ...settings, highContrast: checked })
            }
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="sound-enabled" className="text-xs sm:text-sm font-medium">Sound</Label>
          <Switch
            id="sound-enabled"
            checked={settings.soundEnabled}
            onCheckedChange={(checked) => 
              onChange({ ...settings, soundEnabled: checked })
            }
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="focus-outlines" className="text-xs sm:text-sm font-medium">Focus Outlines</Label>
          <Switch
            id="focus-outlines"
            checked={settings.focusOutlines}
            onCheckedChange={(checked) => 
              onChange({ ...settings, focusOutlines: checked })
            }
          />
        </div>
      </div>
    </div>
  );
}