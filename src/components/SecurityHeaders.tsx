import { useEffect } from 'react';

/**
 * Enhanced Security Headers Component
 * Implements comprehensive client-side security measures including CSP, 
 * security headers, and runtime security monitoring
 */
export function SecurityHeaders() {
  useEffect(() => {
    // Generate cryptographically secure nonce for CSP
    const generateSecureNonce = () => {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    };

    // Enhanced Content Security Policy with stricter rules
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      const cspMeta = document.createElement('meta');
      cspMeta.httpEquiv = 'Content-Security-Policy';
      const nonce = generateSecureNonce();
      
      // Store nonce for potential inline script validation
      (window as any).__csp_nonce = nonce;
      
      cspMeta.content = [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}' https://apis.google.com https://accounts.google.com 'unsafe-eval'`,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https://thmyddcvpopzjbvmhbur.supabase.co https://apis.google.com https://accounts.google.com wss://thmyddcvpopzjbvmhbur.supabase.co",
        "frame-src 'self' https://accounts.google.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "block-all-mixed-content",
        "upgrade-insecure-requests"
      ].join('; ');
      document.head.appendChild(cspMeta);
    }

    // Comprehensive security headers with enhanced protection
    const enhancedSecurityHeaders = [
      { name: 'X-Content-Type-Options', content: 'nosniff' },
      { name: 'X-Frame-Options', content: 'DENY' },
      { name: 'X-XSS-Protection', content: '1; mode=block' },
      { name: 'Referrer-Policy', content: 'strict-origin-when-cross-origin' },
      { name: 'Permissions-Policy', content: 'geolocation=(), microphone=(), camera=(), payment=(), usb=()' },
      { name: 'Cross-Origin-Embedder-Policy', content: 'require-corp' },
      { name: 'Cross-Origin-Opener-Policy', content: 'same-origin' },
      { name: 'Cross-Origin-Resource-Policy', content: 'cross-origin' }
    ];

    enhancedSecurityHeaders.forEach(({ name, content }) => {
      if (!document.querySelector(`meta[name="${name}"]`)) {
        const meta = document.createElement('meta');
        meta.name = name;
        meta.content = content;
        document.head.appendChild(meta);
      }
    });

    // Runtime Security Monitoring
    const monitorSecurityViolations = () => {
      // CSP Violation Reporting
      document.addEventListener('securitypolicyviolation', (event) => {
        console.warn('CSP Violation:', {
          blockedURI: event.blockedURI,
          violatedDirective: event.violatedDirective,
          originalPolicy: event.originalPolicy,
          timestamp: new Date().toISOString()
        });
        
        // Log security violation (in production, send to security monitoring service)
        if (typeof window !== 'undefined' && (window as any).supabase) {
          (window as any).supabase.functions.invoke('security-middleware', {
            body: {
              type: 'csp_violation',
              blockedURI: event.blockedURI,
              violatedDirective: event.violatedDirective,
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString()
            }
          }).catch((error: any) => console.error('Failed to log CSP violation:', error));
        }
      });

      // Detect potential XSS attempts with improved innerHTML override
      const originalInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')?.set;
      if (originalInnerHTML) {
        Object.defineProperty(Element.prototype, 'innerHTML', {
          set: function(value: string) {
            if (typeof value === 'string' && value.length > 0) {
              // Only check for obvious XSS patterns, be less aggressive
              const dangerousPatterns = [
                /<script[^>]*src\s*=\s*['"][^'"]*javascript:/gi,
                /<script[^>]*>[\s\S]*?(alert|confirm|prompt|eval)\s*\(/gi,
                /javascript:\s*(alert|confirm|prompt|eval|document\.)/gi,
                /<iframe[^>]*src\s*=\s*['"][^'"]*javascript:/gi
              ];
              
              const isDangerous = dangerousPatterns.some(pattern => pattern.test(value));
              if (isDangerous) {
                console.warn('Potentially malicious HTML blocked:', value.substring(0, 100) + '...');
                return;
              }
            }
            
            try {
              originalInnerHTML?.call(this, value);
            } catch (error) {
              console.error('innerHTML assignment failed:', error);
            }
          },
          get: function() {
            return Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')?.get?.call(this);
          },
          configurable: true
        });
      }
    };

    // Initialize security monitoring
    monitorSecurityViolations();

    // Disable right-click and F12 in production (optional security through obscurity)
    if (process.env.NODE_ENV === 'production') {
      document.addEventListener('contextmenu', (e) => e.preventDefault());
      document.addEventListener('keydown', (e) => {
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
          e.preventDefault();
        }
      });
    }

    // Session Security: Implement automatic logout on suspicious activity
    let lastActivity = Date.now();
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    const MAX_SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours
    const sessionStart = Date.now();

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const updateActivity = () => {
      lastActivity = Date.now();
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Check session validity periodically
    const sessionCheckInterval = setInterval(() => {
      const now = Date.now();
      const inactive = now - lastActivity > INACTIVITY_TIMEOUT;
      const expired = now - sessionStart > MAX_SESSION_DURATION;

      if (inactive || expired) {
        console.warn('Session security check failed:', { inactive, expired });
        
        // Clear sensitive data from localStorage/sessionStorage
        const sensitiveKeys = ['supabase.auth.token', 'google.oauth.state'];
        sensitiveKeys.forEach(key => {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        });

        // Redirect to login if user is authenticated
        if (typeof window !== 'undefined' && window.location.pathname !== '/auth') {
          window.location.href = '/auth?session_expired=true';
        }

        clearInterval(sessionCheckInterval);
      }
    }, 60000); // Check every minute

    // Cleanup function
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
      clearInterval(sessionCheckInterval);
    };
  }, []);

  return null;
}