// Timer sounds using Web Audio API - generates alarm-like sounds programmatically
// These are royalty-free as they're generated, not downloaded

type SoundType = 'bell' | 'chime' | 'digital' | 'gentle' | 'success';

interface AudioContextWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

let audioContext: AudioContext | null = null;
let currentSource: OscillatorNode | null = null;
let currentGain: GainNode | null = null;

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

export const stopSound = () => {
  if (currentSource) {
    try {
      currentSource.stop();
    } catch {
      // Ignore if already stopped
    }
    currentSource = null;
  }
  if (currentGain) {
    currentGain.disconnect();
    currentGain = null;
  }
};

// Classic alarm bell - repeating ring pattern (3 seconds)
const playBellAlarm = (ctx: AudioContext, volume: number) => {
  const masterGain = ctx.createGain();
  masterGain.gain.value = volume;
  masterGain.connect(ctx.destination);
  currentGain = masterGain;

  const playRing = (startTime: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = 880;
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.8, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
    
    osc.connect(gain);
    gain.connect(masterGain);
    
    osc.start(startTime);
    osc.stop(startTime + 0.35);
    
    return osc;
  };

  // Ring 8 times over 3 seconds
  for (let i = 0; i < 8; i++) {
    const osc = playRing(ctx.currentTime + i * 0.4);
    if (i === 7) currentSource = osc;
  }
};

// Chime alarm - ascending musical tones (3 seconds)
const playChimeAlarm = (ctx: AudioContext, volume: number) => {
  const masterGain = ctx.createGain();
  masterGain.gain.value = volume;
  masterGain.connect(ctx.destination);
  currentGain = masterGain;

  const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  
  const playTone = (freq: number, startTime: number, duration: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = freq;
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.6, startTime + 0.05);
    gain.gain.setValueAtTime(0.6, startTime + duration - 0.1);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);
    
    osc.connect(gain);
    gain.connect(masterGain);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
    
    return osc;
  };

  // Play chime pattern twice
  for (let cycle = 0; cycle < 2; cycle++) {
    const cycleStart = ctx.currentTime + cycle * 1.5;
    frequencies.forEach((freq, i) => {
      const osc = playTone(freq, cycleStart + i * 0.35, 0.4);
      if (cycle === 1 && i === frequencies.length - 1) currentSource = osc;
    });
  }
};

// Digital alarm - classic beep pattern (3 seconds)
const playDigitalAlarm = (ctx: AudioContext, volume: number) => {
  const masterGain = ctx.createGain();
  masterGain.gain.value = volume;
  masterGain.connect(ctx.destination);
  currentGain = masterGain;

  const playBeep = (startTime: number, duration: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.value = 1000;
    
    gain.gain.setValueAtTime(0.4, startTime);
    gain.gain.setValueAtTime(0, startTime + duration);
    
    osc.connect(gain);
    gain.connect(masterGain);
    
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
    
    return osc;
  };

  // Beep pattern: beep-beep-beep pause beep-beep-beep (repeat)
  const pattern = [0, 0.15, 0.3, 0.7, 0.85, 1.0, 1.4, 1.55, 1.7, 2.1, 2.25, 2.4];
  pattern.forEach((time, i) => {
    const osc = playBeep(ctx.currentTime + time, 0.1);
    if (i === pattern.length - 1) currentSource = osc;
  });
};

// Gentle alarm - soft pulsing tone (3 seconds)
const playGentleAlarm = (ctx: AudioContext, volume: number) => {
  const masterGain = ctx.createGain();
  masterGain.gain.value = volume;
  masterGain.connect(ctx.destination);
  currentGain = masterGain;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  
  // Main tone
  osc.type = 'sine';
  osc.frequency.value = 440;
  
  // LFO for pulsing effect
  lfo.type = 'sine';
  lfo.frequency.value = 2; // 2 pulses per second
  lfoGain.gain.value = 0.3;
  
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  
  osc.connect(gain);
  gain.connect(masterGain);
  
  osc.start(ctx.currentTime);
  lfo.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 3);
  lfo.stop(ctx.currentTime + 3);
  
  currentSource = osc;
};

// Success sound - triumphant fanfare (1.5 seconds)
const playSuccessSound = (ctx: AudioContext, volume: number) => {
  const masterGain = ctx.createGain();
  masterGain.gain.value = volume;
  masterGain.connect(ctx.destination);
  currentGain = masterGain;

  const notes = [
    { freq: 523.25, start: 0, duration: 0.15 },     // C5
    { freq: 659.25, start: 0.15, duration: 0.15 },  // E5
    { freq: 783.99, start: 0.3, duration: 0.15 },   // G5
    { freq: 1046.50, start: 0.45, duration: 0.6 },  // C6 (held)
  ];

  notes.forEach((note, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = note.freq;
    
    const startTime = ctx.currentTime + note.start;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.5, startTime + 0.02);
    gain.gain.setValueAtTime(0.5, startTime + note.duration - 0.05);
    gain.gain.linearRampToValueAtTime(0, startTime + note.duration);
    
    osc.connect(gain);
    gain.connect(masterGain);
    
    osc.start(startTime);
    osc.stop(startTime + note.duration);
    
    if (i === notes.length - 1) currentSource = osc;
  });
};

export const playTimerSound = (soundType: SoundType, volume: number): boolean => {
  try {
    stopSound();
    
    const ctx = getAudioContext();
    const normalizedVolume = Math.max(0, Math.min(1, volume / 100));
    
    switch (soundType) {
      case 'bell':
        playBellAlarm(ctx, normalizedVolume);
        break;
      case 'chime':
        playChimeAlarm(ctx, normalizedVolume);
        break;
      case 'digital':
        playDigitalAlarm(ctx, normalizedVolume);
        break;
      case 'gentle':
        playGentleAlarm(ctx, normalizedVolume);
        break;
      case 'success':
        playSuccessSound(ctx, normalizedVolume);
        break;
      default:
        playBellAlarm(ctx, normalizedVolume);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to play timer sound:', error);
    return false;
  }
};

export const getSoundTypeFromFile = (filename: string): SoundType => {
  const name = filename.replace('.mp3', '');
  if (['bell', 'chime', 'digital', 'gentle', 'success'].includes(name)) {
    return name as SoundType;
  }
  return 'bell';
};
