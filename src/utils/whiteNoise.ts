/**
 * White Noise Generator Utility
 * 
 * Generates ambient noise using Web Audio API - no audio files needed.
 * Supports white, pink, and brown noise types for focus/study sessions.
 * 
 * Backend Integration: None required - runs entirely client-side.
 * Future: Could sync user preferences via API.
 * // TODO: API -> /api/user/preferences (save noise preferences)
 */

export type NoiseType = 'white' | 'pink' | 'brown';

interface AudioContextWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

// Singleton audio context and nodes
let audioContext: AudioContext | null = null;
let noiseSource: AudioBufferSourceNode | null = null;
let gainNode: GainNode | null = null;
let isInitialized = false;

/**
 * Get or create the shared AudioContext
 */
const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || (window as AudioContextWindow).webkitAudioContext;
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
};

/**
 * Generate white noise buffer - equal energy at all frequencies
 * Classic "static" sound, good for masking distractions
 */
const generateWhiteNoise = (ctx: AudioContext, duration: number): AudioBuffer => {
  const sampleRate = ctx.sampleRate;
  const bufferSize = sampleRate * duration;
  const buffer = ctx.createBuffer(2, bufferSize, sampleRate);
  
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  
  return buffer;
};

/**
 * Generate pink noise buffer - 1/f noise, softer than white
 * Sounds like rain or a waterfall, easier on the ears
 */
const generatePinkNoise = (ctx: AudioContext, duration: number): AudioBuffer => {
  const sampleRate = ctx.sampleRate;
  const bufferSize = sampleRate * duration;
  const buffer = ctx.createBuffer(2, bufferSize, sampleRate);
  
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    
    // Pink noise algorithm using Paul Kellet's refined method
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }
  
  return buffer;
};

/**
 * Generate brown noise buffer - 1/f² noise, deep rumble
 * Sounds like thunder or a distant waterfall, very soothing
 */
const generateBrownNoise = (ctx: AudioContext, duration: number): AudioBuffer => {
  const sampleRate = ctx.sampleRate;
  const bufferSize = sampleRate * duration;
  const buffer = ctx.createBuffer(2, bufferSize, sampleRate);
  
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let lastOut = 0;
    
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Brown noise is integrated white noise
      lastOut = (lastOut + (0.02 * white)) / 1.02;
      data[i] = lastOut * 3.5; // Amplify to match other noise levels
    }
  }
  
  return buffer;
};

/**
 * Get noise buffer based on type
 */
const getNoiseBuffer = (ctx: AudioContext, type: NoiseType, duration: number): AudioBuffer => {
  switch (type) {
    case 'pink':
      return generatePinkNoise(ctx, duration);
    case 'brown':
      return generateBrownNoise(ctx, duration);
    case 'white':
    default:
      return generateWhiteNoise(ctx, duration);
  }
};

/**
 * Start playing ambient noise
 * @param type - Type of noise to play
 * @param volume - Volume level (0-100)
 * @param fadeIn - Whether to fade in (default true)
 */
export const startNoise = (type: NoiseType, volume: number, fadeIn: boolean = true): boolean => {
  try {
    // Stop any existing noise first
    stopNoise(false);
    
    const ctx = getAudioContext();
    
    // Create a 10-second looping buffer (keeps memory reasonable)
    const buffer = getNoiseBuffer(ctx, type, 10);
    
    // Create source node
    noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;
    
    // Create gain node for volume control
    gainNode = ctx.createGain();
    const normalizedVolume = Math.max(0, Math.min(1, volume / 100));
    
    if (fadeIn) {
      // Fade in over 500ms
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(normalizedVolume, ctx.currentTime + 0.5);
    } else {
      gainNode.gain.setValueAtTime(normalizedVolume, ctx.currentTime);
    }
    
    // Connect nodes
    noiseSource.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Start playback
    noiseSource.start(0);
    isInitialized = true;
    
    return true;
  } catch (error) {
    console.error('Failed to start white noise:', error);
    return false;
  }
};

/**
 * Stop playing ambient noise
 * @param fadeOut - Whether to fade out (default true)
 */
export const stopNoise = (fadeOut: boolean = true): void => {
  if (!noiseSource || !gainNode) return;
  
  try {
    const ctx = getAudioContext();
    
    if (fadeOut && isInitialized) {
      // Fade out over 300ms
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      
      // Stop after fade completes
      setTimeout(() => {
        try {
          noiseSource?.stop();
        } catch {
          // Ignore if already stopped
        }
        noiseSource = null;
        gainNode = null;
      }, 350);
    } else {
      try {
        noiseSource.stop();
      } catch {
        // Ignore if already stopped
      }
      noiseSource = null;
      gainNode = null;
    }
  } catch (error) {
    console.error('Failed to stop white noise:', error);
    noiseSource = null;
    gainNode = null;
  }
};

/**
 * Set the volume of currently playing noise
 * @param volume - Volume level (0-100)
 */
export const setNoiseVolume = (volume: number): void => {
  if (!gainNode || !audioContext) return;
  
  const normalizedVolume = Math.max(0, Math.min(1, volume / 100));
  gainNode.gain.linearRampToValueAtTime(normalizedVolume, audioContext.currentTime + 0.1);
};

/**
 * Change noise type while playing (crossfade)
 * @param newType - New noise type to switch to
 * @param volume - Current volume level
 */
export const changeNoiseType = (newType: NoiseType, volume: number): boolean => {
  // Simply restart with new type - includes fade out/in
  stopNoise(true);
  
  // Wait for fade out, then start new noise
  setTimeout(() => {
    startNoise(newType, volume, true);
  }, 350);
  
  return true;
};

/**
 * Check if noise is currently playing
 */
export const isNoisePlaying = (): boolean => {
  return noiseSource !== null && isInitialized;
};

/**
 * Cleanup all audio resources
 * Call this when component unmounts
 */
export const cleanupNoise = (): void => {
  stopNoise(false);
  isInitialized = false;
};

/**
 * Get display name for noise type
 */
export const getNoiseTypeLabel = (type: NoiseType): string => {
  switch (type) {
    case 'white':
      return 'White Noise';
    case 'pink':
      return 'Pink Noise';
    case 'brown':
      return 'Brown Noise';
    default:
      return 'White Noise';
  }
};

/**
 * Get description for noise type
 */
export const getNoiseTypeDescription = (type: NoiseType): string => {
  switch (type) {
    case 'white':
      return 'Classic static sound';
    case 'pink':
      return 'Softer, like rain';
    case 'brown':
      return 'Deep rumble';
    default:
      return '';
  }
};




