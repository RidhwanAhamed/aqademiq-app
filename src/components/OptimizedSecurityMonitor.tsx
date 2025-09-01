import { useEffect, useRef } from 'react';
import { useSecurityAudit } from '@/hooks/useSecurityAudit';
import { logger } from '@/utils/logger';

/**
 * Optimized security monitoring component with reduced performance impact
 */
export function OptimizedSecurityMonitor() {
  const { logEvent } = useSecurityAudit();
  const isMonitoringRef = useRef(false);
  const isDevelopment = process.env.NODE_ENV === 'development';

  useEffect(() => {
    // Skip monitoring in development for better performance
    if (isDevelopment || isMonitoringRef.current) {
      return;
    }

    isMonitoringRef.current = true;
    logger.info('Initializing optimized security monitor');

    // Throttled monitoring to reduce overhead
    let securityEventCount = 0;
    const SECURITY_EVENT_LIMIT = 10; // Max events per minute
    const RESET_INTERVAL = 60000; // 1 minute

    // Reset event count every minute
    const resetInterval = setInterval(() => {
      securityEventCount = 0;
    }, RESET_INTERVAL);

    const logSecurityEvent = (type: string, category: string, details: any) => {
      if (securityEventCount >= SECURITY_EVENT_LIMIT) {
        return; // Rate limit security events
      }
      
      securityEventCount++;
      logEvent(type, category, undefined, {
        ...details,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      });
    };

    // Optimized console error monitoring (throttled)
    const originalConsoleError = console.error;
    let lastErrorTime = 0;
    const ERROR_THROTTLE = 5000; // 5 seconds between similar errors

    console.error = (...args) => {
      const now = Date.now();
      const message = args.join(' ').toLowerCase();
      
      // Only log security-relevant errors and throttle them
      if (now - lastErrorTime > ERROR_THROTTLE && 
          (message.includes('script') || message.includes('unsafe'))) {
        lastErrorTime = now;
        logSecurityEvent(
          'potential_security_issue',
          'console_error',
          { 
            error_type: 'console_error',
            message: args.join(' ').substring(0, 500), // Limit message length
          }
        );
      }
      
      originalConsoleError.apply(console, args);
    };

    // Simplified URL monitoring (only for obvious threats)
    const handleLocationChange = () => {
      const url = window.location.href;
      
      // Only check for obvious security threats
      if (url.includes('javascript:') || url.includes('data:text/html')) {
        logSecurityEvent(
          'suspicious_navigation',
          'navigation',
          { 
            url: url.substring(0, 200), // Limit URL length
            origin: window.location.origin,
          }
        );
      }
    };

    // Optimized fetch monitoring (only for auth-related failures)
    const originalFetch = window.fetch;
    let fetchErrorCount = 0;
    const MAX_FETCH_ERRORS = 5; // Max logged errors per minute

    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        // Only log repeated auth failures (potential brute force)
        if (response.status === 401 && fetchErrorCount < MAX_FETCH_ERRORS) {
          const url = args[0]?.toString() || 'unknown';
          if (url.includes('auth') || url.includes('login')) {
            fetchErrorCount++;
            logSecurityEvent(
              'repeated_auth_failure',
              'api_request',
              { 
                url: url.substring(0, 100),
                status: response.status,
                count: fetchErrorCount,
              }
            );
          }
        }
        
        return response;
      } catch (error) {
        // Only log network errors for security endpoints
        const url = args[0]?.toString() || 'unknown';
        if (url.includes('auth') || url.includes('security')) {
          logSecurityEvent(
            'security_endpoint_error',
            'api_request',
            { 
              url: url.substring(0, 100),
              error: error instanceof Error ? error.message.substring(0, 200) : 'unknown',
            }
          );
        }
        throw error;
      }
    };

    // Add minimal event listeners
    window.addEventListener('popstate', handleLocationChange, { passive: true });

    // Cleanup function
    return () => {
      isMonitoringRef.current = false;
      console.error = originalConsoleError;
      window.fetch = originalFetch;
      window.removeEventListener('popstate', handleLocationChange);
      clearInterval(resetInterval);
      logger.info('Security monitor cleanup completed');
    };
  }, [logEvent, isDevelopment]);

  return null; // This component doesn't render anything
}