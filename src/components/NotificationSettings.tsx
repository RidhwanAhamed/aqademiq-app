import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Clock, Calendar, Target, BookOpen } from 'lucide-react';

interface NotificationSettings {
  assignmentReminders: boolean;
  examReminders: boolean;
  classReminders: boolean;
  studyReminders: boolean;
  emailNotifications: boolean;
  reminderTiming: string;
}

export function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>({
    assignmentReminders: true,
    examReminders: true,
    classReminders: true,
    studyReminders: false,
    emailNotifications: true,
    reminderTiming: '30'
  });

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleTimingChange = (value: string) => {
    setSettings(prev => ({
      ...prev,
      reminderTiming: value
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          Notification Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Reminder Types */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Reminder Types</h4>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="assignment-reminders" className="text-sm">Assignment reminders</Label>
            </div>
            <Switch
              id="assignment-reminders"
              checked={settings.assignmentReminders}
              onCheckedChange={() => handleToggle('assignmentReminders')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="exam-reminders" className="text-sm">Exam reminders</Label>
            </div>
            <Switch
              id="exam-reminders"
              checked={settings.examReminders}
              onCheckedChange={() => handleToggle('examReminders')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="class-reminders" className="text-sm">Class reminders</Label>
            </div>
            <Switch
              id="class-reminders"
              checked={settings.classReminders}
              onCheckedChange={() => handleToggle('classReminders')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="study-reminders" className="text-sm">Study session reminders</Label>
            </div>
            <Switch
              id="study-reminders"
              checked={settings.studyReminders}
              onCheckedChange={() => handleToggle('studyReminders')}
            />
          </div>
        </div>

        {/* Timing */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Reminder Timing</h4>
          <div className="flex items-center gap-3">
            <Label htmlFor="timing" className="text-sm whitespace-nowrap">Remind me</Label>
            <Select value={settings.reminderTiming} onValueChange={handleTimingChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes before</SelectItem>
                <SelectItem value="30">30 minutes before</SelectItem>
                <SelectItem value="60">1 hour before</SelectItem>
                <SelectItem value="120">2 hours before</SelectItem>
                <SelectItem value="1440">1 day before</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Email Notifications */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Delivery Methods</h4>
          <div className="flex items-center justify-between">
            <Label htmlFor="email-notifications" className="text-sm">Email notifications</Label>
            <Switch
              id="email-notifications"
              checked={settings.emailNotifications}
              onCheckedChange={() => handleToggle('emailNotifications')}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}