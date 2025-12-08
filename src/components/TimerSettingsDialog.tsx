import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Volume2, VolumeX, Play, Square } from 'lucide-react';
import { toast } from 'sonner';

interface SoundSettings {
  enabled: boolean;
  focusCompleteSound: string;
  breakCompleteSound: string;
  volume: number;
}

interface TimerSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  soundSettings: SoundSettings;
  onSoundSettingsChange: (settings: Partial<SoundSettings>) => void;
}

const SOUND_OPTIONS = [
  { value: 'bell.mp3', label: 'Bell Alarm' },
  { value: 'chime.mp3', label: 'Chime Alarm' },
  { value: 'digital.mp3', label: 'Digital Alarm' },
  { value: 'gentle.mp3', label: 'Gentle Alarm' },
  { value: 'success.mp3', label: 'Success' },
];

const DEFAULT_SETTINGS: SoundSettings = {
  enabled: true,
  focusCompleteSound: 'bell.mp3',
  breakCompleteSound: 'chime.mp3',
  volume: 70,
};

export function TimerSettingsDialog({
  open,
  onOpenChange,
  soundSettings,
  onSoundSettingsChange,
}: TimerSettingsDialogProps) {
  const [localSettings, setLocalSettings] = useState(soundSettings);
  const [playingSound, setPlayingSound] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleToggleSound = (soundFile: string) => {
    // If this sound is currently playing, stop it
    if (playingSound === soundFile && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
      setPlayingSound(null);
      return;
    }

    // Stop any currently playing sound
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    // Play the new sound
    try {
      const audio = new Audio(`/sounds/timer/${soundFile}`);
      audio.volume = Math.max(0, Math.min(1, localSettings.volume / 100));
      audioRef.current = audio;
      
      audio.onended = () => {
        setPlayingSound(null);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setPlayingSound(null);
        audioRef.current = null;
        toast.error('Failed to play sound', {
          description: 'Check your browser audio settings or try a different sound.',
        });
      };

      audio.play()
        .then(() => setPlayingSound(soundFile))
        .catch(() => {
          setPlayingSound(null);
          toast.error('Failed to play sound');
        });
    } catch (error) {
      setPlayingSound(null);
      toast.error('Audio playback error');
    }
  };

  const handleSave = () => {
    // Stop any playing sound before closing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingSound(null);
    }
    onSoundSettingsChange(localSettings);
    toast.success('Settings saved');
    onOpenChange(false);
  };

  const handleReset = () => {
    setLocalSettings(DEFAULT_SETTINGS);
    onSoundSettingsChange(DEFAULT_SETTINGS);
    toast.info('Settings reset to defaults');
  };

  const handleDialogChange = (isOpen: boolean) => {
    // Stop any playing sound when dialog closes
    if (!isOpen && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingSound(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Timer Settings</DialogTitle>
          <DialogDescription>
            Customize your Pomodoro timer sound notifications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Enable Sound Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base flex items-center gap-2">
                {localSettings.enabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
                Sound Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Play sound when timer completes
              </p>
            </div>
            <Switch
              checked={localSettings.enabled}
              onCheckedChange={(checked) =>
                setLocalSettings({ ...localSettings, enabled: checked })
              }
            />
          </div>

          {/* Focus Complete Sound */}
          <div className="space-y-2">
            <Label>Focus Complete Sound</Label>
            <div className="flex gap-2">
              <Select
                value={localSettings.focusCompleteSound}
                onValueChange={(value) =>
                  setLocalSettings({ ...localSettings, focusCompleteSound: value })
                }
                disabled={!localSettings.enabled}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOUND_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleToggleSound(localSettings.focusCompleteSound)}
                disabled={!localSettings.enabled}
              >
                {playingSound === localSettings.focusCompleteSound ? (
                  <Square className="h-4 w-4 fill-current" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Break Complete Sound */}
          <div className="space-y-2">
            <Label>Break Complete Sound</Label>
            <div className="flex gap-2">
              <Select
                value={localSettings.breakCompleteSound}
                onValueChange={(value) =>
                  setLocalSettings({ ...localSettings, breakCompleteSound: value })
                }
                disabled={!localSettings.enabled}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOUND_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleToggleSound(localSettings.breakCompleteSound)}
                disabled={!localSettings.enabled}
              >
                {playingSound === localSettings.breakCompleteSound ? (
                  <Square className="h-4 w-4 fill-current" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Volume Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Volume</Label>
              <span className="text-sm text-muted-foreground">
                {localSettings.volume}%
              </span>
            </div>
            <Slider
              value={[localSettings.volume]}
              onValueChange={(value) =>
                setLocalSettings({ ...localSettings, volume: value[0] })
              }
              max={100}
              step={1}
              disabled={!localSettings.enabled}
              className="w-full"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
