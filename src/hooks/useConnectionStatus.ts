import { useState, useEffect } from 'react';
// Connection status is now managed internally

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

    const handleConnectionError = (error: any) => {
      if (error?.message?.includes('Failed to fetch')) {
        setConnectionError('Network connection failed. Please check your internet connection.');
      } else if (error?.message?.includes('NetworkError')) {
        setConnectionError('Network error occurred. Please try again.');
      } else {
        setConnectionError(error?.message || 'Connection error occurred');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('error', handleConnectionError);

    // Set initial connection status
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('error', handleConnectionError);
    };
  }, []);

  const clearError = () => setConnectionError(null);

  return {
    isOnline,
    connectionError,
    clearError,
    hasConnection: isOnline && !connectionError
  };
}