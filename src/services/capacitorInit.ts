import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';

// Event emitter for splash coordination
type SplashEventListener = () => void;
const splashReadyListeners: SplashEventListener[] = [];

/**
 * Signal that the app is ready (auth checked, initial data loaded)
 * This will trigger the splash screen to hide
 */
export function signalAppReady() {
  splashReadyListeners.forEach(listener => listener());
}

/**
 * Wait for app to be ready
 * Returns a promise that resolves when signalAppReady() is called
 */
export function waitForAppReady(): Promise<void> {
  return new Promise((resolve) => {
    splashReadyListeners.push(resolve);
  });
}

/**
 * Coordinate the transition from native splash to web app
 * Call this after the web app is fully ready to take over
 */
export async function coordinateSplashTransition() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Small delay to ensure smooth handoff
    await new Promise(resolve => setTimeout(resolve, 100));
    await SplashScreen.hide({
      fadeOutDuration: 400
    });
    console.log('Native splash hidden, web app taking over');
  } catch (error) {
    console.warn('Failed to coordinate splash transition:', error);
    // Force hide even on error
    try {
      await SplashScreen.hide();
    } catch {}
  }
}

/**
 * Safety function to ensure splash always hides after a maximum duration
 * Prevents infinite splash scenarios if web app fails to load properly
 */
export async function ensureSplashHidden(maxWaitMs: number = 5000) {
  if (!Capacitor.isNativePlatform()) return;
  
  setTimeout(async () => {
    try {
      await SplashScreen.hide();
      console.log('Safety timeout: forced splash hide after', maxWaitMs, 'ms');
    } catch (error) {
      console.warn('Safety splash hide failed:', error);
    }
  }, maxWaitMs);
}

/**
 * Initialize Capacitor native UI features
 * Call this after the app has fully loaded
 */
export async function initializeCapacitorUI() {
  if (!Capacitor.isNativePlatform()) {
    console.log('Not running on native platform, skipping Capacitor UI init');
    return;
  }

  try {
    // Configure status bar immediately
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0A0A0A' });
    console.log('Status bar configured');
  } catch (error) {
    console.warn('Failed to configure status bar:', error);
  }

  try {
    // Configure keyboard behavior with CSS variable and custom events
    Keyboard.addListener('keyboardWillShow', (info) => {
      console.log('Keyboard will show with height:', info.keyboardHeight);
      // Set CSS variable for global keyboard-aware positioning
      document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
      // Dispatch custom event for React components
      window.dispatchEvent(new CustomEvent('keyboard-show', { detail: info }));
    });

    Keyboard.addListener('keyboardWillHide', () => {
      console.log('Keyboard will hide');
      document.documentElement.style.setProperty('--keyboard-height', '0px');
      window.dispatchEvent(new CustomEvent('keyboard-hide'));
    });
    console.log('Keyboard listeners configured');
  } catch (error) {
    console.warn('Failed to configure keyboard:', error);
  }
}

/**
 * Show splash screen (useful for showing during heavy operations)
 */
export async function showSplash() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await SplashScreen.show({
      autoHide: false,
      showDuration: 0
    });
  } catch (error) {
    console.warn('Failed to show splash screen:', error);
  }
}

/**
 * Hide splash screen
 */
export async function hideSplash() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await SplashScreen.hide({
      fadeOutDuration: 400
    });
  } catch (error) {
    console.warn('Failed to hide splash screen:', error);
  }
}

/**
 * Set status bar style based on theme
 */
export async function setStatusBarStyle(isDark: boolean) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color: isDark ? '#0A0A0A' : '#FFFFFF' });
  } catch (error) {
    console.warn('Failed to set status bar style:', error);
  }
}

/**
 * Hide status bar (for immersive experiences)
 */
export async function hideStatusBar() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.hide();
  } catch (error) {
    console.warn('Failed to hide status bar:', error);
  }
}

/**
 * Show status bar
 */
export async function showStatusBar() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.show();
  } catch (error) {
    console.warn('Failed to show status bar:', error);
  }
}
