/**
 * Soundscape Engine Utility
 * 
 * Multi-layer audio mixer using Web Audio API for adaptive study soundscapes.
 * Loads multiple audio files, loops them, and adjusts volumes based on user context
 * (stress level, time of day, session progress, study type).
 * 
 * Backend Integration: None required - runs entirely client-side.
 * Audio files stored in public/sounds/soundscape/
 * 
 * // TODO: API -> /api/user/preferences (could sync soundscape preferences to user profile)
 */

import soundscapesData from '@/data/soundscapes.json';

// Types
export type SoundscapeId = 'deep-focus' | 'conceptual-flow' | 'memorize-drill' | 'study-break' | 'night-mode' | 'anxiety-down';
export type StudyType = 'problem-solving' | 'writing' | 'memorization';
export type LayerName = 'pad' | 'rhythm' | 'texture' | 'subBass' | 'effects';

export interface SoundscapeLayer {
  file: string;
  baseVolume: number;
}

export interface SoundscapePreset {
  id: SoundscapeId;
  name: string;
  description: string;
  icon: string;
  bpm: number;
  useCases: string[];
  layers: Record<LayerName, SoundscapeLayer>;
  adaptations: {
    highStress: Record<LayerName, number>;
    lateNight: Record<LayerName, number>;
  };
}

export interface AdaptationContext {
  stressLevel: number; // 1-5
  sessionMinutes: number; // 0-90+
  timeOfDay: number; // 0-23 (hour)
  studyType: StudyType;
}

interface AudioLayer {
  source: AudioBufferSourceNode | null;
  gainNode: GainNode;
  buffer: AudioBuffer | null;
  name: LayerName;
}

// Singleton state
let audioContext: AudioContext | null = null;
let masterGainNode: GainNode | null = null;
let layers: Map<LayerName, AudioLayer> = new Map();
let currentSoundscape: SoundscapePreset | null = null;
let isPlaying = false;
let adaptationInterval: ReturnType<typeof setInterval> | null = null;
let currentContext: AdaptationContext = {
  stressLevel: 3,
  sessionMinutes: 0,
  timeOfDay: new Date().getHours(),
  studyType: 'problem-solving'
};

/**
 * Get or create the shared AudioContext
 */
const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
};

/**
 * Get all soundscape presets
 */
export const getSoundscapes = (): SoundscapePreset[] => {
  return soundscapesData.soundscapes as SoundscapePreset[];
};

/**
 * Get a specific soundscape by ID
 */
export const getSoundscapeById = (id: SoundscapeId): SoundscapePreset | undefined => {
  return getSoundscapes().find(s => s.id === id);
};

/**
 * Get study types
 */
export const getStudyTypes = () => {
  return soundscapesData.studyTypes;
};

/**
 * Load an audio file and return its buffer
 */
const loadAudioBuffer = async (filename: string): Promise<AudioBuffer> => {
  const ctx = getAudioContext();
  const response = await fetch(`/sounds/soundscape/${filename}`);
  const arrayBuffer = await response.arrayBuffer();
  return await ctx.decodeAudioData(arrayBuffer);
};

/**
 * Calculate adapted volumes based on context
 */
