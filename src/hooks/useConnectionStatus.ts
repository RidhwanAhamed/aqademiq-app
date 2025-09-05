import { useState, useEffect } from 'react';

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
    // Simple connectivity test using a basic fetch to a reliable endpoint
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors'
      });
      
      clearTimeout(timeoutId);
      setConnectionError(null);
      return true;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setConnectionError('Connection timeout. Please check your internet connection.');
      } else {
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