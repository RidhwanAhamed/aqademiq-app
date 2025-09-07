import { logger } from '@/utils/logger';

export interface NetworkError {
  isNetworkError: boolean;
  isAuthError: boolean;
  userMessage: string;
  shouldRetry: boolean;
  retryAfter?: number;
}

/**
 * Enhanced error handler that distinguishes between network and authentication errors
 */
export const analyzeError = (error: any): NetworkError => {
  const errorMessage = error?.message || '';
  const errorName = error?.name || '';
  
  // Network connectivity errors
  if (
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('NetworkError') ||
    errorMessage.includes('fetch') ||
    errorName === 'TypeError' && errorMessage.includes('fetch') ||
    errorName === 'AuthRetryableFetchError'
  ) {
    logger.warn('Network connectivity error detected', { error: errorMessage });
    return {
      isNetworkError: true,
      isAuthError: false,
      userMessage: 'Unable to connect to authentication servers. Please check your internet connection and try again.',
      shouldRetry: true,
      retryAfter: 3000
    };
  }

  // Rate limiting errors
  if (errorMessage.includes('rate_limit') || errorMessage.includes('too many requests')) {
    return {
      isNetworkError: false,
      isAuthError: false,
      userMessage: 'Too many login attempts. Please wait a moment before trying again.',
      shouldRetry: true,
      retryAfter: 30000
    };
  }

  // Authentication-specific errors
  if (errorMessage.includes('Invalid login credentials')) {
    return {
      isNetworkError: false,
      isAuthError: true,
      userMessage: 'Invalid email or password. Please check your credentials and try again.',
      shouldRetry: false
    };
  }

  if (errorMessage.includes('Email not confirmed')) {
    return {
      isNetworkError: false,
      isAuthError: true,
      userMessage: 'Please check your email and click the confirmation link before signing in.',
      shouldRetry: false
    };
  }

  if (errorMessage.includes('User already registered')) {
    return {
      isNetworkError: false,
      isAuthError: true,
      userMessage: 'An account with this email already exists. Please sign in instead.',
      shouldRetry: false
    };  
  }

  // CORS or domain configuration errors
  if (errorMessage.includes('CORS') || errorMessage.includes('Access-Control')) {
    return {
      isNetworkError: true,
      isAuthError: false,
      userMessage: 'Authentication service configuration issue. Please try again later.',
      shouldRetry: true,
      retryAfter: 5000
    };
  }

  // Default case for unknown errors
  logger.error('Unknown authentication error', { error });
  return {
    isNetworkError: false,
    isAuthError: false,
    userMessage: 'An unexpected error occurred. Please try again.',
    shouldRetry: true,
    retryAfter: 2000
  };
};

/**
 * Check if the user is online
 */
export const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * Test basic connectivity to Supabase
 */
export const testSupabaseConnectivity = async (supabaseUrl: string, apiKey: string): Promise<boolean> => {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    return response.ok;
  } catch (error) {
    logger.error('Supabase connectivity test failed', { error });
    return false;
  }
};

/**
 * Enhanced retry mechanism with exponential backoff
 */
export const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const errorInfo = analyzeError(error);
      
      // Don't retry auth errors or if we've exceeded max retries
      if (!errorInfo.shouldRetry || attempt === maxRetries) {
        throw error;
      }
      
      // Wait with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt), 10000);
      logger.info(`Retrying operation in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};