import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Bot,
  Maximize2,
  Minimize2,
  Accessibility,
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
  return (
    <div className="flex-shrink-0">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b bg-gradient-to-r from-primary/8 via-primary/5 to-secondary/8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                Ada AI Assistant
                <Badge variant="secondary" className="text-xs">Beta</Badge>
              </h3>
              <p className="text-xs text-muted-foreground">Ready to help organize your academic life</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {onFullScreenToggle && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onFullScreenToggle}
                className="h-8 w-8 p-0"
                aria-label={isFullScreen ? "Exit full screen" : "Enter full screen"}
              >
                {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={onAccessibilityToggle}
              className="h-8 w-8 p-0"
              aria-label="Accessibility settings"
            >
              <Accessibility className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Message limit indicator */}
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Messages: {messageCount}/{messageLimit}
          </span>
          <div className="w-32 bg-muted rounded-full h-1">
            <div 
              className="bg-primary h-1 rounded-full transition-all duration-300"
              style={{ width: `${(messageCount / messageLimit) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Accessibility Panel */}
      {showAccessibility && (
        <div className="px-4 sm:px-6 py-4 border-b bg-muted/30 space-y-4">
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
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="font-size" className="text-xs font-medium">Font Size</Label>
              <Slider
                id="font-size"
                min={12}
                max={24}
                step={2}
                value={[accessibilitySettings.fontSize]}
                onValueChange={(value) => 
                  onAccessibilityChange({ ...accessibilitySettings, fontSize: value[0] })
                }
                className="w-full"
              />
              <span className="text-xs text-muted-foreground">{accessibilitySettings.fontSize}px</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="high-contrast" className="text-xs font-medium">High Contrast</Label>
                <Switch
                  id="high-contrast"
                  checked={accessibilitySettings.highContrast}
                  onCheckedChange={(checked) => 
                    onAccessibilityChange({ ...accessibilitySettings, highContrast: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="sound-enabled" className="text-xs font-medium">Sound Notifications</Label>
                <Switch
                  id="sound-enabled"
                  checked={accessibilitySettings.soundEnabled}
                  onCheckedChange={(checked) => 
                    onAccessibilityChange({ ...accessibilitySettings, soundEnabled: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="focus-outlines" className="text-xs font-medium">Focus Outlines</Label>
                <Switch
                  id="focus-outlines"
                  checked={accessibilitySettings.focusOutlines}
                  onCheckedChange={(checked) => 
                    onAccessibilityChange({ ...accessibilitySettings, focusOutlines: checked })
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
