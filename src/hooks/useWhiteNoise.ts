/**
 * useWhiteNoise Hook
 * 
 * Custom hook for managing white noise/ambient sound state.
 * Handles play/pause, volume, noise type selection, and persistence.
 * 
 * Backend Integration: Settings stored in localStorage for now.
 * // TODO: API -> /api/user/preferences (sync noise settings to user profile)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  NoiseType,
  startNoise,
  stopNoise,
  setNoiseVolume,
  changeNoiseType,
  cleanupNoise,
} from '@/utils/whiteNoise';

interface WhiteNoiseSettings {
  volume: number;
  noiseType: NoiseType;
  wasPlaying: boolean;
}

interface UseWhiteNoiseReturn {
  isPlaying: boolean;
  volume: number;
  noiseType: NoiseType;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setVolume: (volume: number) => void;
  setNoiseType: (type: NoiseType) => void;
}

const STORAGE_KEY = 'aqademiq-white-noise-settings';

const DEFAULT_SETTINGS: WhiteNoiseSettings = {
  volume: 50,
  noiseType: 'pink',
  wasPlaying: false,
};

/**
 * Load settings from localStorage
 */
const loadSettings = (): WhiteNoiseSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        // Don't auto-play on page load - just remember the setting
        wasPlaying: false,
      };
    }
  } catch (error) {
    console.error('Failed to load white noise settings:', error);
  }
  return DEFAULT_SETTINGS;
};

/**
 * Save settings to localStorage
 */
const saveSettings = (settings: WhiteNoiseSettings): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save white noise settings:', error);
  }
};

/**
 * Hook for managing white noise playback and settings
 */
export const useWhiteNoise = (): UseWhiteNoiseReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(DEFAULT_SETTINGS.volume);
  const [noiseType, setNoiseTypeState] = useState<NoiseType>(DEFAULT_SETTINGS.noiseType);
  
  // Track if we've initialized from storage
  const initialized = useRef(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (!initialized.current) {
      const settings = loadSettings();
      setVolumeState(settings.volume);
      setNoiseTypeState(settings.noiseType);
      initialized.current = true;
    }
  }, []);

  // Save settings whenever they change
  useEffect(() => {
    if (initialized.current) {
      saveSettings({
        volume,
        noiseType,
        wasPlaying: isPlaying,
      });
    }
  }, [volume, noiseType, isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupNoise();
    };
  }, []);

  // Handle visibility change - pause when tab is hidden (optional battery saver)
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Keep playing when tab is hidden - users may want background noise
      // Uncomment below to pause on tab switch:
      // if (document.hidden && isPlaying) {
      //   stopNoise(true);
      // }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying]);

  /**
   * Start playing white noise
   */
  const play = useCallback(() => {
    const success = startNoise(noiseType, volume, true);
    if (success) {
      setIsPlaying(true);
    }
  }, [noiseType, volume]);

  /**
   * Pause/stop white noise
   */
  const pause = useCallback(() => {
    stopNoise(true);
    setIsPlaying(false);
  }, []);

  /**
   * Toggle play/pause
   */
  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  /**
   * Update volume (and apply immediately if playing)
   */
  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(100, newVolume));
    setVolumeState(clampedVolume);
    
    if (isPlaying) {
      setNoiseVolume(clampedVolume);
    }
  }, [isPlaying]);

  /**
   * Change noise type (and apply immediately if playing)
   */
  const setNoiseType = useCallback((newType: NoiseType) => {
    setNoiseTypeState(newType);
    
    if (isPlaying) {
      changeNoiseType(newType, volume);
    }
  }, [isPlaying, volume]);

  return {
    isPlaying,
    volume,
    noiseType,
    play,
    pause,
    toggle,
    setVolume,
    setNoiseType,
  };
};

export default useWhiteNoise;




