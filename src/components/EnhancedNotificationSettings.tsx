import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, TestTube, Bell, Clock, CheckCircle, AlertCircle, Send } from "lucide-react";
import { useEnhancedNotifications } from "@/hooks/useEnhancedNotifications";
import { useState } from "react";

export function EnhancedNotificationSettings() {
  const {
    discordSettings,
    notificationPreferences,
    loading,
    updateDiscordSettings,
    updateNotificationPreferences,
    testDiscordWebhook,
    generateReminders,
    sendDailySummary,
  } = useEnhancedNotifications();

  const [webhookUrl, setWebhookUrl] = useState(discordSettings?.webhook_url || '');
  const [username, setUsername] = useState(discordSettings?.username || 'Aqademiq');

  const handleSaveDiscord = async () => {
    if (webhookUrl && webhookUrl !== discordSettings?.webhook_url) {
      const testSuccess = await testDiscordWebhook(webhookUrl);
      if (!testSuccess) return;
    }

    await updateDiscordSettings({
      webhook_url: webhookUrl,
      username: username,
      notifications_enabled: !!webhookUrl,
    });
  };

  const formatReminderTiming = (minutes: number[]) => {
    return minutes.map(m => {
      if (m < 60) return `${m}m`;
      if (m < 1440) return `${m / 60}h`;
      return `${m / 1440}d`;
    }).join(', ');
  };

  const updateReminderTiming = (timingStr: string) => {
    const timings = timingStr.split(',').map(t => {
      const trim = t.trim();
      if (trim.endsWith('m')) return parseInt(trim);
      if (trim.endsWith('h')) return parseInt(trim) * 60;
      if (trim.endsWith('d')) return parseInt(trim) * 1440;
      return parseInt(trim);
    }).filter(t => !isNaN(t));

    updateNotificationPreferences({ reminder_timing_minutes: timings });
  };

  return (
    <div className="space-y-6">
      {/* Discord Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle>Discord Integration</CardTitle>
          </div>
          <CardDescription>
            Get instant notifications in your Discord server for assignments, exams, and reminders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Connection Status</Label>
              <div className="flex items-center gap-2">
                {discordSettings?.notifications_enabled ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">Connected</span>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Active
                    </Badge>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Not connected</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Webhook Configuration */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Discord Webhook URL</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://discord.com/api/webhooks/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Create a webhook in your Discord server settings and paste the URL here
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bot-username">Bot Username</Label>
              <Input
                id="bot-username"
                placeholder="Aqademiq"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveDiscord} disabled={loading}>
                Save Discord Settings
              </Button>
              {webhookUrl && (
                <Button 
                  variant="outline" 
                  onClick={() => testDiscordWebhook(webhookUrl)}
                  disabled={loading}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Webhook
                </Button>
              )}
            </div>
          </div>

          {discordSettings?.notifications_enabled && (
            <>
              <Separator />
              
              {/* Discord Notification Types */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Discord Notification Types</Label>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="discord-assignments">Assignment Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified about upcoming assignment deadlines
                      </p>
                    </div>
                    <Switch
                      id="discord-assignments"
                      checked={discordSettings.assignment_notifications}
                      onCheckedChange={(checked) => 
                        updateDiscordSettings({ assignment_notifications: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="discord-exams">Exam Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified about upcoming exams
                      </p>
                    </div>
                    <Switch
                      id="discord-exams"
                      checked={discordSettings.exam_notifications}
                      onCheckedChange={(checked) => 
                        updateDiscordSettings({ exam_notifications: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="discord-reminders">General Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Get general study reminders and updates
                      </p>
                    </div>
                    <Switch
                      id="discord-reminders"
                      checked={discordSettings.reminder_notifications}
                      onCheckedChange={(checked) => 
                        updateDiscordSettings({ reminder_notifications: checked })
                      }
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {!discordSettings?.notifications_enabled && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">How to set up Discord notifications:</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Go to your Discord server settings</li>
                <li>Navigate to "Integrations" → "Webhooks"</li>
                <li>Click "Create Webhook" or "New Webhook"</li>
                <li>Choose a channel and copy the webhook URL</li>
                <li>Paste the URL above and click "Save"</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      {/* General Notification Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Notification Preferences</CardTitle>
          </div>
          <CardDescription>
            Configure when and how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Notification Channels */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Notification Channels</Label>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={notificationPreferences?.email_enabled || false}
                  onCheckedChange={(checked) => 
                    updateNotificationPreferences({ email_enabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="discord-notifications">Discord Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications in Discord
                  </p>
                </div>
                <Switch
                  id="discord-notifications"
                  checked={notificationPreferences?.discord_enabled || false}
                  onCheckedChange={(checked) => 
                    updateNotificationPreferences({ discord_enabled: checked })
                  }
                  disabled={!discordSettings?.notifications_enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="in-app-notifications">In-App Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Show notifications within the app
                  </p>
                </div>
                <Switch
                  id="in-app-notifications"
                  checked={notificationPreferences?.in_app_enabled || false}
                  onCheckedChange={(checked) => 
                    updateNotificationPreferences({ in_app_enabled: checked })
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Notification Types */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Notification Types</Label>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="assignment-reminders">Assignment Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Get reminded about upcoming assignment deadlines
                  </p>
                </div>
                <Switch
                  id="assignment-reminders"
                  checked={notificationPreferences?.assignment_reminders || false}
                  onCheckedChange={(checked) => 
                    updateNotificationPreferences({ assignment_reminders: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="exam-reminders">Exam Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Get reminded about upcoming exams
                  </p>
                </div>
                <Switch
                  id="exam-reminders"
                  checked={notificationPreferences?.exam_reminders || false}
                  onCheckedChange={(checked) => 
                    updateNotificationPreferences({ exam_reminders: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="deadline-warnings">Deadline Warnings</Label>
                  <p className="text-sm text-muted-foreground">
                    Get urgent warnings for approaching deadlines
                  </p>
                </div>
                <Switch
                  id="deadline-warnings"
                  checked={notificationPreferences?.deadline_warnings || false}
                  onCheckedChange={(checked) => 
                    updateNotificationPreferences({ deadline_warnings: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="daily-summary">Daily Summary</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive a daily overview of your academic schedule
                  </p>
                </div>
                <Switch
                  id="daily-summary"
                  checked={notificationPreferences?.daily_summary || false}
                  onCheckedChange={(checked) => 
                    updateNotificationPreferences({ daily_summary: checked })
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Reminder Timing */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-medium">Reminder Timing</Label>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reminder-timing">When to send reminders (before due date)</Label>
              <Input
                id="reminder-timing"
                placeholder="15m, 1h, 1d"
                value={formatReminderTiming(notificationPreferences?.reminder_timing_minutes || [15, 60, 1440])}
                onChange={(e) => updateReminderTiming(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Use format: 15m (minutes), 1h (hours), 1d (days). Separate multiple times with commas.
              </p>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Actions</Label>
            
            <div className="flex gap-2">
              <Button onClick={generateReminders} disabled={loading}>
                <Bell className="h-4 w-4 mr-2" />
                Generate Reminders
              </Button>
              <Button 
                variant="outline" 
                onClick={sendDailySummary} 
                disabled={loading}
              >
                <Send className="h-4 w-4 mr-2" />
                Send Daily Summary
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}