export const calculateAdaptedVolumes = (
  soundscape: SoundscapePreset,
  context: AdaptationContext
): Record<LayerName, number> => {
  const { stressLevel, sessionMinutes, timeOfDay, studyType } = context;
  const baseVolumes = soundscape.layers;
  
  // Initialize with base volumes
  const volumes: Record<LayerName, number> = {
    pad: baseVolumes.pad.baseVolume,
    rhythm: baseVolumes.rhythm.baseVolume,
    texture: baseVolumes.texture.baseVolume,
    subBass: baseVolumes.subBass.baseVolume,
    effects: baseVolumes.effects.baseVolume
  };

  // Stress adaptation (1-5 scale, 3 is neutral)
  const stressFactor = (stressLevel - 3) / 2; // -1 to 1
  
  // Higher stress = more pad/subBass, less rhythm
  volumes.pad = Math.min(100, volumes.pad + (stressFactor * 15));
  volumes.rhythm = Math.max(5, volumes.rhythm - (stressFactor * 10));
  volumes.subBass = Math.min(100, volumes.subBass + (stressFactor * 10));
  volumes.effects = Math.min(100, volumes.effects + (stressFactor * 5));

  // Late night adaptation (10 PM - 6 AM)
  const isLateNight = timeOfDay >= 22 || timeOfDay < 6;
  if (isLateNight) {
    // Boost sub-bass, reduce high frequencies
    volumes.subBass = Math.min(100, volumes.subBass * 1.3);
    volumes.rhythm = volumes.rhythm * 0.7;
    volumes.texture = Math.min(100, volumes.texture * 1.2);
  }

  // Session progress adaptation (deeper focus over time)
  if (sessionMinutes > 10) {
    const progressFactor = Math.min((sessionMinutes - 10) / 30, 1); // 0-1 over 30 min
    volumes.texture = Math.min(100, volumes.texture + (progressFactor * 10));
    volumes.effects = Math.min(100, volumes.effects + (progressFactor * 5));
  }

  // Study type adaptation
  switch (studyType) {
    case 'problem-solving':
      volumes.rhythm = Math.max(5, volumes.rhythm * 0.8); // Less rhythm for focus
      break;
    case 'writing':
      volumes.pad = Math.min(100, volumes.pad * 1.1); // More warmth
      volumes.rhythm = Math.min(100, volumes.rhythm * 1.1); // Gentle rhythm helps flow
      break;
    case 'memorization':
      volumes.rhythm = Math.min(100, volumes.rhythm * 1.2); // Stronger beat for pattern
      break;
  }

  // Clamp all values between 0 and 100
  Object.keys(volumes).forEach((key) => {
    volumes[key as LayerName] = Math.max(0, Math.min(100, Math.round(volumes[key as LayerName])));
  });

  return volumes;
};

/**
 * Load a soundscape (all layers)
 */
export const loadSoundscape = async (soundscapeId: SoundscapeId): Promise<boolean> => {
  try {
    const soundscape = getSoundscapeById(soundscapeId);
    if (!soundscape) {
      console.error(`Soundscape not found: ${soundscapeId}`);
      return false;
    }

    // Stop current playback if any
    await stopSoundscape(false);

    const ctx = getAudioContext();
    
    // Create master gain node if needed
    if (!masterGainNode) {
      masterGainNode = ctx.createGain();
      masterGainNode.connect(ctx.destination);
    }

    // Load all layers
    const layerNames: LayerName[] = ['pad', 'rhythm', 'texture', 'subBass', 'effects'];
    
    await Promise.all(layerNames.map(async (layerName) => {
      const layerConfig = soundscape.layers[layerName];
      const buffer = await loadAudioBuffer(layerConfig.file);
      
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, ctx.currentTime); // Start muted
      gainNode.connect(masterGainNode!);
      
      layers.set(layerName, {
        source: null,
        gainNode,
        buffer,
        name: layerName
      });
    }));

    currentSoundscape = soundscape;
    return true;
  } catch (error) {
    console.error('Failed to load soundscape:', error);
    return false;
  }
};

/**
 * Start playing the loaded soundscape
 */
