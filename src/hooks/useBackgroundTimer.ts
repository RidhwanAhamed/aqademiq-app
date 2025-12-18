import { getSoundTypeFromFile, playTimerSound } from '@/utils/timerSounds';
import { useCallback, useEffect, useRef, useState } from 'react';

// Timer modes: focus sessions, breaks, and custom
export type TimerMode = 
  | 'focus-25' 
  | 'focus-45' 
  | 'focus-60' 
  | 'focus-90' 
  | 'custom'
  | 'short-break' 
  | 'medium-break' 
  | 'long-break';

interface SoundSettings {
  enabled: boolean;
  focusCompleteSound: string;
  breakCompleteSound: string;
  volume: number; // 0-100
}

interface TimerState {
  mode: TimerMode;
  isRunning: boolean;
  startTime: number | null;
  endTime: number | null;
  timeLeft: number;
  sessionsCompleted: number;
  totalFocusTime: number;
  soundSettings: SoundSettings;
  customDuration: number; // Custom duration in seconds
}

// Helper to check if a mode is a focus session (includes custom)
export const isFocusMode = (mode: TimerMode): boolean => 
  mode.startsWith('focus') || mode === 'custom';

// Preset durations (custom uses customDuration from state)
const TIMER_PRESETS: Record<Exclude<TimerMode, 'custom'>, number> = {
  'focus-25': 25 * 60,     // Classic Pomodoro - 25 minutes
  'focus-45': 45 * 60,     // Deep focus - 45 minutes
  'focus-60': 60 * 60,     // Extended focus - 1 hour timebox
  'focus-90': 90 * 60,     // Ultra focus - 90 min ultradian rhythm
  'short-break': 5 * 60,   // Short break - 5 minutes
  'medium-break': 10 * 60, // Medium break - 10 minutes
  'long-break': 15 * 60,   // Long break - 15 minutes
};

const DEFAULT_CUSTOM_DURATION = 30 * 60; // 30 minutes default for custom
const CUSTOM_DURATION_KEY = 'pomodoro-custom-duration';

const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  enabled: true,
  focusCompleteSound: 'bell.mp3',
  breakCompleteSound: 'chime.mp3',
  volume: 70,
};

const STORAGE_KEY = 'pomodoro-timer-state';
const SOUND_SETTINGS_KEY = 'pomodoro-sound-settings';

// Helper to get duration for any mode including custom
const getModeDuration = (mode: TimerMode, customDuration: number): number => {
  if (mode === 'custom') return customDuration;
  return TIMER_PRESETS[mode];
};

