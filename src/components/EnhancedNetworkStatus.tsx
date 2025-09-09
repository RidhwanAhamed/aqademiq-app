import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { testSupabaseConnectivity, isOnline, retryWithBackoff } from '@/utils/networkErrorHandler';
import { useEnhancedToast } from '@/hooks/useEnhancedToast';
import { logger } from '@/utils/logger';

interface EnhancedNetworkStatusProps {
  onRetry?: () => void;
  showDetailedStatus?: boolean;
  autoRetry?: boolean;
  retryInterval?: number;
}

export const EnhancedNetworkStatus: React.FC<EnhancedNetworkStatusProps> = ({ 
  onRetry, 
  showDetailedStatus = false,
  autoRetry = true,
  retryInterval = 30000
}) => {
  const [connectionState, setConnectionState] = useState({
    isOnline: isOnline(),
    supabaseConnected: null as boolean | null,
    testing: false,
    lastTested: null as Date | null,
    retryCount: 0
  });
  
  const { showWarningToast, showSuccessToast, showErrorToast } = useEnhancedToast();

  useEffect(() => {
    const handleOnline = () => {
      setConnectionState(prev => ({ ...prev, isOnline: true }));
      if (showDetailedStatus) {
        testConnection();
      }
      showSuccessToast('Connection Restored', 'Internet connection is back online.');
    };

    const handleOffline = () => {
      setConnectionState(prev => ({ 
        ...prev, 
        isOnline: false, 
        supabaseConnected: false 
      }));
      showWarningToast('Connection Lost', 'You are currently offline. Some features may be limited.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showDetailedStatus, showSuccessToast, showWarningToast]);

  const testConnection = async (isRetry: boolean = false) => {
    if (!connectionState.isOnline) return;
    
    setConnectionState(prev => ({ ...prev, testing: true }));
    
    try {
      const connected = await retryWithBackoff(async () => {
        const supabaseUrl = "https://thmyddcvpopzjbvmhbur.supabase.co";
        const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRobXlkZGN2cG9wempidm1oYnVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMDA3OTksImV4cCI6MjA2OTg3Njc5OX0.yomXAXLBjy_9re1xyJDRNV5rSuLfeCwwyNtH-fJxJ1k";
        
        return await testSupabaseConnectivity(supabaseUrl, supabaseKey);
      }, 2);

      setConnectionState(prev => ({ 
        ...prev, 
        supabaseConnected: connected, 
        lastTested: new Date(),
        retryCount: isRetry ? prev.retryCount + 1 : prev.retryCount
      }));

      if (connected && isRetry) {
        showSuccessToast('Connection Restored', 'Authentication services are now available.');
      }

      logger.info('Network connectivity test completed', {
        connected,
        isRetry,
        retryCount: connectionState.retryCount
      });

    } catch (error) {
      setConnectionState(prev => ({ 
        ...prev, 
        supabaseConnected: false,
        lastTested: new Date(),
        retryCount: isRetry ? prev.retryCount + 1 : prev.retryCount
      }));

      if (isRetry) {
        showErrorToast(error, {
          feature: 'network_connectivity',
          retryFunction: () => testConnection(true)
        });
      }

      logger.error('Network connectivity test failed', error);
    } finally {
      setConnectionState(prev => ({ ...prev, testing: false }));
    }
  };

  useEffect(() => {
    if (connectionState.isOnline && showDetailedStatus) {
      testConnection();
    }
  }, [connectionState.isOnline, showDetailedStatus]);

  // Auto-retry mechanism
  useEffect(() => {
    if (autoRetry && connectionState.supabaseConnected === false && connectionState.isOnline) {
      const retryTimer = setTimeout(() => {
        testConnection(true);
      }, retryInterval);

      return () => clearTimeout(retryTimer);
    }
  }, [autoRetry, connectionState.supabaseConnected, connectionState.isOnline, retryInterval]);

  const getStatusInfo = () => {
    if (!connectionState.isOnline) {
      return {
        icon: WifiOff,
        message: 'No internet connection',
        description: 'Please check your network connection and try again.',
        variant: 'destructive' as const,
        showActions: false
      };
    }

    if (connectionState.supabaseConnected === false) {
      return {
        icon: AlertTriangle,
        message: 'Authentication service unavailable',
        description: `Unable to connect to authentication servers. ${connectionState.retryCount > 0 ? `Retry attempt ${connectionState.retryCount}.` : 'This may be due to network restrictions or server issues.'}`,
        variant: 'destructive' as const,
        showActions: true
      };
    }

    if (connectionState.supabaseConnected === true) {
      return {
        icon: CheckCircle,
        message: 'All services connected',
        description: 'Authentication and data services are available.',
        variant: 'default' as const,
        showActions: false
      };
    }

    if (connectionState.isOnline && showDetailedStatus && connectionState.testing) {
      return {
        icon: RefreshCw,
        message: 'Testing connection...',
        description: 'Checking service availability.',
        variant: 'default' as const,
        showActions: false
      };
    }

    return null;
  };

  const statusInfo = getStatusInfo();

  if (!statusInfo) return null;

  const Icon = statusInfo.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="mb-4"
      >
        <Alert variant={statusInfo.variant}>
          <Icon className={`h-4 w-4 ${connectionState.testing ? 'animate-spin' : ''}`} />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <div className="font-medium">{statusInfo.message}</div>
              <div className="text-sm opacity-90">{statusInfo.description}</div>
              {connectionState.lastTested && (
                <div className="text-xs opacity-75 mt-1">
                  Last tested: {connectionState.lastTested.toLocaleTimeString()}
                </div>
              )}
            </div>
            
            {statusInfo.showActions && (
              <div className="flex gap-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testConnection(true)}
                  disabled={connectionState.testing}
                >
                  {connectionState.testing ? (
                    <>
                      <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Test Again
                    </>
                  )}
                </Button>
                
                {onRetry && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRetry}
                  >
                    Retry Action
                  </Button>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>
      </motion.div>
    </AnimatePresence>
  );
};