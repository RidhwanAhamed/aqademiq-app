/**
 * useSoundscape Hook
 * 
 * React hook for managing adaptive soundscape playback and settings.
 * Handles loading, playing, and adapting soundscapes based on user context.
 * 
 * Backend Integration: Settings stored in localStorage for now.
 * // TODO: API -> /api/user/soundscape-preferences (sync to user profile)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  SoundscapeId,
  StudyType,
  SoundscapePreset,
  AdaptationContext,
  getSoundscapes,
  getSoundscapeById,
  getStudyTypes,
  loadSoundscape,
  playSoundscape,
  stopSoundscape,
  updateMix,
  setMasterVolume,
  cleanupSoundscape,
  isSoundscapeSupported,
  calculateAdaptedVolumes,
  LayerName,
} from '@/utils/soundscapeEngine';

interface SoundscapeSettings {
  lastSoundscapeId: SoundscapeId | null;
  masterVolume: number;
  stressLevel: number;
  studyType: StudyType;
}

interface UseSoundscapeReturn {
  // State
  isLoading: boolean;
  isPlaying: boolean;
  currentSoundscape: SoundscapePreset | null;
  masterVolume: number;
  stressLevel: number;
  studyType: StudyType;
  sessionMinutes: number;
  layerVolumes: Record<string, number> | null;
  isSupported: boolean;
  
  // Data
  soundscapes: SoundscapePreset[];
  studyTypes: { id: string; label: string; description: string }[];
  
  // Actions
  selectSoundscape: (id: SoundscapeId) => Promise<boolean>;
  play: () => boolean;
  pause: () => Promise<void>;
  toggle: () => Promise<void>;
  setMasterVolume: (volume: number) => void;
  setStressLevel: (level: number) => void;
  setStudyType: (type: StudyType) => void;
  resetSession: () => void;
}

const STORAGE_KEY = 'aqademiq-soundscape-settings';

const DEFAULT_SETTINGS: SoundscapeSettings = {
  lastSoundscapeId: null,
  masterVolume: 70,
  stressLevel: 3,
  studyType: 'problem-solving',
};

/**
 * Load settings from localStorage
 */
const loadSettings = (): SoundscapeSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Failed to load soundscape settings:', error);
  }
  return DEFAULT_SETTINGS;
};

/**
 * Save settings to localStorage
 */
const saveSettings = (settings: SoundscapeSettings): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save soundscape settings:', error);
  }
};

/**
 * Hook for managing soundscape playback and adaptation
 */
