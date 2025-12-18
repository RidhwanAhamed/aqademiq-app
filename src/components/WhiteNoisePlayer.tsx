/**
 * WhiteNoisePlayer Component
 * 
 * Compact floating player for ambient/white noise during study sessions.
 * Opens as a popover with play/pause, volume control, and noise type selector.
 * 
 * Backend Integration: None required - uses localStorage for preferences.
 * // TODO: API -> /api/user/preferences (could sync settings to user profile)
 */

import { Headphones, Pause, Play, Volume2, VolumeX, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useWhiteNoise } from '@/hooks/useWhiteNoise';
import { NoiseType, getNoiseTypeLabel, getNoiseTypeDescription } from '@/utils/whiteNoise';
import { cn } from '@/lib/utils';

const NOISE_OPTIONS: { value: NoiseType; label: string; description: string }[] = [
  { value: 'white', label: 'White Noise', description: 'Classic static sound' },
  { value: 'pink', label: 'Pink Noise', description: 'Softer, like rain' },
  { value: 'brown', label: 'Brown Noise', description: 'Deep rumble' },
];

interface WhiteNoisePlayerProps {
  className?: string;
}

export function WhiteNoisePlayer({ className }: WhiteNoisePlayerProps) {
  const {
    isPlaying,
    volume,
    noiseType,
    toggle,
    setVolume,
    setNoiseType,
  } = useWhiteNoise();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            'relative h-11 w-11 sm:h-10 sm:w-10',
            isPlaying && 'ring-2 ring-primary/50 bg-primary/10',
            className
          )}
          aria-label={isPlaying ? 'Ambient sounds playing - click to adjust' : 'Open ambient sounds player'}
        >
          <Headphones className={cn(
            'h-4 w-4 transition-colors',
            isPlaying && 'text-primary'
          )} />
          {/* Playing indicator */}
          {isPlaying && (
            <span 
              className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary animate-pulse"
              aria-hidden="true"
            />
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-80" 
        align="end"
        aria-label="Ambient sounds controls"
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Waves className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-base">Ambient Sounds</h3>
            </div>
            <Button
              variant={isPlaying ? 'default' : 'outline'}
              size="sm"
              onClick={toggle}
              className={cn(
                'h-9 w-9 p-0',
                isPlaying && 'bg-gradient-primary hover:opacity-90'
              )}
              aria-label={isPlaying ? 'Pause ambient sound' : 'Play ambient sound'}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Noise Type Selector */}
          <div className="space-y-2">
            <Label htmlFor="noise-type" className="text-sm">Sound Type</Label>
            <Select
              value={noiseType}
              onValueChange={(value: NoiseType) => setNoiseType(value)}
            >
              <SelectTrigger id="noise-type" className="w-full">
                <SelectValue placeholder="Select noise type" />
              </SelectTrigger>
              <SelectContent>
                {NOISE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Volume Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="noise-volume" className="text-sm flex items-center gap-2">
                {volume === 0 ? (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                )}
                Volume
              </Label>
              <span className="text-sm text-muted-foreground tabular-nums">
                {volume}%
              </span>
            </div>
            <Slider
              id="noise-volume"
              value={[volume]}
              onValueChange={(values) => setVolume(values[0])}
              max={100}
              min={0}
              step={1}
              className="w-full"
              aria-label="Volume control"
            />
          </div>

          {/* Status/Help Text */}
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              {isPlaying ? (
                <>
                  Playing <span className="font-medium">{getNoiseTypeLabel(noiseType)}</span>
                  {' '}— {getNoiseTypeDescription(noiseType)}
                </>
              ) : (
                'Background sounds to help you focus'
              )}
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default WhiteNoisePlayer;