export const playSoundscape = (fadeIn: boolean = true): boolean => {
  if (!currentSoundscape || layers.size === 0) {
    console.error('No soundscape loaded');
    return false;
  }

  try {
    const ctx = getAudioContext();
    
    // Calculate initial volumes
    const volumes = calculateAdaptedVolumes(currentSoundscape, currentContext);

    // Start all layers
    layers.forEach((layer, layerName) => {
      if (layer.buffer) {
        // Create new source node
        const source = ctx.createBufferSource();
        source.buffer = layer.buffer;
        source.loop = true;
        source.connect(layer.gainNode);
        
        // Set volume with optional fade
        const targetVolume = volumes[layerName] / 100;
        if (fadeIn) {
          layer.gainNode.gain.setValueAtTime(0, ctx.currentTime);
          layer.gainNode.gain.linearRampToValueAtTime(targetVolume, ctx.currentTime + 0.5);
        } else {
          layer.gainNode.gain.setValueAtTime(targetVolume, ctx.currentTime);
        }
        
        source.start(0);
        layer.source = source;
      }
    });

    isPlaying = true;
    
    // Start adaptation loop (updates every 10 seconds)
    startAdaptationLoop();
    
    return true;
  } catch (error) {
    console.error('Failed to play soundscape:', error);
    return false;
  }
};

/**
 * Stop the soundscape
 */
export const stopSoundscape = async (fadeOut: boolean = true): Promise<void> => {
  stopAdaptationLoop();
  
  if (layers.size === 0) return;

  const ctx = getAudioContext();

  layers.forEach((layer) => {
    if (layer.source) {
      if (fadeOut) {
        layer.gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
        setTimeout(() => {
          try {
            layer.source?.stop();
          } catch {
            // Ignore if already stopped
          }
          layer.source = null;
        }, 350);
      } else {
        try {
          layer.source.stop();
        } catch {
          // Ignore if already stopped
        }
        layer.source = null;
      }
    }
  });

  if (fadeOut) {
    await new Promise(resolve => setTimeout(resolve, 350));
  }
  
  isPlaying = false;
};

/**
 * Update the mix based on current context
 */
export const updateMix = (context: Partial<AdaptationContext>): void => {
  currentContext = { ...currentContext, ...context };
  
  if (!isPlaying || !currentSoundscape) return;

  const ctx = getAudioContext();
  const volumes = calculateAdaptedVolumes(currentSoundscape, currentContext);

  // Smoothly transition to new volumes
  layers.forEach((layer, layerName) => {
    const targetVolume = volumes[layerName] / 100;
    layer.gainNode.gain.linearRampToValueAtTime(targetVolume, ctx.currentTime + 0.5);
  });
};

/**
 * Set master volume
 */
export const setMasterVolume = (volume: number): void => {
  if (!masterGainNode || !audioContext) return;
  const normalizedVolume = Math.max(0, Math.min(1, volume / 100));
  masterGainNode.gain.linearRampToValueAtTime(normalizedVolume, audioContext.currentTime + 0.1);
};

/**
 * Start the adaptation loop (updates every 10 seconds)
 */
const startAdaptationLoop = (): void => {
  stopAdaptationLoop();
  
  adaptationInterval = setInterval(() => {
    // Update time of day
    currentContext.timeOfDay = new Date().getHours();
    
    // Increment session minutes (approximate)
    currentContext.sessionMinutes += 10 / 60;
    
    // Apply updated mix
    updateMix(currentContext);
  }, 10000);
};

/**
 * Stop the adaptation loop
 */
const stopAdaptationLoop = (): void => {
  if (adaptationInterval) {
    clearInterval(adaptationInterval);
    adaptationInterval = null;
  }
};

/**
 * Get current playback state
 */
export const getPlaybackState = () => ({
  isPlaying,
  currentSoundscape,
  currentContext,
  layerVolumes: currentSoundscape ? calculateAdaptedVolumes(currentSoundscape, currentContext) : null
});

/**
 * Cleanup all audio resources
 */
export const cleanupSoundscape = async (): Promise<void> => {
  await stopSoundscape(false);
  layers.clear();
  currentSoundscape = null;
  currentContext = {
    stressLevel: 3,
    sessionMinutes: 0,
    timeOfDay: new Date().getHours(),
    studyType: 'problem-solving'
  };
};

/**
 * Check if soundscape engine is available
 */
export const isSoundscapeSupported = (): boolean => {
  return !!(window.AudioContext || (window as any).webkitAudioContext);
};

