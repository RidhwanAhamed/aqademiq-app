import { useState, useCallback } from 'react';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: () => string;
}

interface RateLimitState {
  requests: number[];
  blocked: boolean;
}

/**
 * Client-side rate limiting hook
 */
export function useRateLimit(config: RateLimitConfig) {
  const [state, setState] = useState<RateLimitState>({
    requests: [],
    blocked: false
  });

  const isRateLimited = useCallback((): boolean => {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    setState(prevState => {
      // Filter out old requests outside the window
      const recentRequests = prevState.requests.filter(timestamp => timestamp > windowStart);
      
      // Check if we're at the limit
      if (recentRequests.length >= config.maxRequests) {
        return {
          requests: recentRequests,
          blocked: true
        };
      }
      
      // Add current request
      const updatedRequests = [...recentRequests, now];
      
      return {
        requests: updatedRequests,
        blocked: false
      };
    });

    return state.blocked;
  }, [config.maxRequests, config.windowMs, state.blocked]);

  const resetRateLimit = useCallback(() => {
    setState({
      requests: [],
      blocked: false
    });
  }, []);

  const getRemainingRequests = useCallback((): number => {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const recentRequests = state.requests.filter(timestamp => timestamp > windowStart);
    
    return Math.max(0, config.maxRequests - recentRequests.length);
  }, [config.maxRequests, config.windowMs, state.requests]);

  const getResetTime = useCallback((): number => {
    if (state.requests.length === 0) return 0;
    
    const oldestRequest = Math.min(...state.requests);
    return oldestRequest + config.windowMs;
  }, [config.windowMs, state.requests]);

  return {
    isRateLimited,
    resetRateLimit,
    getRemainingRequests,
    getResetTime,
    isBlocked: state.blocked
  };
}