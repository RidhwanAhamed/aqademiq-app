import { useState, useEffect } from 'react';
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
import { playTimerSound, stopSound, getSoundTypeFromFile } from '@/utils/timerSounds';

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
  { value: 'bell.mp3', label: 'Bell Alarm', description: 'Classic ringing bell' },
  { value: 'chime.mp3', label: 'Chime Alarm', description: 'Musical ascending tones' },
  { value: 'digital.mp3', label: 'Digital Alarm', description: 'Electronic beep pattern' },
  { value: 'gentle.mp3', label: 'Gentle Alarm', description: 'Soft pulsing tone' },
  { value: 'success.mp3', label: 'Success', description: 'Triumphant fanfare' },
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

  // Sync local settings when props change
  useEffect(() => {
    setLocalSettings(soundSettings);
  }, [soundSettings]);

  const handleToggleSound = (soundFile: string) => {
    // If this sound is currently playing, stop it
    if (playingSound === soundFile) {
      stopSound();
      setPlayingSound(null);
      return;
    }

    // Stop any currently playing sound
    stopSound();
    setPlayingSound(null);

    // Play the new sound
    const soundType = getSoundTypeFromFile(soundFile);
    const success = playTimerSound(soundType, localSettings.volume);
    
    if (success) {
      setPlayingSound(soundFile);
      // Auto-stop after sound duration (3 seconds for alarms, 1.5 for success)
      const duration = soundType === 'success' ? 1500 : 3000;
      setTimeout(() => {
        setPlayingSound(null);
      }, duration);
    } else {
      toast.error('Failed to play sound', {
        description: 'Check your browser audio settings.',
      });
    }
  };

  const handleSave = () => {
    stopSound();
    setPlayingSound(null);
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
    if (!isOpen) {
      stopSound();
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
            Customize your Pomodoro timer alarm sounds
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
                Play alarm when timer completes
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
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleToggleSound(localSettings.focusCompleteSound)}
                disabled={!localSettings.enabled}
                className={playingSound === localSettings.focusCompleteSound ? 'bg-primary/10' : ''}
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
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleToggleSound(localSettings.breakCompleteSound)}
                disabled={!localSettings.enabled}
                className={playingSound === localSettings.breakCompleteSound ? 'bg-primary/10' : ''}
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
