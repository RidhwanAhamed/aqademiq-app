import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Zap, 
  TrendingUp, 
  Activity,
  Wifi,
  WifiOff
} from 'lucide-react';
import { format } from 'date-fns';

interface SyncMetrics {
  total_synced: number;
  conflicts_resolved: number;
  errors_count: number;
  sync_duration_ms: number;
  api_calls_made: number;
}

interface SyncProgress {
  current_operation: string;
  completed_operations: number;
  total_operations: number;
  estimated_time_remaining: number;
  sync_speed: 'fast' | 'normal' | 'slow';
}

interface EnhancedSyncStatusProps {
  isConnected: boolean;
  isRealTimeEnabled: boolean;
  lastSync?: string;
  syncProgress?: SyncProgress | null;
  syncMetrics?: SyncMetrics | null;
  syncHealth: 'excellent' | 'good' | 'fair' | 'poor';
  onSync: () => void;
  onSetupRealTime: () => void;
}

export function EnhancedSyncStatus({
  isConnected,
  isRealTimeEnabled,
  lastSync,
  syncProgress,
  syncMetrics,
  syncHealth,
  onSync,
  onSetupRealTime
}: EnhancedSyncStatusProps) {
  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'excellent': return <CheckCircle className="w-4 h-4" />;
      case 'good': return <TrendingUp className="w-4 h-4" />;
      case 'fair': return <Clock className="w-4 h-4" />;
      case 'poor': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  if (!isConnected) {
    return (
      <Card className="bg-gradient-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <WifiOff className="w-4 h-4 text-red-500" />
            Google Calendar Not Connected
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Connect your Google Calendar to enable bidirectional synchronization.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Card className="bg-gradient-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isRealTimeEnabled ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-yellow-500" />
              )}
              <span className="text-sm">Sync Status</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1 ${getHealthColor(syncHealth)}`}>
                {getHealthIcon(syncHealth)}
                <span className="text-xs font-medium capitalize">{syncHealth}</span>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Connection</span>
            <Badge variant="outline" className="text-green-600 border-green-600">
              Connected
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Real-time Sync</span>
            {isRealTimeEnabled ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <Zap className="w-3 h-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                Manual Only
              </Badge>
            )}
          </div>

          {lastSync && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last Sync</span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(lastSync), 'MMM d, HH:mm')}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Progress */}
      {syncProgress && (
        <Card className="bg-gradient-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="w-4 h-4 animate-pulse text-blue-500" />
              Sync in Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {syncProgress.current_operation}
                </span>
                <span className="text-xs text-muted-foreground">
                  {syncProgress.completed_operations}/{syncProgress.total_operations}
                </span>
              </div>
              <Progress 
                value={(syncProgress.completed_operations / syncProgress.total_operations) * 100}
                className="h-2"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                ETA: {Math.round(syncProgress.estimated_time_remaining / 1000)}s
              </span>
              <Badge 
                variant="outline" 
                className={`text-xs ${
                  syncProgress.sync_speed === 'fast' ? 'text-green-600 border-green-600' :
                  syncProgress.sync_speed === 'normal' ? 'text-blue-600 border-blue-600' :
                  'text-yellow-600 border-yellow-600'
                }`}
              >
                {syncProgress.sync_speed}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync Metrics */}
      {syncMetrics && (
        <Card className="bg-gradient-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Recent Sync Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Events Synced</div>
                <div className="text-lg font-semibold text-foreground">
                  {syncMetrics.total_synced}
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Duration</div>
                <div className="text-lg font-semibold text-foreground">
                  {Math.round(syncMetrics.sync_duration_ms / 1000)}s
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Conflicts Resolved</div>
                <div className="text-lg font-semibold text-foreground">
                  {syncMetrics.conflicts_resolved}
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">API Calls</div>
                <div className="text-lg font-semibold text-foreground">
                  {syncMetrics.api_calls_made}
                </div>
              </div>
            </div>

            {syncMetrics.errors_count > 0 && (
              <div className="mt-4 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">
                    {syncMetrics.errors_count} error(s) occurred during sync
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}