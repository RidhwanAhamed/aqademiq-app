import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

/**
 * Hook to detect iOS keyboard height and visibility
 * Uses Capacitor Keyboard plugin on native, visualViewport API on web
 */
export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      // Use Capacitor Keyboard events on native
      const showListener = Keyboard.addListener('keyboardWillShow', (info) => {
        setKeyboardHeight(info.keyboardHeight);
        setIsKeyboardVisible(true);
        // Also set CSS variable for global access
        document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('keyboard-show', { detail: info }));
      });

      const hideListener = Keyboard.addListener('keyboardWillHide', () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
        document.documentElement.style.setProperty('--keyboard-height', '0px');
        window.dispatchEvent(new CustomEvent('keyboard-hide'));
      });

      return () => {
        showListener.then(l => l.remove());
        hideListener.then(l => l.remove());
      };
    } else {
      // Fallback: visualViewport API for web/Safari
      const handleResize = () => {
        const viewport = window.visualViewport;
        if (viewport) {
          const heightDiff = window.innerHeight - viewport.height;
          // Keyboard is likely visible if difference > 100px
          if (heightDiff > 100) {
            setKeyboardHeight(heightDiff);
            setIsKeyboardVisible(true);
            document.documentElement.style.setProperty('--keyboard-height', `${heightDiff}px`);
          } else {
            setKeyboardHeight(0);
            setIsKeyboardVisible(false);
            document.documentElement.style.setProperty('--keyboard-height', '0px');
          }
        }
      };

      window.visualViewport?.addEventListener('resize', handleResize);
      window.visualViewport?.addEventListener('scroll', handleResize);

      return () => {
        window.visualViewport?.removeEventListener('resize', handleResize);
        window.visualViewport?.removeEventListener('scroll', handleResize);
      };
    }
  }, []);

  return { keyboardHeight, isKeyboardVisible };
}
