import React from 'react';
import { BookOpen, Search, Image, Brain, Sparkles, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AdaMode = 'chat' | 'cornell_notes' | 'deep_research' | 'image_gen' | 'thinking';

interface AdaModeSelectorProps {
  currentMode: AdaMode;
  onModeChange: (mode: AdaMode) => void;
  disabled?: boolean;
}

const modes = [
  {
    id: 'chat' as AdaMode,
    label: 'Chat',
    description: 'General conversation & help',
    icon: Sparkles,
    available: true,
  },
  {
    id: 'cornell_notes' as AdaMode,
    label: 'Cornell Notes',
    description: 'Generate structured study notes',
    icon: BookOpen,
    available: true,
  },
  {
    id: 'deep_research' as AdaMode,
    label: 'Deep Research',
    description: 'In-depth topic exploration',
    icon: Search,
    available: false,
    comingSoon: true,
  },
  {
    id: 'image_gen' as AdaMode,
    label: 'Create Image',
    description: 'Generate study diagrams',
    icon: Image,
    available: false,
    comingSoon: true,
  },
  {
    id: 'thinking' as AdaMode,
    label: 'Thinking',
    description: 'Extended reasoning mode',
    icon: Brain,
    available: false,
    comingSoon: true,
  },
];

export function AdaModeSelector({ currentMode, onModeChange, disabled }: AdaModeSelectorProps) {
  const currentModeConfig = modes.find((m) => m.id === currentMode) || modes[0];
  const CurrentIcon = currentModeConfig.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-11 w-11 rounded-full transition-all",
            currentMode !== 'chat' 
              ? "bg-primary/10 text-primary hover:bg-primary/20" 
              : "bg-muted/50 hover:bg-muted"
          )}
          disabled={disabled}
        >
          {currentMode === 'chat' ? (
            <Plus className="h-5 w-5" />
          ) : (
            <CurrentIcon className="h-5 w-5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Select Mode
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = currentMode === mode.id;
          
          return (
            <DropdownMenuItem
              key={mode.id}
              onClick={() => mode.available && onModeChange(mode.id)}
              disabled={!mode.available}
              className={cn(
                "flex items-start gap-3 p-3 cursor-pointer",
                isActive && "bg-primary/10",
                !mode.available && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                isActive ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{mode.label}</span>
                  {mode.comingSoon && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      Soon
                    </Badge>
                  )}
                  {isActive && (
                    <Check className="w-3.5 h-3.5 text-primary ml-auto" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {mode.description}
                </p>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
