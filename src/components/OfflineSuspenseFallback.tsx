import { useEffect, useState } from 'react';
import { Loader2, WifiOff } from 'lucide-react';

interface OfflineSuspenseFallbackProps {
  pageName?: string;
}

export function OfflineSuspenseFallback({ pageName = 'page' }: OfflineSuspenseFallbackProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Show retry button after 5 seconds if still loading
    const timer = setTimeout(() => setShowRetry(true), 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearTimeout(timer);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
          <WifiOff className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          You're Offline
        </h2>
        <p className="text-muted-foreground max-w-md mb-4">
          Unable to load {pageName}. Please check your internet connection and try again.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
      <p className="text-muted-foreground">Loading {pageName}...</p>
      {showRetry && (
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors underline"
        >
          Taking too long? Click to retry
        </button>
      )}
    </div>
  );
}

// Exported for use by offlineLazy when chunk loading fails
export function OfflinePlaceholder() {
  const isOnline = navigator.onLine;
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
      <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
        <WifiOff className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        {isOnline ? 'Loading...' : 'You\'re Offline'}
      </h2>
      <p className="text-muted-foreground max-w-md">
        {isOnline 
          ? 'Please wait while we load this page...'
          : 'This page hasn\'t been cached yet. Please connect to the internet to view this page, and it will be available offline next time.'
        }
      </p>
      {!isOnline && (
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
