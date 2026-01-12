/**
 * SoundscapePlayer Component
 * 
 * Floating player for adaptive study soundscapes. Shows current soundscape,
 * play/pause controls, volume slider, stress level slider, and study type selector.
 * Opens as a popover from a headphones icon button.
 * 
 * Backend Integration: None required - uses localStorage for preferences.
 * // TODO: API -> /api/user/preferences (sync soundscape settings to user profile)
 */

import { useState } from 'react';
import {
  Music,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Music2,
  Loader2,
  ChevronDown,
  RotateCcw,
  Clock,
  Frown,
  Smile,
} from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useSoundscape } from '@/hooks/useSoundscape';
import { SoundscapePicker } from '@/components/SoundscapePicker';
import { SoundscapeId, StudyType } from '@/utils/soundscapeEngine';

interface SoundscapePlayerProps {
  className?: string;
}

export function SoundscapePlayer({ className }: SoundscapePlayerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [loadingId, setLoadingId] = useState<SoundscapeId | null>(null);
  
  const {
    isLoading,
    isPlaying,
    currentSoundscape,
    masterVolume,
    stressLevel,
    studyType,
    sessionMinutes,
    layerVolumes,
    isSupported,
    soundscapes,
    studyTypes,
    selectSoundscape,
    play,
    pause,
    toggle,
    setMasterVolume,
    setStressLevel,
    setStudyType,
    resetSession,
  } = useSoundscape();

  // Handle soundscape selection
  const handleSelectSoundscape = async (id: SoundscapeId) => {
    setLoadingId(id);
    const success = await selectSoundscape(id);
    setLoadingId(null);
    if (success) {
      setShowPicker(false);
    }
  };

  // Handle play/pause toggle
  const handleToggle = async () => {
    if (!currentSoundscape) {
      // If no soundscape selected, show picker
      setShowPicker(true);
      return;
    }
    await toggle();
  };

  if (!isSupported) {
    return null; // Don't render if Web Audio API not supported
  }

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
          aria-label={isPlaying ? 'Soundscape playing - click to adjust' : 'Open soundscape player'}
        >
          <Music className={cn(
            'h-4 w-4 transition-colors',
            isPlaying && 'text-primary'
          )} />
          {/* Playing indicator pulse */}
          {isPlaying && (
            <span 
              className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary animate-pulse"
              aria-hidden="true"
            />
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-[340px] p-0" 
        align="end"
        aria-label="Soundscape controls"
      >
        {showPicker ? (
          // Soundscape Picker View
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setShowPicker(false)}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                ← Back
              </button>
            </div>
            <SoundscapePicker
              soundscapes={soundscapes}
              selectedId={currentSoundscape?.id as SoundscapeId}
              isLoading={isLoading}
              loadingId={loadingId}
              onSelect={handleSelectSoundscape}
            />
          </div>
        ) : (
          // Player View
          <div className="space-y-4 p-4">
            {/* Header with current soundscape */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn(
                  'h-9 w-9 rounded-lg flex items-center justify-center',
                  'bg-gradient-to-br from-primary/20 to-primary/10'
                )}>
                  <Music2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">
                    {currentSoundscape?.name || 'Adaptive Soundscape'}
                  </h3>
                  {currentSoundscape && (
                    <p className="text-xs text-muted-foreground">
                      {currentSoundscape.bpm} BPM
                    </p>
                  )}
                </div>
              </div>
              
              {/* Play/Pause Button */}
              <Button
                variant={isPlaying ? 'default' : 'outline'}
                size="icon"
                onClick={handleToggle}
                disabled={isLoading}
                className={cn(
                  'h-10 w-10',
                  isPlaying && 'bg-gradient-primary hover:opacity-90'
                )}
                aria-label={isPlaying ? 'Pause soundscape' : 'Play soundscape'}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Soundscape Selector Button */}
            <button
              onClick={() => setShowPicker(true)}
              className={cn(
                'w-full flex items-center justify-between p-3 rounded-lg',
                'bg-muted/50 hover:bg-muted transition-colors',
                'text-left'
              )}
            >
              <span className="text-sm">
                {currentSoundscape ? 'Change soundscape' : 'Choose a soundscape'}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>

            <Separator />

            {/* Volume Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm flex items-center gap-2">
                  {masterVolume === 0 ? (
                    <VolumeX className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                  )}
                  Volume
                </Label>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {masterVolume}%
                </span>
              </div>
              <Slider
                value={[masterVolume]}
                onValueChange={(values) => setMasterVolume(values[0])}
                max={100}
                min={0}
                step={1}
                className="w-full"
                aria-label="Volume control"
              />
            </div>

            <Separator />

            {/* Stress Level Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">How are you feeling?</Label>
                <Badge variant="outline" className="text-xs">
                  {stressLevel === 1 && 'Relaxed'}
                  {stressLevel === 2 && 'Calm'}
                  {stressLevel === 3 && 'Neutral'}
                  {stressLevel === 4 && 'Stressed'}
                  {stressLevel === 5 && 'Very Stressed'}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <Smile className="h-4 w-4 text-green-500" />
                <Slider
                  value={[stressLevel]}
                  onValueChange={(values) => setStressLevel(values[0])}
                  max={5}
                  min={1}
                  step={1}
                  className="flex-1"
                  aria-label="Stress level"
                />
                <Frown className="h-4 w-4 text-orange-500" />
              </div>
              <p className="text-xs text-muted-foreground">
                Higher stress = more calming pad, less rhythm
              </p>
            </div>

            <Separator />

            {/* Study Type Selector */}
            <div className="space-y-2">
              <Label className="text-sm">Study Type</Label>
              <Select
                value={studyType}
                onValueChange={(value: StudyType) => setStudyType(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select study type" />
                </SelectTrigger>
                <SelectContent>
                  {studyTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{type.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {type.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Session Info & Reset */}
            {isPlaying && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Session: {sessionMinutes} min</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetSession}
                    className="h-8 text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                </div>
              </>
            )}

            {/* Layer Volumes Display (for debugging/demo) */}
            {isPlaying && layerVolumes && (
              <>
                <Separator />
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Active Layer Mix</Label>
                  <div className="grid grid-cols-5 gap-1">
                    {Object.entries(layerVolumes).map(([layer, volume]) => (
                      <div key={layer} className="text-center">
                        <div 
                          className="h-12 bg-primary/20 rounded relative overflow-hidden mx-auto w-6"
                        >
                          <div 
                            className="absolute bottom-0 left-0 right-0 bg-primary/60 transition-all duration-500"
                            style={{ height: `${volume}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {layer.replace('subBass', 'sub')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Help Text */}
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                {isPlaying ? (
                  'Audio adapts automatically every 10 seconds'
                ) : currentSoundscape ? (
                  'Press play to start your focus session'
                ) : (
                  'Choose a soundscape to get started'
                )}
              </p>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default SoundscapePlayer;

