import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/utils/logger';

const SUPABASE_URL = "https://thmyddcvpopzjbvmhbur.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRobXlkZGN2cG9wempidm1oYnVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMDA3OTksImV4cCI6MjA2OTg3Njc5OX0.yomXAXLBjy_9re1xyJDRNV5rSuLfeCwwyNtH-fJxJ1k";

// Enhanced Supabase client configuration for better performance and reliability
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    
    // Enhanced auth configuration for better reliability
    detectSessionInUrl: true,
    flowType: 'pkce',
    
    // Storage event handling
    storageKey: 'supabase.auth.token',
  },
  
  // Enhanced global configuration
  global: {
    headers: {
      'x-client-info': 'supabase-js-web/2.53.0',
    },
  },
  
  // Realtime configuration for better performance
  realtime: {
    params: {
      eventsPerSecond: 10, // Limit events to prevent overwhelming
    },
    heartbeatIntervalMs: 30000, // 30 second heartbeat
    reconnectAfterMs: (tries: number) => Math.min(tries * 1000, 30000), // Exponential backoff with cap
  },
  
  // Database configuration
  db: {
    schema: 'public',
  },
});

// Add connection state monitoring
let isOnline = navigator.onLine;

// Monitor connection status
window.addEventListener('online', () => {
  isOnline = true;
  logger.info('Connection restored, refreshing session');
  supabase.auth.refreshSession();
});

window.addEventListener('offline', () => {
  isOnline = false;
  logger.warn('Connection lost, operating in offline mode');
});

// Enhanced error handling for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  logger.info('Auth state changed', { event, userId: session?.user?.id });
  
  if (event === 'SIGNED_OUT') {
    // Clear any cached data on sign out
    localStorage.removeItem('supabase.auth.token');
  }
  
  if (event === 'TOKEN_REFRESHED') {
    logger.info('Auth token refreshed successfully');
  }
});

// Utility function to check connection status
export const isConnected = () => isOnline;

// Utility function to retry operations with exponential backoff
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        logger.error('Operation failed after all retries', { error: lastError, attempts: attempt + 1 });
        throw lastError;
      }
      
      const delay = initialDelay * Math.pow(2, attempt);
      logger.warn(`Operation failed, retrying in ${delay}ms`, { error: lastError, attempt: attempt + 1 });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};