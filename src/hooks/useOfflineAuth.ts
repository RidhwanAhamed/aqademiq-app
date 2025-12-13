import { useEffect, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { offlineStorage } from '@/services/offline/storage';
import { STORAGE_KEYS, CachedAuthSession, CachedOnboardingStatus } from '@/services/offline/types';
import { logger } from '@/utils/logger';

/**
 * Hook to manage offline auth session caching
 * Caches session when online for use during offline periods
 */
export function useOfflineAuth() {
  /**
   * Cache the current auth session for offline use
   */
  const cacheSession = useCallback(async (session: Session | null, user: User | null) => {
    if (!session || !user) {
      return;
    }

    try {
      const cachedSession: CachedAuthSession = {
        userId: user.id,
        email: user.email,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at || 0,
        userMetadata: user.user_metadata || {},
        cachedAt: Date.now(),
      };

      await offlineStorage.set(STORAGE_KEYS.AUTH_SESSION, cachedSession);
      logger.info('Auth session cached for offline use', { userId: user.id });
    } catch (error) {
      logger.error('Failed to cache auth session:', error);
    }
  }, []);

  /**
   * Get cached auth session for offline use
   */
  const getCachedSession = useCallback(async (): Promise<CachedAuthSession | null> => {
    try {
      const cached = await offlineStorage.get<CachedAuthSession>(STORAGE_KEYS.AUTH_SESSION);
      
      if (!cached) {
        return null;
      }

      // Check if cached session is still valid (not expired)
      // Allow some buffer for offline usage (24 hours past expiry)
      const offlineBuffer = 24 * 60 * 60 * 1000; // 24 hours
      if (cached.expiresAt * 1000 + offlineBuffer < Date.now()) {
        logger.warn('Cached session expired beyond offline buffer');
        return null;
      }

      return cached;
    } catch (error) {
      logger.error('Failed to get cached session:', error);
      return null;
    }
  }, []);

  /**
   * Cache onboarding status for offline use
   */
  const cacheOnboardingStatus = useCallback(async (
    userId: string,
    hasProfile: boolean,
    hasSemester: boolean,
    onboardingCompleted: boolean
  ) => {
    try {
      const status: CachedOnboardingStatus = {
        userId,
        hasProfile,
        hasSemester,
        onboardingCompleted,
        cachedAt: Date.now(),
      };

      await offlineStorage.set(STORAGE_KEYS.ONBOARDING_STATUS, status);
      logger.info('Onboarding status cached for offline use', { userId, hasProfile, hasSemester });
    } catch (error) {
      logger.error('Failed to cache onboarding status:', error);
    }
  }, []);

  /**
   * Get cached onboarding status
   */
  const getCachedOnboardingStatus = useCallback(async (userId: string): Promise<CachedOnboardingStatus | null> => {
    try {
      const cached = await offlineStorage.get<CachedOnboardingStatus>(STORAGE_KEYS.ONBOARDING_STATUS);
      
      if (!cached || cached.userId !== userId) {
        return null;
      }

      // Cache is valid for 7 days
      const maxAge = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - cached.cachedAt > maxAge) {
        logger.info('Onboarding status cache expired');
        return null;
      }

      return cached;
    } catch (error) {
      logger.error('Failed to get cached onboarding status:', error);
      return null;
    }
  }, []);

  /**
   * Clear cached auth data (for logout)
   */
  const clearCachedAuth = useCallback(async () => {
    try {
      await offlineStorage.remove(STORAGE_KEYS.AUTH_SESSION);
      await offlineStorage.remove(STORAGE_KEYS.ONBOARDING_STATUS);
      logger.info('Cleared cached auth data');
    } catch (error) {
      logger.error('Failed to clear cached auth:', error);
    }
  }, []);

  return {
    cacheSession,
    getCachedSession,
    cacheOnboardingStatus,
    getCachedOnboardingStatus,
    clearCachedAuth,
  };
}
