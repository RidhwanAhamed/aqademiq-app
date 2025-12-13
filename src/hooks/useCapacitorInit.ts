import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { syncManager } from '@/services/offline';
import { notificationService } from '@/services/notifications';
import { haptics } from '@/services/haptics';

/**
 * Hook to initialize all Capacitor native features
 * Call this once at app root level
 */
export function useCapacitorInit() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      console.log('Not running on native platform, skipping Capacitor init');
      return;
    }

    const initializeNativeFeatures = async () => {
      console.log('Initializing Capacitor native features...');

      // Initialize sync manager for offline support
      await syncManager.initialize();
      console.log('Sync manager initialized');

      // Initialize notifications
      await notificationService.initialize();
      await notificationService.initializeLocal();
      console.log('Notifications initialized');

      // Set up app state listeners
      CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
        console.log('App state changed:', isActive ? 'active' : 'background');
        
        if (isActive) {
          // App came to foreground - trigger sync
          syncManager.triggerSync();
          haptics.light();
        }
      });

      // Handle back button on Android
      CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          // Optionally show exit confirmation or minimize app
          CapacitorApp.minimizeApp();
        }
      });

      // Handle deep links
      CapacitorApp.addListener('appUrlOpen', (event) => {
        console.log('App opened with URL:', event.url);
        // Handle deep link routing here
        const url = new URL(event.url);
        if (url.pathname) {
          window.location.href = url.pathname + url.search;
        }
      });

      console.log('Capacitor native features initialized');
    };

    initializeNativeFeatures();

    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, []);
}

export default useCapacitorInit;
