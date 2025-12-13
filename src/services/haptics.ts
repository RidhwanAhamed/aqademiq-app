import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

/**
 * Haptic feedback service for native-like touch responses
 */
export const haptics = {
  /**
   * Light tap feedback - for button taps, selections
   */
  async light() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      console.warn('Haptics not available:', e);
    }
  },

  /**
   * Medium tap feedback - for toggles, confirmations
   */
  async medium() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {
      console.warn('Haptics not available:', e);
    }
  },

  /**
   * Heavy tap feedback - for important actions, completions
   */
  async heavy() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (e) {
      console.warn('Haptics not available:', e);
    }
  },

  /**
   * Success notification - for task completion, achievements
   */
  async success() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch (e) {
      console.warn('Haptics not available:', e);
    }
  },

  /**
   * Warning notification - for alerts, conflicts
   */
  async warning() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch (e) {
      console.warn('Haptics not available:', e);
    }
  },

  /**
   * Error notification - for failures, errors
   */
  async error() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch (e) {
      console.warn('Haptics not available:', e);
    }
  },

  /**
   * Selection changed - for picker changes, list selections
   */
  async selectionChanged() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await Haptics.selectionChanged();
    } catch (e) {
      console.warn('Haptics not available:', e);
    }
  },

  /**
   * Vibrate for duration - for timer completion, alarms
   */
  async vibrate(duration: number = 300) {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await Haptics.vibrate({ duration });
    } catch (e) {
      console.warn('Haptics not available:', e);
    }
  }
};

export default haptics;
