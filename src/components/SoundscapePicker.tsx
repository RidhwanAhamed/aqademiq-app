/**
 * SoundscapePicker Component
 * 
 * Carousel/grid UI for selecting from 6 adaptive study soundscapes.
 * Each card shows icon, name, description, and use cases.
 * 
 * Backend Integration: None required - uses local soundscape data.
 * // TODO: API -> /api/analytics/soundscape-usage (track which soundscapes are popular)
 */

import { Brain, PenTool, Repeat, Coffee, Moon, Heart, Loader2, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SoundscapePreset, SoundscapeId } from '@/utils/soundscapeEngine';

interface SoundscapePickerProps {
  soundscapes: SoundscapePreset[];
  selectedId: SoundscapeId | null;
  isLoading: boolean;
  loadingId?: SoundscapeId | null;
  onSelect: (id: SoundscapeId) => void;
  className?: string;
}

// Icon mapping for soundscape types
const SOUNDSCAPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'brain': Brain,
  'pen-tool': PenTool,
  'repeat': Repeat,
  'coffee': Coffee,
  'moon': Moon,
  'heart': Heart,
};

// Gradient backgrounds for each soundscape
const SOUNDSCAPE_GRADIENTS: Record<SoundscapeId, string> = {
  'deep-focus': 'from-blue-500/20 to-indigo-600/20 hover:from-blue-500/30 hover:to-indigo-600/30',
  'conceptual-flow': 'from-amber-500/20 to-orange-600/20 hover:from-amber-500/30 hover:to-orange-600/30',
  'memorize-drill': 'from-emerald-500/20 to-teal-600/20 hover:from-emerald-500/30 hover:to-teal-600/30',
  'study-break': 'from-rose-500/20 to-pink-600/20 hover:from-rose-500/30 hover:to-pink-600/30',
  'night-mode': 'from-violet-500/20 to-purple-600/20 hover:from-violet-500/30 hover:to-purple-600/30',
  'anxiety-down': 'from-cyan-500/20 to-sky-600/20 hover:from-cyan-500/30 hover:to-sky-600/30',
};

// Border colors for selected state
const SOUNDSCAPE_BORDERS: Record<SoundscapeId, string> = {
  'deep-focus': 'border-blue-500',
  'conceptual-flow': 'border-amber-500',
  'memorize-drill': 'border-emerald-500',
  'study-break': 'border-rose-500',
  'night-mode': 'border-violet-500',
  'anxiety-down': 'border-cyan-500',
};

// Icon colors
const SOUNDSCAPE_ICON_COLORS: Record<SoundscapeId, string> = {
  'deep-focus': 'text-blue-500',
  'conceptual-flow': 'text-amber-500',
  'memorize-drill': 'text-emerald-500',
  'study-break': 'text-rose-500',
  'night-mode': 'text-violet-500',
  'anxiety-down': 'text-cyan-500',
};

export function SoundscapePicker({
  soundscapes,
  selectedId,
  isLoading,
  loadingId,
  onSelect,
  className,
}: SoundscapePickerProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold">Choose Your Soundscape</h3>
        <Badge variant="secondary" className="text-xs">
          Adaptive Audio
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 auto-rows-fr">
        {soundscapes.map((soundscape) => {
          const IconComponent = SOUNDSCAPE_ICONS[soundscape.icon] || Brain;
          const isSelected = selectedId === soundscape.id;
          const isLoadingThis = loadingId === soundscape.id && isLoading;
          
          return (
            <Card
              key={soundscape.id}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={`Select ${soundscape.name} soundscape: ${soundscape.description}`}
              onClick={() => !isLoading && onSelect(soundscape.id as SoundscapeId)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  !isLoading && onSelect(soundscape.id as SoundscapeId);
                }
              }}
              className={cn(
                'relative cursor-pointer transition-all duration-300 h-full',
                'bg-gradient-to-br',
                SOUNDSCAPE_GRADIENTS[soundscape.id as SoundscapeId],
                'border-2',
                isSelected 
                  ? SOUNDSCAPE_BORDERS[soundscape.id as SoundscapeId]
                  : 'border-transparent',
                'hover:scale-[1.02] active:scale-[0.98]',
                isLoading && !isLoadingThis && 'opacity-50 cursor-not-allowed',
              )}
            >
              <CardContent className="p-4 h-full flex flex-col">
                {/* Selection indicator */}
                {isSelected && (
                  <div className={cn(
                    'absolute top-2 right-2 h-5 w-5 rounded-full flex items-center justify-center',
                    'bg-primary text-primary-foreground'
                  )}>
                    <Check className="h-3 w-3" />
                  </div>
                )}
                
                {/* Loading indicator */}
                {isLoadingThis && (
                  <div className="absolute top-2 right-2">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                
                {/* Icon */}
                <div className={cn(
                  'h-10 w-10 rounded-xl flex items-center justify-center mb-3',
                  'bg-background/50 backdrop-blur-sm'
                )}>
                  <IconComponent className={cn(
                    'h-5 w-5',
                    SOUNDSCAPE_ICON_COLORS[soundscape.id as SoundscapeId]
                  )} />
                </div>
                
                {/* Name - fixed height for 2 lines */}
                <h4 className="font-semibold text-sm mb-1 leading-tight h-[2.5rem] flex items-end">
                  <span>{soundscape.name}</span>
                </h4>
                
                {/* Description - fixed height for 2 lines */}
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2 h-[2rem]">
                  {soundscape.description}
                </p>
                
                {/* BPM badge - always at bottom */}
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-auto w-fit">
                  {soundscape.bpm} BPM
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Help text */}
      <p className="text-xs text-muted-foreground text-center mt-4">
        Select a soundscape, then press play. Audio adapts to your stress level and study type.
      </p>
    </div>
  );
}

export default SoundscapePicker;

