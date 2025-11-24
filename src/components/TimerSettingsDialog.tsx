import { useState } from 'react';
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
import { Volume2, VolumeX, Music } from 'lucide-react';

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
  onTestSound: (soundFile: string, volume: number) => void;
}

const SOUND_OPTIONS = [
  { value: 'bell.mp3', label: 'Bell' },
  { value: 'chime.mp3', label: 'Chime' },
  { value: 'digital.mp3', label: 'Digital' },
  { value: 'gentle.mp3', label: 'Gentle' },
  { value: 'nature.mp3', label: 'Nature' },
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
  onTestSound,
}: TimerSettingsDialogProps) {
  const [localSettings, setLocalSettings] = useState(soundSettings);

  const handleSave = () => {
    onSoundSettingsChange(localSettings);
    onOpenChange(false);
  };

  const handleReset = () => {
    setLocalSettings(DEFAULT_SETTINGS);
    onSoundSettingsChange(DEFAULT_SETTINGS);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                onClick={() =>
                  onTestSound(localSettings.focusCompleteSound, localSettings.volume)
                }
                disabled={!localSettings.enabled}
              >
                <Music className="h-4 w-4" />
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
                onClick={() =>
                  onTestSound(localSettings.breakCompleteSound, localSettings.volume)
                }
                disabled={!localSettings.enabled}
              >
                <Music className="h-4 w-4" />
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
