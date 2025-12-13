import { Cloud, CloudOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

export function OfflineIndicator({ showDetails = false, className }: OfflineIndicatorProps) {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    conflictsCount,
    triggerSync,
    getFormattedLastSync
  } = useOfflineSync();

  const handleSync = () => {
    if (isOnline && !isSyncing) {
      triggerSync();
    }
  };

  if (showDetails) {
    return (
      <div className={cn("flex items-center gap-3 p-3 rounded-lg bg-muted/50", className)}>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Cloud className="h-4 w-4 text-green-500" />
          ) : (
            <CloudOff className="h-4 w-4 text-amber-500" />
          )}
          <span className="text-sm font-medium">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {pendingCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {pendingCount} pending
          </Badge>
        )}

        {conflictsCount > 0 && (
          <Badge variant="destructive" className="text-xs">
            {conflictsCount} conflicts
          </Badge>
        )}

        <span className="text-xs text-muted-foreground">
          Last sync: {getFormattedLastSync()}
        </span>

        {isOnline && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            className="h-7 px-2"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
          </Button>
        )}
      </div>
    );
  }

  // Compact indicator
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleSync}
            disabled={!isOnline || isSyncing}
            className={cn(
              "relative flex items-center justify-center h-8 w-8 rounded-full transition-colors",
              isOnline ? "hover:bg-muted" : "bg-amber-500/10",
              className
            )}
          >
            {isSyncing ? (
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
            ) : isOnline ? (
              <Cloud className="h-4 w-4 text-green-500" />
            ) : (
              <CloudOff className="h-4 w-4 text-amber-500" />
            )}
            
            {(pendingCount > 0 || conflictsCount > 0) && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {pendingCount + conflictsCount}
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <div className="space-y-1">
            <p>{isOnline ? 'Online' : 'Offline - changes saved locally'}</p>
            {pendingCount > 0 && (
              <p className="text-muted-foreground">{pendingCount} changes waiting to sync</p>
            )}
            {conflictsCount > 0 && (
              <p className="text-destructive">{conflictsCount} conflicts to resolve</p>
            )}
            <p className="text-muted-foreground">Last sync: {getFormattedLastSync()}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Banner shown when offline with pending changes
 */
export function OfflineBanner() {
  const { isOnline, pendingCount, isSyncing } = useOfflineSync();

  if (isOnline && !isSyncing && pendingCount === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 px-4 py-2 text-sm",
        !isOnline
          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
          : isSyncing
          ? "bg-primary/10 text-primary"
          : "bg-green-500/10 text-green-600 dark:text-green-400"
      )}
    >
      {!isOnline ? (
        <>
          <CloudOff className="h-4 w-4" />
          <span>You're offline. Changes will sync when you reconnect.</span>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {pendingCount} pending
            </Badge>
          )}
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Syncing changes...</span>
        </>
      ) : pendingCount > 0 ? (
        <>
          <AlertTriangle className="h-4 w-4" />
          <span>{pendingCount} changes waiting to sync</span>
        </>
      ) : null}
    </div>
  );
}

/**
 * Badge to show on items that are pending sync
 */
export function PendingSyncBadge({ isPending }: { isPending?: boolean }) {
  if (!isPending) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] border-amber-500 text-amber-600">
            <CloudOff className="h-2.5 w-2.5 mr-0.5" />
            Pending
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">This item will sync when you're back online</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
