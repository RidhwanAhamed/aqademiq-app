import { useState, useEffect, useCallback, useRef } from 'react';

export type TimerMode = 'focus' | 'short-break' | 'long-break';

interface TimerState {
  mode: TimerMode;
  isRunning: boolean;
  startTime: number | null;
  endTime: number | null;
  timeLeft: number;
  sessionsCompleted: number;
  totalFocusTime: number;
}

const TIMER_PRESETS = {
  focus: 25 * 60, // 25 minutes in seconds
  'short-break': 5 * 60, // 5 minutes in seconds
  'long-break': 15 * 60, // 15 minutes in seconds
};

const STORAGE_KEY = 'pomodoro-timer-state';

export const useBackgroundTimer = () => {
  const [state, setState] = useState<TimerState>({
    mode: 'focus',
    isRunning: false,
    startTime: null,
    endTime: null,
    timeLeft: TIMER_PRESETS.focus,
    sessionsCompleted: 0,
    totalFocusTime: 0,
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
          setState(prev => ({
            ...prev,
            ...parsed,
            isRunning: false,
            startTime: null,
            endTime: null,
            timeLeft: TIMER_PRESETS[parsed.mode] || TIMER_PRESETS.focus,
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

  // Update tab title with timer information
  useEffect(() => {
    if (state.isRunning && state.timeLeft > 0) {
      const minutes = Math.floor(state.timeLeft / 60);
      const seconds = state.timeLeft % 60;
      const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      const modeLabel = state.mode === 'focus' ? '🍅' : '☕';
      document.title = `${modeLabel} ${timeStr} - Aqademiq`;
    } else {
      document.title = 'Aqademiq';
    }

    // Cleanup on unmount
    return () => {
      document.title = 'Aqademiq';
    };
  }, [state.isRunning, state.timeLeft, state.mode]);

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
        setState(prev => ({
          ...prev,
          isRunning: false,
          startTime: null,
          endTime: null,
          sessionsCompleted: prev.mode === 'focus' ? prev.sessionsCompleted + 1 : prev.sessionsCompleted,
          totalFocusTime: prev.mode === 'focus' ? 
            prev.totalFocusTime + TIMER_PRESETS[prev.mode] / 60 : 
            prev.totalFocusTime,
        }));

        // Show notification
        if (state.mode === 'focus') {
          showNotification('Focus Session Complete! 🍅', 'Time for a well-deserved break.');
        } else {
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
          setState(prev => ({
            ...prev,
            isRunning: false,
            startTime: null,
            endTime: null,
            sessionsCompleted: prev.mode === 'focus' ? prev.sessionsCompleted + 1 : prev.sessionsCompleted,
            totalFocusTime: prev.mode === 'focus' ? 
              prev.totalFocusTime + TIMER_PRESETS[prev.mode] / 60 : 
              prev.totalFocusTime,
          }));
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
      timeLeft: TIMER_PRESETS[prev.mode],
    }));
  }, []);

  const setMode = useCallback((mode: TimerMode) => {
    setState(prev => ({
      ...prev,
      mode,
      isRunning: false,
      startTime: null,
      endTime: null,
      timeLeft: TIMER_PRESETS[mode],
    }));
  }, []);

  const clearSavedState = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    ...state,
    startTimer,
    pauseTimer,
    resetTimer,
    setMode,
    clearSavedState,
    presets: TIMER_PRESETS,
  };
};