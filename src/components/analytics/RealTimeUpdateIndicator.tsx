import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Wifi, WifiOff, CheckCircle } from "lucide-react";

interface RealTimeUpdateIndicatorProps {
  lastUpdated: Date | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function RealTimeUpdateIndicator({ lastUpdated, isLoading, onRefresh }: RealTimeUpdateIndicatorProps) {
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<string>('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

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

  useEffect(() => {
    if (!lastUpdated) return;

    const updateTimer = () => {
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);
      
      if (diffInSeconds < 60) {
        setTimeSinceUpdate(`${diffInSeconds}s ago`);
      } else if (diffInSeconds < 3600) {
        setTimeSinceUpdate(`${Math.floor(diffInSeconds / 60)}m ago`);
      } else {
        setTimeSinceUpdate(`${Math.floor(diffInSeconds / 3600)}h ago`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  // Auto refresh every 2 minutes when online and enabled
  useEffect(() => {
    if (!autoRefreshEnabled || !isOnline || isLoading) return;

    const autoRefreshInterval = setInterval(() => {
      onRefresh();
    }, 2 * 60 * 1000);

    return () => clearInterval(autoRefreshInterval);
  }, [autoRefreshEnabled, isOnline, isLoading, onRefresh]);

  const getStatusColor = () => {
    if (!isOnline) return 'text-destructive';
    if (isLoading) return 'text-warning';
    if (lastUpdated && new Date().getTime() - lastUpdated.getTime() < 5 * 60 * 1000) {
      return 'text-success';
    }
    return 'text-muted-foreground';
  };

  const getStatusIcon = () => {
    if (!isOnline) return WifiOff;
    if (isLoading) return RefreshCw;
    return CheckCircle;
  };

  const StatusIcon = getStatusIcon();

  return (
    <div className="flex items-center gap-3 text-sm">
      {/* Connection Status */}
      <div className="flex items-center gap-2">
        <StatusIcon className={`w-4 h-4 ${getStatusColor()} ${isLoading ? 'animate-spin' : ''}`} />
        <span className={`text-xs ${getStatusColor()}`}>
          {!isOnline ? 'Offline' : isLoading ? 'Updating...' : 'Live'}
        </span>
      </div>

      {/* Last Update Time */}
      {lastUpdated && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Updated {timeSinceUpdate}
          </span>
        </div>
      )}

      {/* Auto Refresh Toggle */}
      <Badge
        variant={autoRefreshEnabled ? "default" : "outline"}
        className="cursor-pointer text-xs"
        onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
      >
        Auto-sync {autoRefreshEnabled ? 'ON' : 'OFF'}
      </Badge>

      {/* Manual Refresh */}
      <Button
        size="sm"
        variant="ghost"
        onClick={onRefresh}
        disabled={isLoading}
        className="h-6 px-2"
      >
        <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
        <span className="text-xs">Refresh</span>
      </Button>
    </div>
  );
}