import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useBidirectionalSync } from "@/hooks/useBidirectionalSync";
import { Calendar, Cloud, AlertTriangle, CheckCircle, Clock, Wifi, WifiOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function GoogleCalendarSettings() {
  const { 
    settings, 
    tokenStatus, 
    loading, 
    connectToGoogle, 
    disconnectFromGoogle, 
    updateSettings, 
    syncNow, 
    setupWebhook 
  } = useGoogleCalendar();
  
  const {
    syncStatus,
    operations,
    loading: syncLoading,
    triggerIncrementalSync,
    resolveConflict,
    retryFailedOperation,
    getConflictOperations,
    getPendingOperations,
    getFailedOperations,
  } = useBidirectionalSync();

  const formatLastSync = (lastSync: string | null) => {
    if (!lastSync) return 'Never';
    try {
      return formatDistanceToNow(new Date(lastSync), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  const isTokenExpiringSoon = () => {
    if (!tokenStatus.expiresAt) return false;
    const expiresAt = new Date(tokenStatus.expiresAt);
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    return expiresAt <= oneHourFromNow;
  };

  const conflictOps = getConflictOperations();
  const pendingOps = getPendingOperations();
  const failedOps = getFailedOperations();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar Integration
          </CardTitle>
          <CardDescription>
            Sync your academic schedule with Google Calendar in real-time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${tokenStatus.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <div>
                <p className="font-medium">
                  {tokenStatus.isConnected ? 'Connected to Google Calendar' : 'Not Connected'}
                </p>
                {tokenStatus.isConnected && isTokenExpiringSoon() && (
                  <p className="text-sm text-yellow-600">Token expires soon</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {tokenStatus.isConnected ? (
                <Button 
                  variant="outline" 
                  onClick={disconnectFromGoogle}
                  disabled={loading}
                >
                  Disconnect
                </Button>
              ) : (
                <Button 
                  onClick={connectToGoogle}
                  disabled={loading}
                >
                  {loading ? 'Connecting...' : 'Connect to Google'}
                </Button>
              )}
            </div>
          </div>

          {/* Sync Status */}
          {tokenStatus.isConnected && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {syncStatus.isOnline ? (
                    <Wifi className="h-5 w-5 text-green-500" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">
                      {syncStatus.isOnline ? 'Online' : 'Offline'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Last sync: {formatLastSync(syncStatus.lastSync)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {syncStatus.pendingOperations > 0 && (
                    <Badge variant="secondary">
                      <Clock className="h-3 w-3 mr-1" />
                      {syncStatus.pendingOperations} pending
                    </Badge>
                  )}
                  {syncStatus.conflictsCount > 0 && (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {syncStatus.conflictsCount} conflicts
                    </Badge>
                  )}
                </div>
              </div>

              {/* Sync Controls */}
              <div className="flex gap-2">
                <Button 
                  onClick={syncNow}
                  disabled={loading || syncLoading}
                  className="flex-1"
                >
                  <Cloud className="h-4 w-4 mr-2" />
                  {loading || syncLoading ? 'Syncing...' : 'Full Sync'}
                </Button>
                <Button 
                  onClick={triggerIncrementalSync}
                  disabled={loading || syncLoading || !syncStatus.isOnline}
                  variant="outline"
                  className="flex-1"
                >
                  Quick Sync
                </Button>
                <Button 
                  onClick={setupWebhook}
                  disabled={loading}
                  variant="outline"
                >
                  Enable Real-Time
                </Button>
              </div>
            </div>
          )}

          {/* Sync Preferences */}
          {tokenStatus.isConnected && settings && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium">Sync Preferences</h4>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-sync">Auto-sync enabled</Label>
                  <Switch
                    id="auto-sync"
                    checked={settings.sync_enabled}
                    onCheckedChange={(checked) => updateSettings({ sync_enabled: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="sync-classes">Sync schedule blocks</Label>
                  <Switch
                    id="sync-classes"
                    checked={settings.sync_schedule_blocks}
                    onCheckedChange={(checked) => updateSettings({ sync_schedule_blocks: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="sync-assignments">Sync assignments</Label>
                  <Switch
                    id="sync-assignments"
                    checked={settings.sync_assignments}
                    onCheckedChange={(checked) => updateSettings({ sync_assignments: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="sync-exams">Sync exams</Label>
                  <Switch
                    id="sync-exams"
                    checked={settings.sync_exams}
                    onCheckedChange={(checked) => updateSettings({ sync_exams: checked })}
                  />
                </div>
              </div>
            </>
          )}

          {/* Conflicts and Issues */}
          {(conflictOps.length > 0 || failedOps.length > 0) && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium">Sync Issues</h4>
                
                {conflictOps.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {conflictOps.length} conflict(s) need resolution. Events were modified in both your app and Google Calendar.
                    </AlertDescription>
                  </Alert>
                )}

                {failedOps.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {failedOps.length} sync operation(s) failed. You can retry them below.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  {conflictOps.slice(0, 3).map((op) => (
                    <div key={op.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">Conflict: {op.entity_type}</p>
                        <p className="text-xs text-muted-foreground">
                          Created {formatDistanceToNow(new Date(op.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => resolveConflict(op.id, 'prefer_local')}
                        >
                          Keep App
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => resolveConflict(op.id, 'prefer_google')}
                        >
                          Keep Google
                        </Button>
                      </div>
                    </div>
                  ))}

                  {failedOps.slice(0, 3).map((op) => (
                    <div key={op.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">Failed: {op.entity_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {op.error_message || 'Unknown error'}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => retryFailedOperation(op.id)}
                      >
                        Retry
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {!tokenStatus.isConnected && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Connect to Google Calendar to enable bi-directional sync. Your events will automatically sync in both directions.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}