import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useAdvancedGoogleSync } from "@/hooks/useAdvancedGoogleSync";
import { 
  Calendar, 
  Cloud, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Wifi, 
  WifiOff,
  Zap,
  BookOpen,
  GraduationCap,
  Timer,
  Settings,
  Activity,
  TrendingUp
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function AdvancedGoogleCalendarSettings() {
  const { 
    settings, 
    tokenStatus, 
    loading: googleLoading, 
    connectToGoogle, 
    disconnectFromGoogle, 
    updateSettings 
  } = useGoogleCalendar();
  
  const {
    syncStatus,
    syncProgress,
    academicPreferences,
    loading: syncLoading,
    performIncrementalSync,
    performFullSync,
    updateAcademicPreferences,
    performSyncHealthCheck
  } = useAdvancedGoogleSync();

  const formatLastSync = (lastSync: string | null) => {
    if (!lastSync) return 'Never';
    try {
      return formatDistanceToNow(new Date(lastSync), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  const getSyncHealthIcon = () => {
    switch (syncStatus.syncHealth) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSyncTypeDisplay = () => {
    switch (syncStatus.syncType) {
      case 'incremental':
        return <Badge variant="secondary"><Zap className="h-3 w-3 mr-1" />Quick Sync</Badge>;
      case 'full':
        return <Badge variant="default"><Cloud className="h-3 w-3 mr-1" />Full Sync</Badge>;
      default:
        return <Badge variant="outline">No Sync</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Advanced Google Calendar Integration
          </CardTitle>
          <CardDescription>
            Professional-grade bidirectional sync with academic intelligence
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
                <p className="text-sm text-muted-foreground">
                  {tokenStatus.isConnected ? 'Real-time bidirectional sync active' : 'Connect to enable advanced features'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {tokenStatus.isConnected ? (
                <Button 
                  variant="outline" 
                  onClick={disconnectFromGoogle}
                  disabled={googleLoading}
                >
                  Disconnect
                </Button>
              ) : (
                <Button 
                  onClick={connectToGoogle}
                  disabled={googleLoading}
                >
                  {googleLoading ? 'Connecting...' : 'Connect Google Calendar'}
                </Button>
              )}
            </div>
          </div>

          {/* Sync Status & Health */}
          {tokenStatus.isConnected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Sync Health */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getSyncHealthIcon()}
                    <div>
                      <p className="font-medium">Sync Health</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {syncStatus.syncHealth}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={performSyncHealthCheck}
                  >
                    <Activity className="h-4 w-4" />
                  </Button>
                </div>

                {/* Connection Status */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {syncStatus.isOnline ? (
                      <Wifi className="h-4 w-4 text-green-500" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-red-500" />
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
                  {getSyncTypeDisplay()}
                </div>
              </div>

              {/* Sync Progress */}
              {syncProgress.status === 'syncing' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{syncProgress.currentOperation}</p>
                    <p className="text-sm text-muted-foreground">
                      {syncProgress.estimatedTimeRemaining}s remaining
                    </p>
                  </div>
                  <Progress value={syncProgress.progress} className="h-2" />
                </div>
              )}

              {/* Sync Statistics */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {syncStatus.pendingOperations > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {syncStatus.pendingOperations} pending
                  </div>
                )}
                {syncStatus.conflictsCount > 0 && (
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-yellow-500" />
                    {syncStatus.conflictsCount} conflicts
                  </div>
                )}
              </div>

              {/* Sync Controls */}
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={performIncrementalSync}
                  disabled={syncLoading || !syncStatus.isOnline}
                  className="flex-1"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {syncLoading ? 'Syncing...' : 'Quick Sync'}
                </Button>
                <Button 
                  onClick={performFullSync}
                  disabled={syncLoading || !syncStatus.isOnline}
                  variant="outline"
                  className="flex-1"
                >
                  <Cloud className="h-4 w-4 mr-2" />
                  Full Sync
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Academic Intelligence Settings */}
      {tokenStatus.isConnected && academicPreferences && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Academic Intelligence
            </CardTitle>
            <CardDescription>
              AI-powered study session generation and academic scheduling
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Auto Study Sessions */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-study">Auto-generate study sessions</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically create study blocks for upcoming exams
                </p>
              </div>
              <Switch
                id="auto-study"
                checked={academicPreferences.auto_study_sessions}
                onCheckedChange={(checked) => updateAcademicPreferences({ auto_study_sessions: checked })}
              />
            </div>

            {/* Study Session Duration */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Study session duration</Label>
                <span className="text-sm text-muted-foreground">
                  {academicPreferences.study_session_duration} minutes
                </span>
              </div>
              <Slider
                value={[academicPreferences.study_session_duration]}
                onValueChange={([value]) => updateAcademicPreferences({ study_session_duration: value })}
                max={240}
                min={30}
                step={15}
                className="w-full"
              />
            </div>

            {/* Exam Preparation Days */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Exam preparation period</Label>
                <span className="text-sm text-muted-foreground">
                  {academicPreferences.exam_prep_days} days
                </span>
              </div>
              <Slider
                value={[academicPreferences.exam_prep_days]}
                onValueChange={([value]) => updateAcademicPreferences({ exam_prep_days: value })}
                max={30}
                min={3}
                step={1}
                className="w-full"
              />
            </div>

            <Separator />

            {/* Advanced Academic Features */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Advanced Features
              </h4>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="color-coding">Subject color coding</Label>
                  <Switch
                    id="color-coding"
                    checked={academicPreferences.color_coding_enabled}
                    onCheckedChange={(checked) => updateAcademicPreferences({ color_coding_enabled: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="reminder-escalation">Smart reminder escalation</Label>
                  <Switch
                    id="reminder-escalation"
                    checked={academicPreferences.reminder_escalation}
                    onCheckedChange={(checked) => updateAcademicPreferences({ reminder_escalation: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="weekend-study">Weekend study sessions</Label>
                  <Switch
                    id="weekend-study"
                    checked={academicPreferences.weekend_study_allowed}
                    onCheckedChange={(checked) => updateAcademicPreferences({ weekend_study_allowed: checked })}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync Preferences */}
      {tokenStatus.isConnected && settings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Sync Preferences
            </CardTitle>
            <CardDescription>
              Control what data syncs between your app and Google Calendar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>
      )}

      {/* Connection Required Alert */}
      {!tokenStatus.isConnected && (
        <Alert>
          <TrendingUp className="h-4 w-4" />
          <AlertDescription>
            Connect to Google Calendar to unlock advanced bidirectional sync, academic intelligence, 
            and real-time collaboration features. Your academic schedule will be seamlessly synchronized 
            across all your devices.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}