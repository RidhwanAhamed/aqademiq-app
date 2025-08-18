import { useEffect } from 'react';
import { useSecurityAudit } from '@/hooks/useSecurityAudit';

/**
 * Security monitoring component for detecting and logging suspicious activities
 */
export function SecurityMonitor() {
  const { logEvent } = useSecurityAudit();

  useEffect(() => {
    // Monitor for suspicious activities
    const monitorSecurityEvents = () => {
      // Monitor console errors that might indicate XSS attempts
      const originalConsoleError = console.error;
      console.error = (...args) => {
        const message = args.join(' ');
        
        // Log potential security issues
        if (message.toLowerCase().includes('script') || 
            message.toLowerCase().includes('eval') ||
            message.toLowerCase().includes('unsafe')) {
          logEvent(
            'potential_xss_attempt',
            'console_error',
            undefined,
            { error_message: message, timestamp: new Date().toISOString() }
          );
        }
        
        originalConsoleError.apply(console, args);
      };

      // Monitor for navigation to suspicious URLs
      const handleLocationChange = () => {
        const url = window.location.href;
        
        // Check for suspicious URL patterns
        if (url.includes('javascript:') || url.includes('data:text/html')) {
          logEvent(
            'suspicious_navigation',
            'navigation',
            undefined,
            { url: url, timestamp: new Date().toISOString() }
          );
        }
      };

      // Monitor for paste events that might contain malicious content
      const handlePaste = (event: ClipboardEvent) => {
        const pastedData = event.clipboardData?.getData('text') || '';
        
        // Check for script tags or suspicious patterns
        if (pastedData.includes('<script') || 
            pastedData.includes('javascript:') ||
            pastedData.includes('eval(')) {
          logEvent(
            'suspicious_paste',
            'clipboard',
            undefined,
            { content_length: pastedData.length, timestamp: new Date().toISOString() }
          );
        }
      };

      // Monitor failed API requests that might indicate attacks
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        try {
          const response = await originalFetch(...args);
          
          // Log suspicious response patterns
          if (response.status === 403 || response.status === 401) {
            logEvent(
              'unauthorized_api_access',
              'api_request',
              undefined,
              { 
                url: args[0]?.toString() || 'unknown',
                status: response.status,
                timestamp: new Date().toISOString()
              }
            );
          }
          
          return response;
        } catch (error) {
          logEvent(
            'api_request_error',
            'api_request',
            undefined,
            { 
              url: args[0]?.toString() || 'unknown',
              error: error instanceof Error ? error.message : 'unknown',
              timestamp: new Date().toISOString()
            }
          );
          throw error;
        }
      };

      // Add event listeners
      window.addEventListener('popstate', handleLocationChange);
      document.addEventListener('paste', handlePaste);

      // Cleanup function
      return () => {
        console.error = originalConsoleError;
        window.fetch = originalFetch;
        window.removeEventListener('popstate', handleLocationChange);
        document.removeEventListener('paste', handlePaste);
      };
    };

    const cleanup = monitorSecurityEvents();

    return cleanup;
  }, [logEvent]);

  return null; // This component doesn't render anything
}