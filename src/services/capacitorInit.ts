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
  }
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
    // Configure keyboard behavior
    Keyboard.addListener('keyboardWillShow', (info) => {
      console.log('Keyboard will show with height:', info.keyboardHeight);
    });

    Keyboard.addListener('keyboardWillHide', () => {
      console.log('Keyboard will hide');
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
