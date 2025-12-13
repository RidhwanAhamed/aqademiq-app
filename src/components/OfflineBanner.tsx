import React from 'react';
import { WifiOff, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineBannerProps {
  isOffline: boolean;
  pendingChanges?: number;
  className?: string;
}

export function OfflineBanner({ isOffline, pendingChanges = 0, className }: OfflineBannerProps) {
  if (!isOffline) return null;

  return (
    <div 
      className={cn(
        "bg-amber-500/10 border-b border-amber-500/20 px-4 py-2",
        "flex items-center justify-center gap-2 text-sm",
        className
      )}
    >
      <WifiOff className="h-4 w-4 text-amber-500" />
      <span className="text-amber-600 dark:text-amber-400 font-medium">
        You're offline
      </span>
      {pendingChanges > 0 && (
        <>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground flex items-center gap-1">
            <Cloud className="h-3 w-3" />
            {pendingChanges} change{pendingChanges !== 1 ? 's' : ''} pending sync
          </span>
        </>
      )}
    </div>
  );
}

export default OfflineBanner;