export const useSoundscape = (): UseSoundscapeReturn => {
  // Core state
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSoundscape, setCurrentSoundscape] = useState<SoundscapePreset | null>(null);
  const [masterVolume, setMasterVolumeState] = useState(DEFAULT_SETTINGS.masterVolume);
  const [stressLevel, setStressLevelState] = useState(DEFAULT_SETTINGS.stressLevel);
  const [studyType, setStudyTypeState] = useState<StudyType>(DEFAULT_SETTINGS.studyType);
  const [sessionMinutes, setSessionMinutes] = useState(0);
  const [layerVolumes, setLayerVolumes] = useState<Record<LayerName, number> | null>(null);
  
  const initialized = useRef(false);
  const sessionStartTime = useRef<Date | null>(null);
  const sessionTracker = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check browser support
  const isSupported = isSoundscapeSupported();

  // Load settings on mount and restore last soundscape
  useEffect(() => {
    const initializeSoundscape = async () => {
      if (!initialized.current) {
        const settings = loadSettings();
        setMasterVolumeState(settings.masterVolume);
        setStressLevelState(settings.stressLevel);
        setStudyTypeState(settings.studyType);
        
        // Auto-restore last soundscape (load but don't play)
        if (settings.lastSoundscapeId) {
          try {
            const success = await loadSoundscape(settings.lastSoundscapeId);
            if (success) {
              const soundscape = getSoundscapeById(settings.lastSoundscapeId);
              setCurrentSoundscape(soundscape || null);
            }
          } catch (error) {
            console.error('Failed to restore last soundscape:', error);
          }
        }
        
        initialized.current = true;
      }
    };
    
    initializeSoundscape();
  }, []);

  // Save settings when they change
  useEffect(() => {
    if (initialized.current) {
      saveSettings({
        lastSoundscapeId: currentSoundscape?.id as SoundscapeId || null,
        masterVolume,
        stressLevel,
        studyType,
      });
    }
  }, [currentSoundscape, masterVolume, stressLevel, studyType]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupSoundscape();
      if (sessionTracker.current) {
        clearInterval(sessionTracker.current);
      }
    };
  }, []);

  // Track session time
  const startSessionTracking = useCallback(() => {
    sessionStartTime.current = new Date();
    setSessionMinutes(0);
    
    sessionTracker.current = setInterval(() => {
      if (sessionStartTime.current) {
        const elapsed = (Date.now() - sessionStartTime.current.getTime()) / 1000 / 60;
        setSessionMinutes(Math.round(elapsed));
      }
    }, 60000); // Update every minute
  }, []);

  const stopSessionTracking = useCallback(() => {
    if (sessionTracker.current) {
      clearInterval(sessionTracker.current);
      sessionTracker.current = null;
    }
    sessionStartTime.current = null;
  }, []);

  // Update layer volumes display
  const updateLayerVolumesDisplay = useCallback(() => {
    if (currentSoundscape) {
      const context: AdaptationContext = {
        stressLevel,
        sessionMinutes,
        timeOfDay: new Date().getHours(),
        studyType,
      };
      setLayerVolumes(calculateAdaptedVolumes(currentSoundscape, context));
    }
  }, [currentSoundscape, stressLevel, sessionMinutes, studyType]);

  // Update layer volumes when context changes
  useEffect(() => {
    updateLayerVolumesDisplay();
  }, [updateLayerVolumesDisplay]);

  /**
   * Select and load a soundscape
   * If audio was playing, auto-play the new soundscape
   */
  const selectSoundscape = useCallback(async (id: SoundscapeId): Promise<boolean> => {
    // Remember if we were playing before switching
    const wasPlaying = isPlaying;
    
    // Stop current playback (this updates the engine state)
    if (wasPlaying) {
      await stopSoundscape(false); // No fade since we're switching
      setIsPlaying(false);
    }
    
    setIsLoading(true);
    try {
      const success = await loadSoundscape(id);
      if (success) {
        const soundscape = getSoundscapeById(id);
        setCurrentSoundscape(soundscape || null);
        
        // Auto-play if we were playing before (or always auto-play for better UX)
        if (wasPlaying) {
          const playSuccess = playSoundscape(true);
          if (playSuccess) {
            setIsPlaying(true);
            setMasterVolume(masterVolume);
            
            // Apply current context to new soundscape
            updateMix({
              stressLevel,
              sessionMinutes,
              timeOfDay: new Date().getHours(),
              studyType,
            });
          }
        }
        
        updateLayerVolumesDisplay();
      }
      return success;
    } finally {
      setIsLoading(false);
    }
  }, [isPlaying, masterVolume, stressLevel, sessionMinutes, studyType, updateLayerVolumesDisplay]);

  /**
   * Start playback
   */
  const play = useCallback((): boolean => {
    const success = playSoundscape(true);
    if (success) {
      setIsPlaying(true);
      setMasterVolume(masterVolume); // Apply current master volume
      startSessionTracking();
      
      // Apply initial context
      updateMix({
        stressLevel,
        sessionMinutes: 0,
        timeOfDay: new Date().getHours(),
        studyType,
      });
    }
    return success;
  }, [masterVolume, stressLevel, studyType, startSessionTracking]);

  /**
   * Pause/stop playback
   */
  const pause = useCallback(async (): Promise<void> => {
    await stopSoundscape(true);
    setIsPlaying(false);
    stopSessionTracking();
  }, [stopSessionTracking]);

  /**
   * Toggle play/pause
   */
  const toggle = useCallback(async (): Promise<void> => {
    if (isPlaying) {
      await pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  /**
   * Update master volume
   */
  const handleSetMasterVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(100, volume));
    setMasterVolumeState(clampedVolume);
    setMasterVolume(clampedVolume);
  }, []);

  /**
   * Update stress level
   */
  const handleSetStressLevel = useCallback((level: number) => {
    const clampedLevel = Math.max(1, Math.min(5, level));
    setStressLevelState(clampedLevel);
    
    if (isPlaying) {
      updateMix({ stressLevel: clampedLevel });
    }
    updateLayerVolumesDisplay();
  }, [isPlaying, updateLayerVolumesDisplay]);

  /**
   * Update study type
   */
  const handleSetStudyType = useCallback((type: StudyType) => {
    setStudyTypeState(type);
    
    if (isPlaying) {
      updateMix({ studyType: type });
    }
    updateLayerVolumesDisplay();
  }, [isPlaying, updateLayerVolumesDisplay]);

  /**
   * Reset session (time, stress to neutral)
   */
  const resetSession = useCallback(() => {
    setSessionMinutes(0);
    sessionStartTime.current = new Date();
    setStressLevelState(3);
    
    if (isPlaying) {
      updateMix({
        stressLevel: 3,
        sessionMinutes: 0,
      });
    }
  }, [isPlaying]);

  return {
    // State
    isLoading,
    isPlaying,
    currentSoundscape,
    masterVolume,
    stressLevel,
    studyType,
    sessionMinutes,
    layerVolumes,
    isSupported,
    
    // Data
    soundscapes: getSoundscapes(),
    studyTypes: getStudyTypes(),
    
    // Actions
    selectSoundscape,
    play,
    pause,
    toggle,
    setMasterVolume: handleSetMasterVolume,
    setStressLevel: handleSetStressLevel,
    setStudyType: handleSetStudyType,
    resetSession,
  };
};

export default useSoundscape;

