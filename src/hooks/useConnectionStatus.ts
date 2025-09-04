import { useState, useEffect } from 'react';
import { supabase } from '@/config/supabaseClient';

export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionError(null);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionError('You are currently offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial connection status - only check browser connectivity
    setIsOnline(navigator.onLine);
    
    // Clear any existing connection errors on mount
    setConnectionError(null);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const clearError = () => setConnectionError(null);

  const testConnection = async () => {
    try {
      const { error } = await supabase.auth.getSession();
      if (!error) {
        setConnectionError(null);
        return true;
      }
      return false;
    } catch (error: any) {
      if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
        setConnectionError('Network connection failed. Please check your internet connection.');
      }
      return false;
    }
  };

  return {
    isOnline,
    connectionError,
    clearError,
    testConnection,
    hasConnection: isOnline && !connectionError
  };
}