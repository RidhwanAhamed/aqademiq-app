import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OfflineStartupScreenProps {
  onRetry: () => void;
}

export function OfflineStartupScreen({ onRetry }: OfflineStartupScreenProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <WifiOff className="h-10 w-10 text-muted-foreground" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">You're Offline</h1>
          <p className="text-muted-foreground">
            It looks like you're opening Aqademiq for the first time without an internet connection.
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <h2 className="font-semibold text-foreground">To get started:</h2>
          <ol className="text-left text-sm text-muted-foreground space-y-2">
            <li className="flex gap-2">
              <span className="font-bold text-primary">1.</span>
              Connect to the internet
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-primary">2.</span>
              Sign in or create an account
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-primary">3.</span>
              Your data will be cached for offline use
            </li>
          </ol>
        </div>

        {/* Info */}
        <p className="text-xs text-muted-foreground">
          Once you've signed in, Aqademiq will work offline and sync automatically when you're back online.
        </p>

        {/* Retry Button */}
        <Button onClick={onRetry} className="w-full" size="lg">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    </div>
  );
}

export default OfflineStartupScreen;
