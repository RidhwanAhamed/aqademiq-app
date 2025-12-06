// Purpose: Provide Ada with browser-based speech capture. TODO: API -> /api/transcripts.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cleanTranscript } from '@/utils/voice-cleaner';

// Web Speech API type declarations
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface UseSpeechToTextOptions {
  language?: string;
  continuous?: boolean;
}

interface FinalChunk {
  id: string;
  text: string;
}

interface UseSpeechToTextReturn {
  isSupported: boolean;
  isListening: boolean;
  interimTranscript: string;
  finalChunk: FinalChunk | null;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  acknowledgeFinalChunk: () => void;
  resetTranscript: () => void;
}

/**
 * Wraps the Web Speech API to stream transcripts into Ada AI chat.
 * Replace this hook with a backend STT service (Gemini/AWS) when available.
 */
export const useSpeechToText = (
  options: UseSpeechToTextOptions = {}
): UseSpeechToTextReturn => {
  const BUFFER_DURATION_MS = 5000;
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalChunk, setFinalChunk] = useState<FinalChunk | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const bufferTimeoutRef = useRef<number | null>(null);
  const shouldAutoRestartRef = useRef(false);

  const speechConstructor = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }, []);

  const clearBufferTimeout = useCallback(() => {
    if (bufferTimeoutRef.current) {
      window.clearTimeout(bufferTimeoutRef.current);
      bufferTimeoutRef.current = null;
    }
  }, []);

  const scheduleBufferRestart = useCallback(() => {
    clearBufferTimeout();
    bufferTimeoutRef.current = window.setTimeout(() => {
      try {
        recognitionRef.current?.start();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unable to resume speech recognition.';
        setError(message);
        shouldAutoRestartRef.current = false;
        setIsListening(false);
      }
    }, BUFFER_DURATION_MS);
  }, [clearBufferTimeout]);

  useEffect(() => {
    if (!speechConstructor) {
      setIsSupported(false);
      return;
    }

    const recognition = new speechConstructor();
    recognition.lang = options.language || 'en-US';
    recognition.interimResults = true;
    recognition.continuous = options.continuous ?? false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      clearBufferTimeout();
      setError(null);
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let interimBuffer = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const chunk = cleanTranscript(result[0].transcript);
        if (!chunk) continue;

        if (result.isFinal) {
          setFinalChunk({
            id: crypto.randomUUID(),
            text: chunk
          });
        } else {
          interimBuffer = `${interimBuffer} ${chunk}`.trim();
        }
      }

      setInterimTranscript(interimBuffer);
    };

    recognition.onerror = (event) => {
      const failure =
        event.error === 'not-allowed'
          ? 'Microphone access was denied. Please enable it in your browser permissions.'
          : event.error === 'no-speech'
          ? 'No speech detected. Try speaking again closer to your microphone.'
          : `Speech recognition error: ${event.error}`;
      setError(failure);
      shouldAutoRestartRef.current = false;
      clearBufferTimeout();
      setIsListening(false);
    };

    recognition.onend = () => {
      setInterimTranscript('');
      if (shouldAutoRestartRef.current) {
        scheduleBufferRestart();
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    setIsSupported(true);

    return () => {
      shouldAutoRestartRef.current = false;
      clearBufferTimeout();
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [options.language, options.continuous, speechConstructor, clearBufferTimeout, scheduleBufferRestart]);

  const startListening = useCallback(async () => {
    if (!recognitionRef.current) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }
    try {
      shouldAutoRestartRef.current = true;
      clearBufferTimeout();
      setInterimTranscript('');
      setIsListening(true);
      setError(null);
      recognitionRef.current.start();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to start speech recognition.';
      setError(message);
    }
  }, []);

  const stopListening = useCallback(() => {
    shouldAutoRestartRef.current = false;
    clearBufferTimeout();
    setIsListening(false);
    recognitionRef.current?.stop();
  }, [clearBufferTimeout]);

  const resetTranscript = useCallback(() => {
    setInterimTranscript('');
    setFinalChunk(null);
    setError(null);
  }, []);

  const acknowledgeFinalChunk = useCallback(() => {
    setFinalChunk(null);
  }, []);

  return {
    isSupported,
    isListening,
    interimTranscript,
    finalChunk,
    error,
    startListening,
    stopListening,
    acknowledgeFinalChunk,
    resetTranscript
  };
};

