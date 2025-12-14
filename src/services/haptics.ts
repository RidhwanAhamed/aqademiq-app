import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

/**
 * Haptic feedback service for native-like touch responses
 * Returns boolean indicating success/failure for proper UI feedback
 */
export const haptics = {
  /**
   * Light tap feedback - for button taps, selections
   */
  async light(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
      return true;
    } catch (e) {
      console.warn('Haptics not available:', e);
      return false;
    }
  },

  /**
   * Medium tap feedback - for toggles, confirmations
   */
  async medium(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
      return true;
    } catch (e) {
      console.warn('Haptics not available:', e);
      return false;
    }
  },

  /**
   * Heavy tap feedback - for important actions, completions
   */
  async heavy(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
      return true;
    } catch (e) {
      console.warn('Haptics not available:', e);
      return false;
    }
  },

  /**
   * Success notification - for task completion, achievements
   */
  async success(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      await Haptics.notification({ type: NotificationType.Success });
      return true;
    } catch (e) {
      console.warn('Haptics not available:', e);
      return false;
    }
  },

  /**
   * Warning notification - for alerts, conflicts
   */
  async warning(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      await Haptics.notification({ type: NotificationType.Warning });
      return true;
    } catch (e) {
      console.warn('Haptics not available:', e);
      return false;
    }
  },

  /**
   * Error notification - for failures, errors
   */
  async error(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      await Haptics.notification({ type: NotificationType.Error });
      return true;
    } catch (e) {
      console.warn('Haptics not available:', e);
      return false;
    }
  },

  /**
   * Selection changed - for picker changes, list selections
   */
  async selectionChanged(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      await Haptics.selectionChanged();
      return true;
    } catch (e) {
      console.warn('Haptics not available:', e);
      return false;
    }
  },

  /**
   * Vibrate for duration - for timer completion, alarms
   */
  async vibrate(duration: number = 300): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      await Haptics.vibrate({ duration });
      return true;
    } catch (e) {
      console.warn('Haptics not available:', e);
      return false;
    }
  }
};

export default haptics;
