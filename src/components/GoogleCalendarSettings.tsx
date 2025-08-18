import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, CheckCircle, AlertCircle, RefreshCw, Settings } from "lucide-react";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
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
  } = useGoogleCalendar();

  const formatLastSync = (lastSyncAt: string | null) => {
    if (!lastSyncAt) return "Never";
    return formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true });
  };

  const isTokenExpiringSoon = () => {
    if (!tokenStatus.expiresAt) return false;
    const expiryDate = new Date(tokenStatus.expiresAt);
    const now = new Date();
    const hoursUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilExpiry < 24;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <CardTitle>Google Calendar Integration</CardTitle>
        </div>
        <CardDescription>
          Sync your academic schedule, assignments, and exams with Google Calendar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-base font-medium">Connection Status</Label>
            <div className="flex items-center gap-2">
              {tokenStatus.isConnected ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Connected</span>
                  {isTokenExpiringSoon() && (
                    <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Token expiring soon
                    </Badge>
                  )}
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Not connected</span>
                </>
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
                Connect Google Calendar
              </Button>
            )}
          </div>
        </div>

        {tokenStatus.isConnected && settings && (
          <>
            <Separator />
            
            {/* Sync Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <Label className="text-base font-medium">Sync Preferences</Label>
              </div>
              
              <div className="grid grid-cols-1 gap-4 pl-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sync-enabled">Enable Auto Sync</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically sync your academic data to Google Calendar
                    </p>
                  </div>
                  <Switch
                    id="sync-enabled"
                    checked={settings.sync_enabled}
                    onCheckedChange={(checked) => updateSettings({ sync_enabled: checked })}
                  />
                </div>

                {settings.sync_enabled && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="sync-schedule">Class Schedule</Label>
                        <p className="text-sm text-muted-foreground">
                          Sync your class schedule blocks
                        </p>
                      </div>
                      <Switch
                        id="sync-schedule"
                        checked={settings.sync_schedule_blocks}
                        onCheckedChange={(checked) => updateSettings({ sync_schedule_blocks: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="sync-assignments">Assignments</Label>
                        <p className="text-sm text-muted-foreground">
                          Sync assignment due dates and study time
                        </p>
                      </div>
                      <Switch
                        id="sync-assignments"
                        checked={settings.sync_assignments}
                        onCheckedChange={(checked) => updateSettings({ sync_assignments: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="sync-exams">Exams</Label>
                        <p className="text-sm text-muted-foreground">
                          Sync exam dates and locations
                        </p>
                      </div>
                      <Switch
                        id="sync-exams"
                        checked={settings.sync_exams}
                        onCheckedChange={(checked) => updateSettings({ sync_exams: checked })}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <Separator />

            {/* Manual Sync */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                <Label className="text-base font-medium">Manual Sync</Label>
              </div>
              
              <div className="flex items-center justify-between pl-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Sync Now</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Last synced: {formatLastSync(settings.last_sync_at)}</span>
                  </div>
                </div>
                <Button 
                  variant="outline"
                  onClick={syncNow}
                  disabled={loading || !settings.sync_enabled}
                >
                  {loading ? "Syncing..." : "Sync Now"}
                </Button>
              </div>
              
              <div className="pl-6">
                <p className="text-xs text-muted-foreground">
                  This will create calendar events for your upcoming schedule, assignments, and exams.
                  Events from the past 30 days and next 30 days will be synced.
                </p>
              </div>
            </div>
          </>
        )}

        {!tokenStatus.isConnected && (
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Why connect Google Calendar?</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• View your academic schedule alongside personal events</li>
              <li>• Get notifications for assignments and exams</li>
              <li>• Access your schedule from any device</li>
              <li>• Share your academic calendar with family or study groups</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}