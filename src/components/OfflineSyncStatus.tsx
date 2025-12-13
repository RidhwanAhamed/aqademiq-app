import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Cloud,
  CloudOff,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { haptics } from '@/services/haptics';
import { SyncConflict } from '@/services/offline';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export function OfflineSyncStatus() {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    conflictsCount,
    conflicts,
    triggerSync,
    fullSync,
    resolveConflict,
    getFormattedLastSync
  } = useOfflineSync();

  const [selectedConflict, setSelectedConflict] = useState<SyncConflict | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSync = async () => {
    haptics.light();
    await fullSync();
    haptics.success();
  };

  const handleResolveConflict = async (resolution: 'local' | 'server') => {
    if (!selectedConflict) return;
    
    haptics.medium();
    await resolveConflict(selectedConflict.id, resolution);
    setSelectedConflict(null);
    haptics.success();
  };

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Card className="bg-card/50 border-border/50">
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  {isOnline ? (
                    <Wifi className="w-4 h-4 text-green-500" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-500" />
                  )}
                  Sync Status
                </CardTitle>
                <div className="flex items-center gap-2">
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
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="space-y-3 pt-0">
              {/* Connection Status */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Connection</span>
                <div className="flex items-center gap-1">
                  {isOnline ? (
                    <>
                      <Cloud className="w-3 h-3 text-green-500" />
                      <span className="text-green-500">Online</span>
                    </>
                  ) : (
                    <>
                      <CloudOff className="w-3 h-3 text-red-500" />
                      <span className="text-red-500">Offline</span>
                    </>
                  )}
                </div>
              </div>

              {/* Last Sync */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last Sync</span>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{getFormattedLastSync()}</span>
                </div>
              </div>

              {/* Pending Operations */}
              {pendingCount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Pending Changes</span>
                  <Badge variant="outline">{pendingCount} items</Badge>
                </div>
              )}

              {/* Sync Button */}
              <Button
                onClick={handleSync}
                disabled={isSyncing || !isOnline}
                className="w-full"
                size="sm"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync Now
                  </>
                )}
              </Button>

              {/* Conflicts List */}
              {conflicts.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    Conflicts to Resolve
                  </p>
                  {conflicts.map((conflict) => (
                    <div
                      key={conflict.id}
                      className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 cursor-pointer hover:bg-yellow-500/20 transition-colors"
                      onClick={() => {
                        haptics.light();
                        setSelectedConflict(conflict);
                      }}
                    >
                      <p className="text-sm font-medium capitalize">
                        {conflict.entityType.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Click to resolve
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* All Synced */}
              {isOnline && pendingCount === 0 && conflictsCount === 0 && (
                <div className="flex items-center gap-2 text-sm text-green-500">
                  <CheckCircle className="w-4 h-4" />
                  All changes synced
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Conflict Resolution Dialog */}
      <Dialog open={!!selectedConflict} onOpenChange={() => setSelectedConflict(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Sync Conflict
            </DialogTitle>
            <DialogDescription>
              This {selectedConflict?.entityType.replace('_', ' ')} was modified both locally and on the server. 
              Choose which version to keep.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Local Version */}
            <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/10">
              <p className="text-sm font-medium text-blue-500 mb-2">Your Local Changes</p>
              <p className="text-xs text-muted-foreground">
                Modified {selectedConflict ? new Date(selectedConflict.localTimestamp).toLocaleString() : ''}
              </p>
              <pre className="text-xs mt-2 p-2 bg-background/50 rounded overflow-auto max-h-32">
                {JSON.stringify(selectedConflict?.localData, null, 2)}
              </pre>
            </div>

            {/* Server Version */}
            <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/10">
              <p className="text-sm font-medium text-green-500 mb-2">Server Version</p>
              <p className="text-xs text-muted-foreground">
                Modified {selectedConflict?.serverTimestamp ? new Date(selectedConflict.serverTimestamp).toLocaleString() : ''}
              </p>
              <pre className="text-xs mt-2 p-2 bg-background/50 rounded overflow-auto max-h-32">
                {JSON.stringify(selectedConflict?.serverData, null, 2)}
              </pre>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => handleResolveConflict('local')}
                variant="outline"
                className="flex-1 border-blue-500/30 hover:bg-blue-500/10"
              >
                Keep Local
              </Button>
              <Button
                onClick={() => handleResolveConflict('server')}
                variant="outline"
                className="flex-1 border-green-500/30 hover:bg-green-500/10"
              >
                Keep Server
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default OfflineSyncStatus;
