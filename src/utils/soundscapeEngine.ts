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
export type SoundscapeId = 'focus-deep-focus' | 'focus-conceptual-flow' | 'focus-memory-drill' | 'nature-forest-immersion' | 'nature-deep-water' | 'nature-open-air' | 'minimal-study-power' | 'minimal-calm-focus' | 'ambience-coffee-shop' | 'ambience-rainy-library' | 'deep-focus' | 'conceptual-flow' | 'memorize-drill' | 'study-break' | 'night-mode' | 'anxiety-down';
export type StudyType = 'problem-solving' | 'writing' | 'memorization';
export type LayerName = 'pad' | 'rhythm' | 'texture' | 'subBass' | 'effects' | 'drone' | 'synths' | 'binaural';

export interface SoundscapeLayer {
  file: string;
  baseVolume: number;
}

export interface SoundscapePreset {
  id: SoundscapeId;
  name: string;
  category?: string;
  description: string;
  icon: string;
  bpm: number;
  useCases: string[];
  layers: Record<string, SoundscapeLayer>; // Flexible layer names
  adaptations: {
    highStress: Record<string, number>;
    lateNight: Record<string, number>;
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
 * Supports both flat files (old) and folder paths (new structure)
 */
const loadAudioBuffer = async (filePath: string): Promise<AudioBuffer> => {
  const ctx = getAudioContext();
  // Handle both old format (just filename) and new format (folder/filename)
  const path = filePath.includes('/') ? filePath : filePath;
  const fullPath = `/sounds/soundscape/${path}`;
  
  console.log(`Loading audio from: ${fullPath}`);
  const response = await fetch(fullPath);
  if (!response.ok) {
    throw new Error(`Failed to load audio: ${fullPath} (${response.status} ${response.statusText})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = await ctx.decodeAudioData(arrayBuffer);
  console.log(`Successfully loaded audio: ${fullPath} (${buffer.duration.toFixed(2)}s, ${buffer.sampleRate}Hz)`);
  return buffer;
};

/**
 * Calculate adapted volumes based on context
 * Works with dynamic layer names (supports both old and new structures)
 */
export const calculateAdaptedVolumes = (
  soundscape: SoundscapePreset,
  context: AdaptationContext
): Record<string, number> => {
  const { stressLevel, sessionMinutes, timeOfDay, studyType } = context;
  const baseVolumes = soundscape.layers;
  
  // Initialize with base volumes for all layers
  const volumes: Record<string, number> = {};
  Object.keys(baseVolumes).forEach((layerName) => {
    volumes[layerName] = baseVolumes[layerName].baseVolume;
  });

  // Stress adaptation (1-5 scale, 3 is neutral)
  const stressFactor = (stressLevel - 3) / 2; // -1 to 1
  
  // Apply stress adaptation based on layer type
  Object.keys(volumes).forEach((layerName) => {
    const lowerName = layerName.toLowerCase();
    
    // Nature layers - specific adaptations for Forest Immersion
    if (lowerName.includes('waterstream') || lowerName.includes('stream')) {
      // Stream (Masking): Increases significantly with stress (15% → 30% → 70%)
      // Level 1: -15%, Level 2: -10%, Level 3: 0%, Level 4: +20%, Level 5: +40%
      if (stressLevel <= 2) {
        // Relaxed/Calm: decrease
        volumes[layerName] = Math.max(15, volumes[layerName] - (15 - (stressLevel - 1) * 5));
      } else if (stressLevel >= 4) {
        // Stressed/Very Stressed: increase
        volumes[layerName] = Math.min(100, volumes[layerName] + ((stressLevel - 3) * 20));
      }
      // Level 3 (Neutral) stays at base
    }
    else if (lowerName.includes('birdsong') || lowerName.includes('bird')) {
      // Birdsong (Restoration): Decreases with stress (55% → 40% → 10%)
      // Level 1: +15%, Level 2: 0%, Level 3: 0%, Level 4: -15%, Level 5: -30%
      if (stressLevel === 1) {
        volumes[layerName] = Math.min(100, volumes[layerName] + 15);
      } else if (stressLevel >= 4) {
        volumes[layerName] = Math.max(5, volumes[layerName] - ((stressLevel - 3) * 15));
      }
      // Level 2-3 stay at base
    }
    else if (lowerName.includes('wind')) {
      // Wind (Spatial): Complex - increases at level 2, then decreases
      // Level 1: 0%, Level 2: +10%, Level 3: 0%, Level 4: -5%, Level 5: -10%
      if (stressLevel === 2) {
        volumes[layerName] = Math.min(100, volumes[layerName] + 10);
      } else if (stressLevel >= 4) {
        volumes[layerName] = Math.max(5, volumes[layerName] - ((stressLevel - 3) * 5));
      }
      // Level 1 and 3 stay at base
    }
    // Deep Water layers - specific adaptations
    else if (lowerName.includes('heavy-rain') || lowerName.includes('heavyrain') || (lowerName.includes('rain') && !lowerName.includes('waterstream'))) {
      // Heavy Rain (Shield): Increases dramatically with stress (10% → 20% → 65%)
      // Level 1: -10%, Level 2: -10%, Level 3: 0%, Level 4: +25%, Level 5: +45%
      if (stressLevel <= 2) {
        volumes[layerName] = Math.max(10, volumes[layerName] - 10);
      } else if (stressLevel === 4) {
        volumes[layerName] = Math.min(100, volumes[layerName] + 25);
      } else if (stressLevel === 5) {
        volumes[layerName] = Math.min(100, volumes[layerName] + 45);
      }
      // Level 3 stays at base
    }
    else if (lowerName.includes('ocean-waves') || lowerName.includes('oceanwaves') || (lowerName.includes('waves') && !lowerName.includes('water'))) {
      // Ocean Waves (Rhythm): Decreases with stress, peaks at level 1 (45% → 30% → 15%)
      // Level 1: +15%, Level 2: -5%, Level 3: 0%, Level 4: -10%, Level 5: -15%
      if (stressLevel === 1) {
        volumes[layerName] = Math.min(100, volumes[layerName] + 15);
      } else if (stressLevel === 2) {
        volumes[layerName] = Math.max(5, volumes[layerName] - 5);
      } else if (stressLevel >= 4) {
        volumes[layerName] = Math.max(5, volumes[layerName] - ((stressLevel - 3) * 10));
      }
      // Level 3 stays at base
    }
    else if (lowerName.includes('underwater') || lowerName.includes('under-water')) {
      // Underwater (Isolation): Peaks at level 2, then decreases (15% → 40% → 25% → 15%)
      // Level 1: -10%, Level 2: +15%, Level 3: 0%, Level 4: -5%, Level 5: -10%
      if (stressLevel === 1) {
        volumes[layerName] = Math.max(5, volumes[layerName] - 10);
      } else if (stressLevel === 2) {
        volumes[layerName] = Math.min(100, volumes[layerName] + 15);
      } else if (stressLevel >= 4) {
        volumes[layerName] = Math.max(5, volumes[layerName] - ((stressLevel - 3) * 5));
      }
      // Level 3 stays at base
    }
    else if (lowerName.includes('bubbles') || lowerName.includes('bubble')) {
      // Bubbles (Complexity): Peaks at level 2, then decreases (10% → 20% → 15% → 5%)
      // Level 1: -5%, Level 2: +5%, Level 3: 0%, Level 4: -5%, Level 5: -10%
      if (stressLevel === 1) {
        volumes[layerName] = Math.max(5, volumes[layerName] - 5);
      } else if (stressLevel === 2) {
        volumes[layerName] = Math.min(100, volumes[layerName] + 5);
      } else if (stressLevel >= 4) {
        volumes[layerName] = Math.max(0, volumes[layerName] - ((stressLevel - 3) * 5));
      }
      // Level 3 stays at base
    }
    else if (lowerName.includes('whalesong') || lowerName.includes('whale-song') || lowerName.includes('whale')) {
      // Whale Song (Soft Fascination): Decreases with stress, peaks at level 1 (20% → 10% → 0%)
      // Level 1: +10%, Level 2: -5%, Level 3: 0%, Level 4: -5%, Level 5: -10% (to 0%)
      if (stressLevel === 1) {
        volumes[layerName] = Math.min(100, volumes[layerName] + 10);
      } else if (stressLevel === 2) {
        volumes[layerName] = Math.max(0, volumes[layerName] - 5);
      } else if (stressLevel >= 4) {
        volumes[layerName] = Math.max(0, volumes[layerName] - ((stressLevel - 3) * 5));
      }
      // Level 3 stays at base
    }
    // Open Air layers - specific adaptations for vastness
    else if (lowerName.includes('mountain-wind') || (lowerName.includes('wind') && lowerName.includes('mountain'))) {
      // Mountain Wind (The Ground): Peaks at level 2, then decreases (20% → 40% → 30% → 15%)
      // Level 1: -10%, Level 2: +10%, Level 3: 0%, Level 4: -5%, Level 5: -15%
      if (stressLevel === 1) {
        volumes[layerName] = Math.max(5, volumes[layerName] - 10);
      } else if (stressLevel === 2) {
        volumes[layerName] = Math.min(100, volumes[layerName] + 10);
      } else if (stressLevel >= 4) {
        volumes[layerName] = Math.max(5, volumes[layerName] - ((stressLevel - 3) * 5));
      }
      // Level 3 stays at base
    }
    else if (lowerName.includes('thunder') && !lowerName.includes('rain')) {
      // Thunder (The Awe): Increases dramatically with stress (10% → 20% → 60%)
      // Level 1: -10%, Level 2: -10%, Level 3: 0%, Level 4: +15%, Level 5: +40%
      if (stressLevel <= 2) {
        volumes[layerName] = Math.max(5, volumes[layerName] - 10);
      } else if (stressLevel === 4) {
        volumes[layerName] = Math.min(100, volumes[layerName] + 15);
      } else if (stressLevel === 5) {
        volumes[layerName] = Math.min(100, volumes[layerName] + 40);
      }
      // Level 3 stays at base
    }
    else if (lowerName.includes('cricket') || lowerName.includes('crickets')) {
      // Crickets (The Life/Rhythm): Peaks at level 1, then decreases (45% → 20% → 5%)
      // Level 1: +25%, Level 2: 0%, Level 3: 0%, Level 4: -5%, Level 5: -15%
      if (stressLevel === 1) {
        volumes[layerName] = Math.min(100, volumes[layerName] + 25);
      } else if (stressLevel >= 4) {
        volumes[layerName] = Math.max(0, volumes[layerName] - ((stressLevel - 3) * 5));
      }
      // Level 2-3 stay at base
    }
    else if (lowerName.includes('eagle') || lowerName.includes('hawk') || lowerName.includes('bird-call')) {
      // Eagle/Hawk (The Depth): Decreases with stress (10% → 15% → 5%)
      // Level 1: -5%, Level 2: -10%, Level 3: 0%, Level 4: -5%, Level 5: -10%
      if (stressLevel === 1) {
        volumes[layerName] = Math.max(0, volumes[layerName] - 5);
      } else if (stressLevel === 2) {
        volumes[layerName] = Math.max(0, volumes[layerName] - 10);
      } else if (stressLevel >= 4) {
        volumes[layerName] = Math.max(0, volumes[layerName] - ((stressLevel - 3) * 5));
      }
      // Level 3 stays at base
    }
    else if (lowerName.includes('leaves-rustling') || lowerName.includes('rustling') || (lowerName.includes('grass') && !lowerName.includes('tall'))) {
      // Grass (The Texture): Constant except peaks at level 2 (15% → 25% → 15%)
      // Level 1: 0%, Level 2: +10%, Level 3: 0%, Level 4: 0%, Level 5: 0%
      if (stressLevel === 2) {
        volumes[layerName] = Math.min(100, volumes[layerName] + 10);
      }
      // All other levels stay at base
    }
    // Study Power layers - specific adaptations for procrastinators
    else if (lowerName.includes('tone-528hz') || lowerName.includes('528hz') || lowerName.includes('528')) {
      // 528Hz Tone (Calm): Increases dramatically with stress (10% → 20% → 45%)
      // Level 1: -10%, Level 2: -5%, Level 3: 0%, Level 4: +15%, Level 5: +25%
      if (stressLevel === 1) {
        volumes[layerName] = Math.max(5, volumes[layerName] - 10);
      } else if (stressLevel === 2) {
        volumes[layerName] = Math.max(5, volumes[layerName] - 5);
      } else if (stressLevel === 4) {
        volumes[layerName] = Math.min(100, volumes[layerName] + 15);
      } else if (stressLevel === 5) {
        volumes[layerName] = Math.min(100, volumes[layerName] + 25);
      }
      // Level 3 stays at base
    }
    else if ((lowerName.includes('isochronic') || lowerName.includes('pulse')) && !lowerName.includes('memory')) {
      // Isochronic 40Hz (Drive): Decreases with stress (50% → 35% → 15%)
      // Level 1: +15%, Level 2: +10%, Level 3: 0%, Level 4: -10%, Level 5: -20%
      if (stressLevel === 1) {
        volumes[layerName] = Math.min(100, volumes[layerName] + 15);
      } else if (stressLevel === 2) {
        volumes[layerName] = Math.min(100, volumes[layerName] + 10);
      } else if (stressLevel >= 4) {
        volumes[layerName] = Math.max(5, volumes[layerName] - ((stressLevel - 3) * 10));
      }
      // Level 3 stays at base
    }
    else if ((lowerName.includes('binaural') || lowerName.includes('bimaural')) && !lowerName.includes('memory')) {
      // Binaural Beta/Alpha (Push): Decreases slightly with stress (25% → 25% → 15%)
      // Level 1-2: 0%, Level 3: 0%, Level 4: -5%, Level 5: -10%
      if (stressLevel >= 4) {
        volumes[layerName] = Math.max(5, volumes[layerName] - ((stressLevel - 3) * 5));
      }
      // Level 1-3 stay at base
    }
    else if (lowerName.includes('white-noise') || lowerName.includes('whitenoise')) {
      // White Noise (Mask): Check if it's Calm Focus (base 10%) or Study Power (base 20%)
      const baseVol = soundscape.layers[layerName]?.baseVolume || volumes[layerName];
      if (baseVol <= 15) {
        // Calm Focus: Mostly constant, slight increase at very stressed (10% → 10% → 15%)
        // Level 1-4: 0%, Level 5: +5%
        if (stressLevel === 5) {
          volumes[layerName] = Math.min(100, volumes[layerName] + 5);
        }
        // Level 1-4 stay at base
      } else {
        // Study Power: Increases slightly with stress (15% → 20% → 25%)
        // Level 1: -5%, Level 2: -5%, Level 3: 0%, Level 4: 0%, Level 5: +5%
        if (stressLevel <= 2) {
          volumes[layerName] = Math.max(5, volumes[layerName] - 5);
        } else if (stressLevel === 5) {
          volumes[layerName] = Math.min(100, volumes[layerName] + 5);
        }
        // Level 3-4 stay at base
      }
    }
    // Calm Focus specific - 528Hz Pad (different from Study Power tone-528hz)
    else if (lowerName.includes('pad-528hz') || (lowerName.includes('528hz') && lowerName.includes('pad'))) {
      // 528Hz Pad (Calm Focus): Increases with stress (30% → 50% → 65%)
      // Level 1: -20%, Level 2: -10%, Level 3: 0%, Level 4: +10%, Level 5: +15%
      if (stressLevel === 1) {
        volumes[layerName] = Math.max(5, volumes[layerName] - 20);
      } else if (stressLevel === 2) {
        volumes[layerName] = Math.max(5, volumes[layerName] - 10);
      } else if (stressLevel === 4) {
        volumes[layerName] = Math.min(100, volumes[layerName] + 10);
      } else if (stressLevel === 5) {
        volumes[layerName] = Math.min(100, volumes[layerName] + 15);
      }
      // Level 3 stays at base
    }
    // Calm Focus binaural (base 20%, different from Study Power base 25%)
    else if ((lowerName.includes('binaural') || lowerName.includes('bimaural')) && !lowerName.includes('memory') && !lowerName.includes('study-power')) {
      // Check base volume to distinguish Calm Focus from Study Power
      const baseVol = soundscape.layers[layerName]?.baseVolume || volumes[layerName];
      if (baseVol === 20) {
        // Calm Focus Binaural: Decreases with stress (20% → 20% → 10%)
        // Level 1-3: 0%, Level 4: -5%, Level 5: -10%
        if (stressLevel >= 4) {
          volumes[layerName] = Math.max(5, volumes[layerName] - ((stressLevel - 3) * 5));
        }
        // Level 1-3 stay at base
      } else if (baseVol === 25) {
        // Study Power Binaural: Decreases slightly with stress (25% → 25% → 15%)
        // Level 1-2: 0%, Level 3: 0%, Level 4: -5%, Level 5: -10%
        if (stressLevel >= 4) {
          volumes[layerName] = Math.max(5, volumes[layerName] - ((stressLevel - 3) * 5));
        }
        // Level 1-3 stay at base
      }
    }
    // Coffee Shop layers - specific adaptations for café ambience
    else if (soundscape.id === 'ambience-coffee-shop') {
      if (lowerName.includes('chatter') || lowerName.includes('coffe-shop') || lowerName.includes('coffee-shop')) {
        // Chatter: Peaks at neutral, decreases at extremes (50% → 70% → 55%)
        // Level 1: -20%, Level 2: -10%, Level 3: 0%, Level 4: -5%, Level 5: -15%
        if (stressLevel === 1) {
          volumes[layerName] = Math.max(5, volumes[layerName] - 20);
        } else if (stressLevel === 2) {
          volumes[layerName] = Math.max(5, volumes[layerName] - 10);
        } else if (stressLevel === 4) {
          volumes[layerName] = Math.max(5, volumes[layerName] - 5);
        } else if (stressLevel === 5) {
          volumes[layerName] = Math.max(5, volumes[layerName] - 15);
        }
        // Level 3 stays at base
      } else if (lowerName.includes('hvac')) {
        // HVAC: Increases with stress for masking (40% → 50% → 60%)
        // Level 1: -10%, Level 2: -5%, Level 3: 0%, Level 4: +5%, Level 5: +10%
        if (stressLevel === 1) {
          volumes[layerName] = Math.max(5, volumes[layerName] - 10);
        } else if (stressLevel === 2) {
          volumes[layerName] = Math.max(5, volumes[layerName] - 5);
        } else if (stressLevel === 4) {
          volumes[layerName] = Math.min(100, volumes[layerName] + 5);
        } else if (stressLevel === 5) {
          volumes[layerName] = Math.min(100, volumes[layerName] + 10);
        }
        // Level 3 stays at base
      } else if (lowerName.includes('plates-glass') || lowerName.includes('plates') || lowerName.includes('glass')) {
        // Plates/Glass: Peaks at neutral, decreases with stress (10% → 20% → 10%)
        // Level 1: -10%, Level 2: -5%, Level 3: 0%, Level 4: -5%, Level 5: -10%
        if (stressLevel === 1) {
          volumes[layerName] = Math.max(0, volumes[layerName] - 10);
        } else if (stressLevel === 2) {
          volumes[layerName] = Math.max(0, volumes[layerName] - 5);
        } else if (stressLevel >= 4) {
          volumes[layerName] = Math.max(0, volumes[layerName] - ((stressLevel - 3) * 5));
        }
        // Level 3 stays at base
      } else if (lowerName.includes('light-traffic') || lowerName.includes('traffic')) {
        // Light Traffic: Only at calm/neutral, zero at extremes (0% → 5% → 0%)
        // Level 1: -5%, Level 2: 0%, Level 3: 0%, Level 4: -5%, Level 5: -5%
        if (stressLevel === 1 || stressLevel >= 4) {
          volumes[layerName] = Math.max(0, volumes[layerName] - 5);
        }
        // Level 2-3 stay at base
      }
    }
    // Rainy Library layers - specific adaptations for library ambience
    else if (soundscape.id === 'ambience-rainy-library') {
      if (lowerName.includes('rain') && !lowerName.includes('heavy')) {
        // Rain: Moderate increase with stress, but HVAC takes priority (25% → 35% → 35%)
        // Level 1: -10%, Level 2: -5%, Level 3: 0%, Level 4: 0%, Level 5: 0%
        if (stressLevel === 1) {
          volumes[layerName] = Math.max(5, volumes[layerName] - 10);
        } else if (stressLevel === 2) {
          volumes[layerName] = Math.max(5, volumes[layerName] - 5);
        }
        // Level 3-5 stay at base (35%) - HVAC takes priority for masking
      } else if (lowerName.includes('hvac') || lowerName.includes('white-bed') || lowerName.includes('whitebed')) {
        // HVAC/White Bed: Increases significantly with stress for masking (35% → 35% → 50%)
        // Level 1-3: 0%, Level 4: +5%, Level 5: +15%
        if (stressLevel === 4) {
          volumes[layerName] = Math.min(100, volumes[layerName] + 5);
        } else if (stressLevel === 5) {
          volumes[layerName] = Math.min(100, volumes[layerName] + 15);
        }
        // Level 1-3 stay at base
      } else if (lowerName.includes('flipping-pages') || lowerName.includes('pages') || lowerName.includes('flipping')) {
        // Flipping Pages: Decreases with stress (30% → 25% → 10%)
        // Level 1: +5%, Level 2: +5%, Level 3: 0%, Level 4: -15%, Level 5: -15%
        if (stressLevel <= 2) {
          volumes[layerName] = Math.min(100, volumes[layerName] + 5);
        } else if (stressLevel === 4) {
          volumes[layerName] = Math.max(0, volumes[layerName] - 15);
        } else if (stressLevel === 5) {
          volumes[layerName] = Math.max(0, volumes[layerName] - 15);
        }
        // Level 3 stays at base
      } else if (lowerName.includes('typing')) {
        // Typing: Peaks at neutral, decreases with stress (20% → 35% → 15%)
        // Level 1: -15%, Level 2: -10%, Level 3: 0%, Level 4: -20%, Level 5: -20%
        if (stressLevel === 1) {
          volumes[layerName] = Math.max(0, volumes[layerName] - 15);
        } else if (stressLevel === 2) {
          volumes[layerName] = Math.max(0, volumes[layerName] - 10);
        } else if (stressLevel === 4) {
          volumes[layerName] = Math.max(0, volumes[layerName] - 20);
        } else if (stressLevel === 5) {
          volumes[layerName] = Math.max(0, volumes[layerName] - 20);
        }
        // Level 3 stays at base
      }
    }
    // Drone/pad/brown-noise layers: increase with stress (calming)
    else if (lowerName.includes('drone') || lowerName.includes('pad') || lowerName.includes('binaural') || lowerName.includes('brown-noise') || lowerName.includes('brownnoise')) {
      volumes[layerName] = Math.min(100, volumes[layerName] + (stressFactor * 15));
    }
    // Rhythm/synths/baroque layers: decrease with stress (less distracting)
    else if (lowerName.includes('rhythm') || lowerName.includes('synth') || lowerName.includes('baroque') || lowerName.includes('classical')) {
      volumes[layerName] = Math.max(5, volumes[layerName] - (stressFactor * 10));
    }
    // Isochronic pulse: decrease with stress (less stimulation when stressed)
    else if (lowerName.includes('isochronic') || lowerName.includes('pulse')) {
      volumes[layerName] = Math.max(5, volumes[layerName] - (stressFactor * 12));
    }
    // Texture/effects/rain: slight increase (calming texture)
    else if (lowerName.includes('texture') || lowerName.includes('effect') || lowerName.includes('rain')) {
      volumes[layerName] = Math.min(100, volumes[layerName] + (stressFactor * 8));
    }
    // Sub-bass: increase with stress (grounding)
    else if (lowerName.includes('bass') || lowerName.includes('sub')) {
      volumes[layerName] = Math.min(100, volumes[layerName] + (stressFactor * 10));
    }
  });

  // Late night adaptation (10 PM - 6 AM)
  const isLateNight = timeOfDay >= 22 || timeOfDay < 6;
  if (isLateNight) {
    Object.keys(volumes).forEach((layerName) => {
      const lowerName = layerName.toLowerCase();
      if (lowerName.includes('bass') || lowerName.includes('sub') || lowerName.includes('drone') || lowerName.includes('brown-noise') || lowerName.includes('brownnoise')) {
        volumes[layerName] = Math.min(100, volumes[layerName] * 1.3);
      } else if (lowerName.includes('rhythm') || lowerName.includes('synth') || lowerName.includes('baroque') || lowerName.includes('classical') || lowerName.includes('isochronic') || lowerName.includes('pulse')) {
        volumes[layerName] = volumes[layerName] * 0.7;
      } else if (lowerName.includes('texture') || lowerName.includes('rain')) {
        volumes[layerName] = Math.min(100, volumes[layerName] * 1.2);
      }
    });
  }

  // Session progress adaptation (deeper focus over time)
  if (sessionMinutes > 10) {
    const progressFactor = Math.min((sessionMinutes - 10) / 30, 1); // 0-1 over 30 min
    Object.keys(volumes).forEach((layerName) => {
      const lowerName = layerName.toLowerCase();
      if (lowerName.includes('texture') || lowerName.includes('binaural')) {
        volumes[layerName] = Math.min(100, volumes[layerName] + (progressFactor * 10));
      } else if (lowerName.includes('effect')) {
        volumes[layerName] = Math.min(100, volumes[layerName] + (progressFactor * 5));
      }
    });
  }

  // Study type adaptation
  switch (studyType) {
    case 'problem-solving':
      Object.keys(volumes).forEach((layerName) => {
        const lowerName = layerName.toLowerCase();
        if (lowerName.includes('rhythm') || lowerName.includes('synth')) {
          volumes[layerName] = Math.max(5, volumes[layerName] * 0.8);
        }
      });
      break;
    case 'writing':
      Object.keys(volumes).forEach((layerName) => {
        const lowerName = layerName.toLowerCase();
        if (lowerName.includes('drone') || lowerName.includes('pad')) {
          volumes[layerName] = Math.min(100, volumes[layerName] * 1.1);
        }
      });
      break;
    case 'memorization':
      Object.keys(volumes).forEach((layerName) => {
        const lowerName = layerName.toLowerCase();
        if (lowerName.includes('rhythm') || lowerName.includes('synth') || lowerName.includes('baroque') || lowerName.includes('isochronic') || lowerName.includes('pulse')) {
          volumes[layerName] = Math.min(100, volumes[layerName] * 1.2);
        }
      });
      break;
  }

  // Clamp all values between 0 and 100
  Object.keys(volumes).forEach((key) => {
    volumes[key] = Math.max(0, Math.min(100, Math.round(volumes[key])));
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

    // Stop current playback if any and clear layers
    await stopSoundscape(false);
    layers.clear(); // Clear old layers before loading new ones

    const ctx = getAudioContext();
    
    // Create master gain node if needed
    if (!masterGainNode) {
      masterGainNode = ctx.createGain();
      masterGainNode.connect(ctx.destination);
    }

    // Load all layers dynamically (supports both old and new layer structures)
    const layerNames = Object.keys(soundscape.layers);
    
    const loadResults = await Promise.allSettled(layerNames.map(async (layerName) => {
      const layerConfig = soundscape.layers[layerName];
      if (!layerConfig) {
        console.warn(`Layer ${layerName} not found in soundscape ${soundscapeId}`);
        return null;
      }
      
      try {
        const buffer = await loadAudioBuffer(layerConfig.file);
        
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0, ctx.currentTime); // Start muted
        gainNode.connect(masterGainNode!);
        
        layers.set(layerName as LayerName, {
          source: null,
          gainNode,
          buffer,
          name: layerName as LayerName
        });
        
        return layerName;
      } catch (error) {
        console.error(`Failed to load layer ${layerName}:`, error);
        return null;
      }
    }));
    
    // Log which layers successfully loaded
    const loadedLayers = loadResults
      .filter((result): result is PromiseFulfilledResult<string> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);
    
    if (loadedLayers.length === 0) {
      console.error('No layers loaded successfully');
      return false;
    }
    
    console.log(`Loaded ${loadedLayers.length}/${layerNames.length} layers:`, loadedLayers);

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
        
        // Set volume with optional fade - use fallback if volume not found
        const layerNameStr = String(layerName);
        const calculatedVolume = volumes[layerNameStr];
        const baseVolume = currentSoundscape.layers[layerNameStr]?.baseVolume ?? 0;
        const finalVolume = calculatedVolume !== undefined ? calculatedVolume : baseVolume;
        const targetVolume = Math.max(0, Math.min(1, finalVolume / 100)); // Clamp between 0 and 1
        
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
  
  if (layers.size === 0) {
    isPlaying = false;
    return;
  }

  const ctx = getAudioContext();

  // Stop all sources
  const stopPromises = Array.from(layers.entries()).map(([layerName, layer]) => {
    return new Promise<void>((resolve) => {
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
            resolve();
          }, 350);
        } else {
          try {
            layer.source.stop();
          } catch {
            // Ignore if already stopped
          }
          layer.source = null;
          resolve();
        }
      } else {
        resolve();
      }
    });
  });

  await Promise.all(stopPromises);
  
  if (fadeOut) {
    await new Promise(resolve => setTimeout(resolve, 50)); // Small buffer
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
    const layerNameStr = String(layerName);
    const calculatedVolume = volumes[layerNameStr];
    const baseVolume = currentSoundscape.layers[layerNameStr]?.baseVolume ?? 0;
    const finalVolume = calculatedVolume !== undefined ? calculatedVolume : baseVolume;
    const targetVolume = Math.max(0, Math.min(1, finalVolume / 100)); // Clamp between 0 and 1
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