export const useBackgroundTimer = () => {
  const [state, setState] = useState<TimerState>({
    mode: 'focus-25',
    isRunning: false,
    startTime: null,
    endTime: null,
    timeLeft: TIMER_PRESETS['focus-25'],
    sessionsCompleted: 0,
    totalFocusTime: 0,
    soundSettings: DEFAULT_SOUND_SETTINGS,
    customDuration: DEFAULT_CUSTOM_DURATION,
  });

  const animationFrameRef = useRef<number>();
  const notificationPermissionRef = useRef<NotificationPermission>('default');

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      Notification.requestPermission().then((permission) => {
        notificationPermissionRef.current = permission;
      });
    }
  }, []);

  // Load sound settings from localStorage
  useEffect(() => {
    const savedSoundSettings = localStorage.getItem(SOUND_SETTINGS_KEY);
    if (savedSoundSettings) {
      try {
        const parsed = JSON.parse(savedSoundSettings);
        setState(prev => ({ ...prev, soundSettings: parsed }));
      } catch (error) {
        console.error('Failed to restore sound settings:', error);
      }
    }
  }, []);

  // Load custom duration from localStorage
  useEffect(() => {
    const savedCustomDuration = localStorage.getItem(CUSTOM_DURATION_KEY);
    if (savedCustomDuration) {
      try {
        const parsed = JSON.parse(savedCustomDuration);
        if (typeof parsed === 'number' && parsed > 0) {
          setState(prev => ({ ...prev, customDuration: parsed }));
        }
      } catch (error) {
        console.error('Failed to restore custom duration:', error);
      }
    }
  }, []);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        // Validate and restore state
        if (parsed.endTime && parsed.isRunning) {
          const now = Date.now();
          const timeLeft = Math.max(0, Math.ceil((parsed.endTime - now) / 1000));
          
          setState({
            ...parsed,
            timeLeft,
            isRunning: timeLeft > 0,
            startTime: timeLeft > 0 ? parsed.startTime : null,
            endTime: timeLeft > 0 ? parsed.endTime : null,
          });
        } else {
          const mode = parsed.mode as TimerMode;
          const customDuration = parsed.customDuration || DEFAULT_CUSTOM_DURATION;
          setState(prev => ({
            ...prev,
            ...parsed,
            isRunning: false,
            startTime: null,
            endTime: null,
            customDuration,
            timeLeft: getModeDuration(mode, customDuration) || TIMER_PRESETS['focus-25'],
          }));
        }
      } catch (error) {
        console.error('Failed to restore timer state:', error);
      }
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Save sound settings separately
  useEffect(() => {
    localStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify(state.soundSettings));
  }, [state.soundSettings]);

  // Update tab title with timer information
  useEffect(() => {
    if (state.isRunning && state.timeLeft > 0) {
      const minutes = Math.floor(state.timeLeft / 60);
      const seconds = state.timeLeft % 60;
      const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      const modeLabel = isFocusMode(state.mode) ? '🍅' : '☕';
      document.title = `${modeLabel} ${timeStr} - Aqademiq`;
    } else {
      document.title = 'Aqademiq';
    }

    // Cleanup on unmount
    return () => {
      document.title = 'Aqademiq';
    };
  }, [state.isRunning, state.timeLeft, state.mode]);

  // Play sound notification using Web Audio API
  const playSound = useCallback((soundFile: string, volume: number) => {
    if (!state.soundSettings.enabled) return;
    
    const soundType = getSoundTypeFromFile(soundFile);
    playTimerSound(soundType, volume);
  }, [state.soundSettings.enabled]);

  // Show notification when timer completes
  const showNotification = useCallback((title: string, body: string) => {
    if (notificationPermissionRef.current === 'granted' && 'Notification' in window) {
      new Notification(title, {
        body,
        icon: '/public/assets/aqademiq-icon.png',
        badge: '/public/assets/aqademiq-icon.png',
      });
    }
  }, []);

  // Calculate current time left based on end time
  const calculateTimeLeft = useCallback(() => {
    if (!state.endTime || !state.isRunning) return state.timeLeft;
    
    const now = Date.now();
    const timeLeft = Math.max(0, Math.ceil((state.endTime - now) / 1000));
    return timeLeft;
  }, [state.endTime, state.isRunning, state.timeLeft]);

  // Animation loop for smooth timer updates
  const updateTimer = useCallback(() => {
    if (state.isRunning && state.endTime) {
      const timeLeft = calculateTimeLeft();
      
      if (timeLeft !== state.timeLeft) {
        setState(prev => ({ ...prev, timeLeft }));
      }
      
      if (timeLeft === 0) {
        // Timer completed
        setState(prev => {
          const modeDuration = getModeDuration(prev.mode, prev.customDuration);
          return {
            ...prev,
            isRunning: false,
            startTime: null,
            endTime: null,
            sessionsCompleted: isFocusMode(prev.mode) ? prev.sessionsCompleted + 1 : prev.sessionsCompleted,
            totalFocusTime: isFocusMode(prev.mode) ? 
              prev.totalFocusTime + modeDuration / 60 : 
              prev.totalFocusTime,
          };
        });

        // Show notification and play sound
        if (isFocusMode(state.mode)) {
          playSound(state.soundSettings.focusCompleteSound, state.soundSettings.volume);
          showNotification('Focus Session Complete! 🍅', 'Time for a well-deserved break.');
        } else {
          playSound(state.soundSettings.breakCompleteSound, state.soundSettings.volume);
          showNotification('Break Complete! ☕', 'Ready for another focus session?');
        }

        return; // Don't schedule next frame
      }
    }
    
    if (state.isRunning) {
      animationFrameRef.current = requestAnimationFrame(updateTimer);
    }
  }, [state, calculateTimeLeft, showNotification]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && state.isRunning) {
        // Tab became visible, recalculate time
        const timeLeft = calculateTimeLeft();
        setState(prev => ({ ...prev, timeLeft }));
        
        if (timeLeft === 0) {
          // Timer completed while tab was hidden
          setState(prev => {
            const modeDuration = getModeDuration(prev.mode, prev.customDuration);
            return {
              ...prev,
              isRunning: false,
              startTime: null,
              endTime: null,
              sessionsCompleted: isFocusMode(prev.mode) ? prev.sessionsCompleted + 1 : prev.sessionsCompleted,
              totalFocusTime: isFocusMode(prev.mode) ? 
                prev.totalFocusTime + modeDuration / 60 : 
                prev.totalFocusTime,
            };
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state.isRunning, calculateTimeLeft]);

  // Start/restart the animation loop when timer is running
  useEffect(() => {
    if (state.isRunning) {
      animationFrameRef.current = requestAnimationFrame(updateTimer);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state.isRunning, updateTimer]);

  // Timer control functions
  const startTimer = useCallback(() => {
    const now = Date.now();
    const duration = state.timeLeft * 1000; // Convert to milliseconds
    
    setState(prev => ({
      ...prev,
      isRunning: true,
      startTime: now,
      endTime: now + duration,
    }));
  }, [state.timeLeft]);

  const pauseTimer = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRunning: false,
      startTime: null,
      endTime: null,
    }));
  }, []);

  const resetTimer = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRunning: false,
      startTime: null,
      endTime: null,
      timeLeft: getModeDuration(prev.mode, prev.customDuration),
    }));
  }, []);

  const setMode = useCallback((mode: TimerMode) => {
    setState(prev => ({
      ...prev,
      mode,
      isRunning: false,
      startTime: null,
      endTime: null,
      timeLeft: getModeDuration(mode, prev.customDuration),
    }));
  }, []);

  const setCustomDuration = useCallback((seconds: number) => {
    // Accept seconds directly, minimum 1 second
    const durationInSeconds = Math.max(1, seconds);
    localStorage.setItem(CUSTOM_DURATION_KEY, JSON.stringify(durationInSeconds));
    setState(prev => ({
      ...prev,
      customDuration: durationInSeconds,
      // If currently in custom mode, also update timeLeft
      timeLeft: prev.mode === 'custom' && !prev.isRunning ? durationInSeconds : prev.timeLeft,
    }));
  }, []);

  const clearSavedState = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const updateSoundSettings = useCallback((settings: Partial<SoundSettings>) => {
    setState(prev => ({
      ...prev,
      soundSettings: { ...prev.soundSettings, ...settings },
    }));
  }, []);

  const testSound = useCallback((soundFile: string, volume: number): boolean => {
    const soundType = getSoundTypeFromFile(soundFile);
    return playTimerSound(soundType, volume);
  }, []);

  // Create a presets object that includes custom for UI display
  const presetsWithCustom = {
    ...TIMER_PRESETS,
    custom: state.customDuration,
  };

  return {
    ...state,
    startTimer,
    pauseTimer,
    resetTimer,
    setMode,
    setCustomDuration,
    clearSavedState,
    updateSoundSettings,
    testSound,
    presets: presetsWithCustom,
  };
};