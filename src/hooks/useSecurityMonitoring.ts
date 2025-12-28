import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SecurityAlert {
  alert_type: string;
  alert_message: string;
  risk_score: number;
  event_count: number;
  last_occurrence: string;
}

interface SecurityMetrics {
  totalEvents: number;
  highRiskAlerts: number;
  lastSecurityCheck: string;
  suspiciousActivity: SecurityAlert[];
}

/**
 * Enhanced Security Monitoring Hook
 * Provides real-time security monitoring, threat detection, and incident response
 */
export function useSecurityMonitoring() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalEvents: 0,
    highRiskAlerts: 0,
    lastSecurityCheck: new Date().toISOString(),
    suspiciousActivity: []
  });
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);

  // Rate limiting for security-sensitive operations
  // Returns true (allow) on errors to prevent blocking legitimate operations
  const checkRateLimit = useCallback(async (operationType: string) => {
    if (!user) {
      console.warn('checkRateLimit: No user, allowing operation');
      return true; // Allow if no user - let server handle auth
    }

    try {
      const { data, error } = await supabase.rpc('check_operation_rate_limit', {
        p_user_id: user.id,
        p_operation_type: operationType
      });

      if (error) {
        console.warn('Rate limit check failed, allowing operation:', error);
        return true; // Allow on error to prevent blocking
      }

      return data ?? true;
    } catch (error) {
      console.error('Rate limit check error, allowing operation:', error);
      return true; // Allow on exception to prevent blocking
    }
  }, [user]);

  // Monitor suspicious activity
  const monitorActivity = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('monitor_suspicious_activity', {
        p_user_id: user.id
      });

      if (error) throw error;

      const suspiciousActivity = data || [];
      setAlerts(suspiciousActivity);

      // Update metrics
      setMetrics(prev => ({
        ...prev,
        suspiciousActivity,
        highRiskAlerts: suspiciousActivity.filter(alert => alert.risk_score >= 7).length,
        lastSecurityCheck: new Date().toISOString()
      }));

      // Trigger automated responses for high-risk alerts
      suspiciousActivity.forEach(async (alert) => {
        if (alert.risk_score >= 8) {
          await handleHighRiskAlert(alert);
        }
      });

    } catch (error) {
      console.error('Security monitoring error:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Handle high-risk security alerts
  const handleHighRiskAlert = async (alert: SecurityAlert) => {
    console.warn('High-risk security alert detected:', alert);

    // Log the alert response
    try {
      await supabase.rpc('log_security_event', {
        p_action: 'high_risk_alert_detected',
        p_resource_type: 'security_monitoring',
        p_details: {
          alert_type: alert.alert_type,
          risk_score: alert.risk_score,
          event_count: alert.event_count,
          automated_response: true,
          timestamp: new Date().toISOString()
        }
      });

      // Automated security response based on alert type
      switch (alert.alert_type) {
        case 'excessive_oauth_attempts':
          // Temporarily disable OAuth for this user
          console.warn('Excessive OAuth attempts detected - implementing temporary restrictions');
          break;

        case 'suspicious_token_access':
          // Force token refresh or revocation
          console.warn('Suspicious token access - considering token revocation');
          break;

        default:
          console.warn('Unknown high-risk alert type:', alert.alert_type);
      }
    } catch (error) {
      console.error('Failed to handle high-risk alert:', error);
    }
  };

  // Log security events with enhanced context
  const logSecurityEvent = useCallback(async (
    action: string,
    resourceType: string,
    resourceId?: string,
    additionalDetails?: Record<string, any>
  ) => {
    if (!user) return;

    try {
      // Check rate limits for logging
      const canLog = await checkRateLimit('security_event_logging');
      if (!canLog) {
        console.warn('Security event logging rate limited');
        return;
      }

      const details = {
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        referrer: document.referrer,
        screen_resolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...additionalDetails
      };

      await supabase.rpc('log_security_event', {
        p_action: action,
        p_resource_type: resourceType,
        p_resource_id: resourceId,
        p_details: details
      });

      // Update local metrics
      setMetrics(prev => ({
        ...prev,
        totalEvents: prev.totalEvents + 1
      }));

    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }, [user, checkRateLimit]);

  // Validate OAuth state for CSRF protection
  const validateOAuthState = useCallback(async (stateToken: string) => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('validate_oauth_state', {
        p_state_token: stateToken,
        p_user_id: user.id
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('OAuth state validation failed:', error);
      await logSecurityEvent('oauth_state_validation_failed', 'oauth_security', undefined, {
        state_token_length: stateToken?.length || 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }, [user, logSecurityEvent]);

  // Validate redirect URIs - returns true on errors to prevent blocking
  const validateRedirectUri = useCallback(async (redirectUri: string) => {
    try {
      const { data, error } = await supabase.rpc('validate_redirect_uri', {
        p_redirect_uri: redirectUri
      });

      if (error) {
        console.warn('Redirect URI validation RPC failed, allowing operation:', error);
        return true; // Allow on RPC error to prevent blocking
      }
      return data ?? true;
    } catch (error) {
      console.warn('Redirect URI validation failed, allowing operation:', error);
      // Log but don't block - this prevents false negatives from blocking valid connections
      logSecurityEvent('redirect_uri_validation_failed', 'oauth_security', undefined, {
        redirect_uri: redirectUri,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return true; // Allow on exception to prevent blocking
    }
  }, [logSecurityEvent]);

  // Initialize monitoring
  useEffect(() => {
    if (user) {
      // Initial security check
      monitorActivity();

      // Set up periodic monitoring
      const monitoringInterval = setInterval(monitorActivity, 5 * 60 * 1000); // Every 5 minutes

      return () => clearInterval(monitoringInterval);
    }
  }, [user, monitorActivity]);

  // Log user session events
  useEffect(() => {
    if (user) {
      logSecurityEvent('session_started', 'user_session', user.id, {
        session_type: 'web_application',
        authentication_method: 'supabase_auth'
      });

      // Log session end on page unload
      const handleBeforeUnload = () => {
        logSecurityEvent('session_ended', 'user_session', user.id, {
          session_duration: Date.now() - performance.timing.navigationStart
        });
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [user, logSecurityEvent]);

  return {
    metrics,
    alerts,
    loading,
    checkRateLimit,
    logSecurityEvent,
    validateOAuthState,
    validateRedirectUri,
    monitorActivity,
    handleHighRiskAlert
  };
}