import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  Menu,
  Settings2,
  RotateCcw,
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
  // New props for mobile integration
  onHistoryToggle?: () => void;
  isHistoryOpen?: boolean;
}

export const AdaChatHeader = memo(function AdaChatHeader({
  messageCount,
  messageLimit,
  isFullScreen,
  showAccessibility,
  accessibilitySettings,
  onFullScreenToggle,
  onAccessibilityToggle,
  onAccessibilityChange,
  onHistoryToggle,
  isHistoryOpen
}: AdaChatHeaderProps) {

  return (
    <div className="flex-shrink-0">
      {/* ChatGPT-style minimal header */}
      <div className={cn(
        "flex items-center justify-between",
        "px-3 py-2 sm:px-4 sm:py-3",
        "bg-background/80 backdrop-blur-sm",
        "border-b border-border/50"
      )}>
        {/* Left: Menu + Home + Title */}
        <div className="flex items-center gap-2">
          {/* History toggle - hamburger style like ChatGPT */}
          {onHistoryToggle && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onHistoryToggle}
              className={cn(
                "h-10 w-10 rounded-full touch-target",
                "bg-muted/50 hover:bg-muted",
                isFullScreen ? "" : "lg:hidden"
              )}
              aria-expanded={isHistoryOpen}
              aria-label={isHistoryOpen ? "Close sidebar" : "Open sidebar"}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}

          
          {/* Title pill like ChatGPT */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50">
            <span className="font-medium text-sm">Ada</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-muted">
              Beta
            </Badge>
          </div>
        </div>
        
        {/* Right: Settings + New chat */}
        <div className="flex items-center gap-1">
          {/* New chat button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.location.reload()}
            className="h-10 w-10 rounded-full touch-target bg-muted/50 hover:bg-muted"
            aria-label="New chat"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          {/* Settings - Sheet on mobile */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full touch-target bg-muted/50 hover:bg-muted"
                aria-label="Settings"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-2xl">
              <SheetHeader className="pb-4">
                <SheetTitle>Settings</SheetTitle>
              </SheetHeader>
              <div className="space-y-6 pb-6">
                {/* Message counter */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">Messages used</span>
                  <span className="text-sm text-muted-foreground">{messageCount} / {messageLimit}</span>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Accessibility</h4>
                  <AccessibilityControls 
                    settings={accessibilitySettings} 
                    onChange={onAccessibilityChange} 
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop Accessibility Panel - kept for non-mobile */}
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
    <div className="space-y-4">
      <div className="space-y-3">
        <Label htmlFor="font-size" className="text-xs sm:text-sm font-medium">Font Size: {settings.fontSize}px</Label>
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
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between py-2">
          <Label htmlFor="high-contrast" className="text-xs sm:text-sm font-medium">High Contrast</Label>
          <Switch
            id="high-contrast"
            checked={settings.highContrast}
            onCheckedChange={(checked) => 
              onChange({ ...settings, highContrast: checked })
            }
          />
        </div>
        
        <div className="flex items-center justify-between py-2">
          <Label htmlFor="sound-enabled" className="text-xs sm:text-sm font-medium">Sound Effects</Label>
          <Switch
            id="sound-enabled"
            checked={settings.soundEnabled}
            onCheckedChange={(checked) => 
              onChange({ ...settings, soundEnabled: checked })
            }
          />
        </div>
        
        <div className="flex items-center justify-between py-2">
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