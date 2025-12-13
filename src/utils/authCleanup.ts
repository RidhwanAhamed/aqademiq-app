import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { STORAGE_KEYS } from '@/services/offline/types';

// Keys that should NEVER be cleared during auth cleanup (offline data)
const PROTECTED_KEYS = [
  STORAGE_KEYS.ENTITIES,
  STORAGE_KEYS.PENDING_OPS,
  STORAGE_KEYS.CONFLICTS,
  STORAGE_KEYS.SYNC_STATUS,
  STORAGE_KEYS.AUTH_SESSION,
  STORAGE_KEYS.ONBOARDING_STATUS,
];

/**
 * Clean up corrupted authentication state
 * @param isIntentionalLogout - If true, also clears protected offline auth cache
 */
export const cleanupAuthState = async (isIntentionalLogout: boolean = false) => {
  try {
    logger.info('Starting auth state cleanup...', { isIntentionalLogout });
    
    // Clear auth-related storage but PROTECT offline data keys
    const authKeys = Object.keys(localStorage).filter(key => {
      // Don't clear protected offline keys unless intentional logout
      if (!isIntentionalLogout && PROTECTED_KEYS.some(pk => key.includes(pk))) {
        return false;
      }
      return key.includes('supabase') || key.includes('auth') || key.includes('sb-');
    });
    
    authKeys.forEach(key => {
      localStorage.removeItem(key);
      logger.info(`Cleared localStorage key: ${key}`);
    });
    
    // Clear session storage
    sessionStorage.clear();
    
    // Only clear offline auth cache if intentional logout
    if (isIntentionalLogout) {
      localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
      localStorage.removeItem(STORAGE_KEYS.ONBOARDING_STATUS);
    }
    
    // Only sign out from Supabase if online
    if (navigator.onLine) {
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (e) {
        logger.warn('Failed to sign out from Supabase (might be offline):', e);
      }
    }
    
    logger.info('Auth state cleanup completed');
    return true;
  } catch (error) {
    logger.error('Auth cleanup failed:', error);
    return false;
  }
};

/**
 * Check if current session is valid with comprehensive validation
 * When offline, trusts locally cached session without network validation
 */
export const validateAuthSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      logger.error('Session validation error:', error);
      return false;
    }
    
    if (!session || !session.access_token) {
      logger.info('No valid session found');
      return false;
    }
    
    // Check if token is expired
    if (session.expires_at && session.expires_at * 1000 < Date.now()) {
      logger.warn('Session token expired');
      return false;
    }
    
    // CRITICAL: If offline, trust the cached session - don't make network calls
    if (!navigator.onLine) {
      logger.info('Offline - trusting cached session without network validation');
      return true;
    }
    
    // Only validate with network when online
    try {
      const { error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        // Check if it's a network error - if so, trust local session
        if (userError.message?.includes('fetch') || userError.message?.includes('network')) {
          logger.warn('Network error during validation, trusting local session');
          return true;
        }
        logger.error('User validation error:', userError);
        return false;
      }
    } catch (networkError) {
      // Network error - trust local session
      logger.warn('Network exception during validation, trusting local session');
      return true;
    }
    
    logger.info('Session validation successful');
    return true;
  } catch (error) {
    logger.error('Session validation failed:', error);
    // On any error while offline, trust local session
    if (!navigator.onLine) {
      return true;
    }
    return false;
  }
};

/**
 * Force refresh the authentication state with error handling
 */
export const refreshAuthState = async () => {
  try {
    logger.info('Refreshing auth state...');
    
    // First validate current session
    const isValid = await validateAuthSession();
    if (!isValid) {
      logger.warn('Current session invalid, cannot refresh');
      return false;
    }
    
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      logger.error('Failed to refresh session:', error);
      
      // If refresh fails due to network or token issues, attempt cleanup
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        logger.info('Network error detected, will retry later');
        return false;
      } else {
        logger.warn('Token corruption detected, cleaning up auth state');
        await cleanupAuthState();
        return false;
      }
    }
    
    if (!data.session) {
      logger.warn('No session returned from refresh, cleaning up');
      await cleanupAuthState();
      return false;
    }
    
    logger.info('Auth state refreshed successfully');
    return true;
  } catch (error) {
    logger.error('Auth refresh failed:', error);
    // On critical errors, clean up to prevent infinite loops
    await cleanupAuthState();
    return false;
  }
};

/**
 * Initialize auth state with proper error handling and recovery
 */
export const initializeAuthState = async () => {
  try {
    logger.info('Initializing auth state...');
    
    // First, check if we have a valid session
    const isValid = await validateAuthSession();
    
    if (!isValid) {
      // Attempt to refresh if we have stored tokens
      const refreshed = await refreshAuthState();
      if (!refreshed) {
        logger.info('No valid session, starting fresh');
        return null;
      }
    }
    
    // Get the current session after validation/refresh
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      logger.warn('Failed to get session after initialization');
      return null;
    }
    
    logger.info('Auth state initialized successfully', { userId: session.user?.id });
    return session;
  } catch (error) {
    logger.error('Auth initialization failed:', error);
    // Clean up on critical errors
    await cleanupAuthState();
    return null;
  }
};