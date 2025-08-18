import { useEffect } from 'react';

/**
 * Security Headers Component
 * Adds Content Security Policy and other security headers via meta tags
 */
export function SecurityHeaders() {
  useEffect(() => {
    // Add CSP meta tag if not already present
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      const cspMeta = document.createElement('meta');
      cspMeta.httpEquiv = 'Content-Security-Policy';
      // Generate nonce for inline scripts
      const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
      
      cspMeta.content = [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}' https://apis.google.com https://accounts.google.com`,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https://thmyddcvpopzjbvmhbur.supabase.co https://apis.google.com https://accounts.google.com wss://thmyddcvpopzjbvmhbur.supabase.co",
        "frame-src 'self' https://accounts.google.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests"
      ].join('; ');
      document.head.appendChild(cspMeta);
    }

    // Add other security headers
    const securityHeaders = [
      { name: 'X-Content-Type-Options', content: 'nosniff' },
      { name: 'X-Frame-Options', content: 'DENY' },
      { name: 'X-XSS-Protection', content: '1; mode=block' },
      { name: 'Referrer-Policy', content: 'strict-origin-when-cross-origin' }
    ];

    securityHeaders.forEach(({ name, content }) => {
      if (!document.querySelector(`meta[name="${name}"]`)) {
        const meta = document.createElement('meta');
        meta.name = name;
        meta.content = content;
        document.head.appendChild(meta);
      }
    });
  }, []);

  return null;
}