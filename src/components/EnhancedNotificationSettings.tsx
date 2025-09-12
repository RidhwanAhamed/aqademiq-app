import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, TestTube, Bell, Clock, CheckCircle, AlertCircle, Send } from "lucide-react";
import { useEnhancedNotifications } from "@/hooks/useEnhancedNotifications";

export function EnhancedNotificationSettings() {
  const {
    notificationPreferences,
    loading,
    updateNotificationPreferences,
    testEmailNotification,
    generateReminders,
    sendDailySummary,
  } = useEnhancedNotifications();

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
      {/* Email Notification System */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle>Email Notifications</CardTitle>
          </div>
          <CardDescription>
            Receive academic reminders and updates directly to your email inbox
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Status */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Email Notifications</Label>
              <div className="flex items-center gap-2">
                {notificationPreferences?.email_enabled ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">Enabled</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Disabled</span>
                  </>
                )}
              </div>
            </div>
            <Switch
              checked={notificationPreferences?.email_enabled || false}
              onCheckedChange={(checked) => 
                updateNotificationPreferences({ email_enabled: checked })
              }
            />
          </div>

          <Separator />

          {/* Email Test */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Test Email System</Label>
              <p className="text-sm text-muted-foreground">
                Send a test email to verify your notification system is working
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={testEmailNotification}
              disabled={loading || !notificationPreferences?.email_enabled}
            >
              <TestTube className="h-4 w-4 mr-2" />
              Send Test Email
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Notification Preferences</CardTitle>
          </div>
          <CardDescription>
            Configure when and how you receive academic notifications
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
                    Receive a daily overview of your academic schedule via email
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
            
            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={generateReminders} 
                disabled={loading || !notificationPreferences?.email_enabled}
              >
                <Bell className="h-4 w-4 mr-2" />
                Generate Email Reminders
              </Button>
              <Button 
                variant="outline" 
                onClick={sendDailySummary} 
                disabled={loading || !notificationPreferences?.email_enabled}
              >
                <Send className="h-4 w-4 mr-2" />
                Send Daily Summary
              </Button>
            </div>
            
            {!notificationPreferences?.email_enabled && (
              <p className="text-sm text-muted-foreground">
                Enable email notifications to use these features
              </p>
            )}
          </div>

          {/* Email Benefits */}
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">✨ Why Email Notifications?</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
              <li>Never miss important assignment deadlines</li>
              <li>Get timely exam reminders with study tips</li>
              <li>Professional email templates for better organization</li>
              <li>Daily summaries to stay on top of your schedule</li>
              <li>Works across all devices and platforms</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}