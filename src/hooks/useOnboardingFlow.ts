import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useOfflineAuth } from '@/hooks/useOfflineAuth';
import { logger } from '@/utils/logger';

export function useOnboardingFlow() {
  const { user, loading: authLoading } = useAuth();
  const { cacheOnboardingStatus, getCachedOnboardingStatus } = useOfflineAuth();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [hasSemester, setHasSemester] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const checkOnboardingStatus = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    // FIRST: Check if we're offline and have cached status
    if (!navigator.onLine) {
      logger.info('Offline - checking cached onboarding status');
      const cached = await getCachedOnboardingStatus(user.id);
      
      if (cached) {
        logger.info('Using cached onboarding status', cached);
        setHasProfile(cached.hasProfile);
        setHasSemester(cached.hasSemester);
        setLoading(false);
        return;
      }
      
      // No cached data while offline - assume onboarding is complete
      // to prevent showing onboarding flow incorrectly
      logger.warn('Offline with no cached onboarding status - assuming complete');
      setHasProfile(true);
      setHasSemester(true);
      setLoading(false);
      return;
    }

    // Online - fetch from database
    try {
      // Check if user has completed onboarding
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, onboarding_completed')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        // Network error - try cache
        if (profileError.message?.includes('fetch') || profileError.message?.includes('network')) {
          logger.warn('Network error fetching profile, trying cache');
          const cached = await getCachedOnboardingStatus(user.id);
          if (cached) {
            setHasProfile(cached.hasProfile);
            setHasSemester(cached.hasSemester);
            setLoading(false);
            return;
          }
        }
        throw profileError;
      }

      // If onboarding is explicitly marked as completed, skip all checks
      if (profile?.onboarding_completed) {
        setHasProfile(true);
        setHasSemester(true);
        // Cache the status
        await cacheOnboardingStatus(user.id, true, true, true);
        setLoading(false);
        return;
      }

      const profileComplete = profile?.full_name && profile.full_name.trim() !== '' && profile.full_name !== user.email;
      setHasProfile(profileComplete);

      // Check if user has an active semester
      const { data: semester, error: semesterError } = await supabase
        .from('semesters')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (semesterError) {
        // Network error - try cache
        if (semesterError.message?.includes('fetch') || semesterError.message?.includes('network')) {
          logger.warn('Network error fetching semester, trying cache');
          const cached = await getCachedOnboardingStatus(user.id);
          if (cached) {
            setHasSemester(cached.hasSemester);
            setLoading(false);
            return;
          }
        }
        throw semesterError;
      }

      const semesterComplete = !!semester;
      setHasSemester(semesterComplete);

      // Cache the status for offline use
      await cacheOnboardingStatus(
        user.id,
        !!profileComplete,
        semesterComplete,
        !!profile?.onboarding_completed
      );
    } catch (error) {
      logger.error('Error checking onboarding status:', error);
      
      // On error, try cached data first
      const cached = await getCachedOnboardingStatus(user.id);
      if (cached) {
        logger.info('Using cached onboarding status after error', cached);
        setHasProfile(cached.hasProfile);
        setHasSemester(cached.hasSemester);
      } else {
        // No cache and error - assume complete to avoid blocking user
        logger.warn('No cached onboarding status after error - assuming complete');
        setHasProfile(true);
        setHasSemester(true);
      }
    } finally {
      setLoading(false);
    }
  }, [user, cacheOnboardingStatus, getCachedOnboardingStatus]);

  useEffect(() => {
    if (authLoading) return;
    checkOnboardingStatus();
  }, [authLoading, checkOnboardingStatus]);

  return {
    loading: authLoading || loading,
    hasProfile,
    hasSemester,
    needsOnboarding: user ? (hasProfile === false || hasSemester === false) : false,
    isAuthenticated: !!user
  };
}
