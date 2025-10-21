import { useRef, useCallback, useState } from 'react';
import { haptics } from '@/lib/mobileUtils';

export interface GestureConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onLongPress?: () => void;
  swipeThreshold?: number;
  longPressDelay?: number;
  enableHaptics?: boolean;
}

export interface GestureState {
  isSwiping: boolean;
  swipeDirection: 'left' | 'right' | 'up' | 'down' | null;
  isLongPressing: boolean;
}

export const useGestures = (config: GestureConfig) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onLongPress,
    swipeThreshold = 50,
    longPressDelay = 500,
    enableHaptics = true,
  } = config;

  const [state, setState] = useState<GestureState>({
    isSwiping: false,
    swipeDirection: null,
    isLongPressing: false,
  });

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    // Start long press timer
    if (onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, isLongPressing: true }));
        if (enableHaptics) haptics.medium();
        onLongPress();
      }, longPressDelay);
    }
  }, [onLongPress, longPressDelay, enableHaptics]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Cancel long press if finger moves
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    // Determine swipe direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > 10) {
        setState(prev => ({
          ...prev,
          isSwiping: true,
          swipeDirection: deltaX > 0 ? 'right' : 'left',
        }));
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > 10) {
        setState(prev => ({
          ...prev,
          isSwiping: true,
          swipeDirection: deltaY > 0 ? 'down' : 'up',
        }));
      }
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Check if it's a valid swipe (distance > threshold, time < 300ms)
    if (deltaTime < 300) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (Math.abs(deltaX) > swipeThreshold) {
          if (deltaX > 0 && onSwipeRight) {
            if (enableHaptics) haptics.light();
            onSwipeRight();
          } else if (deltaX < 0 && onSwipeLeft) {
            if (enableHaptics) haptics.light();
            onSwipeLeft();
          }
        }
      } else {
        // Vertical swipe
        if (Math.abs(deltaY) > swipeThreshold) {
          if (deltaY > 0 && onSwipeDown) {
            if (enableHaptics) haptics.light();
            onSwipeDown();
          } else if (deltaY < 0 && onSwipeUp) {
            if (enableHaptics) haptics.light();
            onSwipeUp();
          }
        }
      }
    }

    // Reset state
    setState({
      isSwiping: false,
      swipeDirection: null,
      isLongPressing: false,
    });
    touchStartRef.current = null;
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, swipeThreshold, enableHaptics]);

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    state,
  };
};
