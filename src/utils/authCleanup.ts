import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

/**
 * Clean up corrupted authentication state
 */
export const cleanupAuthState = async () => {
  try {
    logger.info('Starting auth state cleanup...');
    
    // Clear all auth-related storage comprehensively
    const authKeys = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || key.includes('auth') || key.includes('sb-')
    );
    
    authKeys.forEach(key => {
      localStorage.removeItem(key);
      logger.info(`Cleared localStorage key: ${key}`);
    });
    
    // Clear session storage
    sessionStorage.clear();
    
    // Force sign out from Supabase with global scope to ensure complete cleanup
    await supabase.auth.signOut({ scope: 'global' });
    
    logger.info('Auth state cleanup completed');
    return true;
  } catch (error) {
    logger.error('Auth cleanup failed:', error);
    // Force clear even if signOut fails
    localStorage.clear();
    sessionStorage.clear();
    return false;
  }
};

/**
 * Check if current session is valid with comprehensive validation
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
    
    // Additional validation - try to get user info
    const { error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      logger.error('User validation error:', userError);
      return false;
    }
    
    logger.info('Session validation successful');
    return true;
  } catch (error) {
    logger.error('Session validation failed:', error);
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