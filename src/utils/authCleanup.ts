import { supabase } from '@/config/supabaseClient';
import { logger } from '@/utils/logger';

/**
 * Clean up corrupted authentication state
 */
export const cleanupAuthState = async () => {
  try {
    logger.info('Starting auth state cleanup...');
    
    // Clear all auth-related storage
    localStorage.removeItem('supabase.auth.token');
    sessionStorage.clear();
    
    // Clear any other auth-related localStorage keys
    const authKeys = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || key.includes('auth')
    );
    
    authKeys.forEach(key => {
      localStorage.removeItem(key);
      logger.info(`Cleared localStorage key: ${key}`);
    });
    
    // Force sign out from Supabase
    await supabase.auth.signOut({ scope: 'local' });
    
    logger.info('Auth state cleanup completed');
    return true;
  } catch (error) {
    logger.error('Auth cleanup failed:', error);
    return false;
  }
};

/**
 * Check if current session is valid
 */
export const validateAuthSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      logger.error('Session validation error:', error);
      return false;
    }
    
    if (!session) {
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
 * Force refresh the authentication state
 */
export const refreshAuthState = async () => {
  try {
    logger.info('Refreshing auth state...');
    
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      logger.error('Failed to refresh session:', error);
      return false;
    }
    
    logger.info('Auth state refreshed successfully');
    return true;
  } catch (error) {
    logger.error('Auth refresh failed:', error);
    return false;
  }
};