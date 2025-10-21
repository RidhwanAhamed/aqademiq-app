/**
 * Mobile-First Utilities
 * Touch detection, haptic feedback, and mobile helpers
 */

// Touch target validation
export const TOUCH_TARGET = {
  MIN: 48, // Material Design minimum
  COMFORTABLE: 56, // Comfortable for primary actions
  SPACING: 8, // Minimum spacing between targets
} as const;

// Detect if device supports touch
export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
};

// Check if running in standalone PWA mode
export const isPWA = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
};

// Detect platform
export type MobilePlatform = 'ios' | 'android' | 'desktop';

export const detectPlatform = (): MobilePlatform => {
  if (typeof window === 'undefined') return 'desktop';
  
  const userAgent = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
  if (/android/.test(userAgent)) return 'android';
  return 'desktop';
};

// Haptic feedback wrapper (vibration API)
export const haptics = {
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  },
  heavy: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  },
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 50, 10]);
    }
  },
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 100, 50]);
    }
  },
};

// Validate touch target size
export const validateTouchTarget = (
  element: HTMLElement
): { valid: boolean; width: number; height: number } => {
  const rect = element.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  const valid = width >= TOUCH_TARGET.MIN && height >= TOUCH_TARGET.MIN;
  
  return { valid, width, height };
};

// Safe area insets helper (for iOS notch)
export const getSafeAreaInsets = () => {
  if (typeof window === 'undefined') return { top: 0, right: 0, bottom: 0, left: 0 };
  
  const style = getComputedStyle(document.documentElement);
  return {
    top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0'),
    right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0'),
    bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
    left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0'),
  };
};

// Prevent elastic scroll on iOS (for modals/drawers)
export const preventElasticScroll = (element: HTMLElement) => {
  let startY = 0;
  
  const handleTouchStart = (e: TouchEvent) => {
    startY = e.touches[0].pageY;
  };
  
  const handleTouchMove = (e: TouchEvent) => {
    const currentY = e.touches[0].pageY;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const height = element.clientHeight;
    
    const isAtTop = scrollTop <= 0 && currentY > startY;
    const isAtBottom = scrollTop + height >= scrollHeight && currentY < startY;
    
    if (isAtTop || isAtBottom) {
      e.preventDefault();
    }
  };
  
  element.addEventListener('touchstart', handleTouchStart, { passive: false });
  element.addEventListener('touchmove', handleTouchMove, { passive: false });
  
  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchmove', handleTouchMove);
  };
};
