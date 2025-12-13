import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { useOfflineAuth } from './useOfflineAuth';
import { offlineStorage } from '@/services/offline/storage';

export interface OfflineStartupState {
  isInitialized: boolean;
  isOffline: boolean;
  hasCachedSession: boolean;
  hasCachedData: boolean;
  isRestoring: boolean;
  error: string | null;
}

/**
 * Hook to handle offline app startup
 * Detects if app is opening while offline and restores cached data
 */
export function useOfflineStartup() {
  const [state, setState] = useState<OfflineStartupState>({
    isInitialized: false,
    isOffline: !navigator.onLine,
    hasCachedSession: false,
    hasCachedData: false,
    isRestoring: true,
    error: null,
  });

  const { getCachedSession, getCachedOnboardingStatus } = useOfflineAuth();

  const checkNetworkStatus = useCallback(async (): Promise<boolean> => {
    if (Capacitor.isNativePlatform()) {
      try {
        const status = await Network.getStatus();
        return !status.connected;
      } catch {
        return !navigator.onLine;
      }
    }
    return !navigator.onLine;
  }, []);

  const initializeOfflineStartup = useCallback(async () => {
    console.log('[OfflineStartup] Initializing...');
    
    try {
      // Check network status
      const isOffline = await checkNetworkStatus();
      console.log('[OfflineStartup] Network status:', isOffline ? 'OFFLINE' : 'ONLINE');

      // Check for cached session
      const cachedSession = await getCachedSession();
      const hasCachedSession = !!cachedSession;
      console.log('[OfflineStartup] Cached session:', hasCachedSession ? 'FOUND' : 'NOT FOUND');

      // Check for cached data
      let hasCachedData = false;
      if (cachedSession) {
        const onboardingStatus = await getCachedOnboardingStatus(cachedSession.userId);
        hasCachedData = !!onboardingStatus;
        
        // Also check if we have any cached entities
        const cachedAssignments = await offlineStorage.getEntities('assignments');
        const cachedCourses = await offlineStorage.getEntities('courses');
        hasCachedData = hasCachedData || 
          Object.keys(cachedAssignments).length > 0 || 
          Object.keys(cachedCourses).length > 0;
      }
      console.log('[OfflineStartup] Cached data:', hasCachedData ? 'FOUND' : 'NOT FOUND');

      setState({
        isInitialized: true,
        isOffline,
        hasCachedSession,
        hasCachedData,
        isRestoring: false,
        error: null,
      });

    } catch (error) {
      console.error('[OfflineStartup] Error:', error);
      setState(prev => ({
        ...prev,
        isInitialized: true,
        isRestoring: false,
        error: error instanceof Error ? error.message : 'Failed to initialize offline startup',
      }));
    }
  }, [checkNetworkStatus, getCachedSession, getCachedOnboardingStatus]);

  // Initialize on mount
  useEffect(() => {
    initializeOfflineStartup();
  }, [initializeOfflineStartup]);

  // Listen for network changes
  useEffect(() => {
    const handleOnline = () => {
      console.log('[OfflineStartup] Network came online');
      setState(prev => ({ ...prev, isOffline: false }));
    };

    const handleOffline = () => {
      console.log('[OfflineStartup] Network went offline');
      setState(prev => ({ ...prev, isOffline: true }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Also listen via Capacitor Network plugin for native
    let unsubscribe: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      Network.addListener('networkStatusChange', (status) => {
        if (status.connected) {
          handleOnline();
        } else {
          handleOffline();
        }
      }).then(handle => {
        unsubscribe = () => handle.remove();
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe?.();
    };
  }, []);

  return {
    ...state,
    retry: initializeOfflineStartup,
  };
}

export default useOfflineStartup;
