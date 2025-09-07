import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { testSupabaseConnectivity } from '@/utils/networkErrorHandler';

interface NetworkStatusProps {
  onRetry?: () => void;
  showDetailedStatus?: boolean;
}

export const NetworkStatusIndicator = ({ onRetry, showDetailedStatus = false }: NetworkStatusProps) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const testConnection = async () => {
    if (!isOnline) return;
    
    setTesting(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      if (supabaseUrl && supabaseKey) {
        const connected = await testSupabaseConnectivity(supabaseUrl, supabaseKey);
        setSupabaseConnected(connected);
      }
    } catch (error) {
      setSupabaseConnected(false);
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    if (isOnline && showDetailedStatus) {
      testConnection();
    }
  }, [isOnline]);

  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        message: 'No internet connection',
        description: 'Please check your network connection and try again.',
        variant: 'destructive' as const,
        showRetry: false
      };
    }

    if (supabaseConnected === false) {
      return {
        icon: AlertTriangle,
        message: 'Authentication service unavailable',
        description: 'Unable to connect to authentication servers. This may be due to network restrictions or server issues.',
        variant: 'destructive' as const,
        showRetry: true
      };
    }

    if (supabaseConnected === true) {
      return {
        icon: CheckCircle,
        message: 'Connection restored',
        description: 'Authentication services are now available.',
        variant: 'default' as const,
        showRetry: false
      };
    }

    if (isOnline && showDetailedStatus) {
      return {
        icon: Wifi,
        message: 'Testing connection...',
        description: 'Checking authentication service availability.',
        variant: 'default' as const,
        showRetry: false
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
          <Icon className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <div className="font-medium">{statusInfo.message}</div>
              <div className="text-sm opacity-90">{statusInfo.description}</div>
            </div>
            {statusInfo.showRetry && (
              <div className="flex gap-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testConnection}
                  disabled={testing}
                >
                  {testing ? 'Testing...' : 'Test Connection'}
                </Button>
                {onRetry && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRetry}
                  >
                    Retry
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