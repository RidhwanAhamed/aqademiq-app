import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DiscordSettings {
  webhook_url?: string;
  username?: string;
  notifications_enabled: boolean;
  assignment_notifications: boolean;
  exam_notifications: boolean;
  reminder_notifications: boolean;
}

interface NotificationPreferences {
  email_enabled: boolean;
  discord_enabled: boolean;
  in_app_enabled: boolean;
  assignment_reminders: boolean;
  exam_reminders: boolean;
  deadline_warnings: boolean;
  daily_summary: boolean;
  reminder_timing_minutes: number[];
}

export function useEnhancedNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [discordSettings, setDiscordSettings] = useState<DiscordSettings | null>(null);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(false);

  // Load settings
  useEffect(() => {
    if (!user) return;

    const loadSettings = async () => {
      try {
        // Load Discord settings
        const { data: discordData } = await supabase
          .from('discord_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (discordData) {
          setDiscordSettings(discordData);
        }

        // Load notification preferences
        const { data: prefData } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (prefData) {
          setNotificationPreferences({
            ...prefData,
            reminder_timing_minutes: Array.isArray(prefData.reminder_timing_minutes) 
              ? (prefData.reminder_timing_minutes as number[])
              : [15, 60, 1440]
          });
        }
      } catch (error) {
        console.error('Error loading notification settings:', error);
      }
    };

    loadSettings();
  }, [user]);

  const updateDiscordSettings = async (newSettings: Partial<DiscordSettings>) => {
    if (!user) return;

    setLoading(true);
    try {
      const updatedSettings = { ...discordSettings, ...newSettings };
      
      const { error } = await supabase
        .from('discord_settings')
        .upsert({
          user_id: user.id,
          ...updatedSettings,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setDiscordSettings(updatedSettings);
      
      toast({
        title: "Settings Updated",
        description: "Discord notification settings have been updated.",
      });
    } catch (error) {
      console.error('Error updating Discord settings:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update Discord settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateNotificationPreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    if (!user) return;

    setLoading(true);
    try {
      const updatedPreferences = { ...notificationPreferences, ...newPreferences };
      
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...updatedPreferences,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setNotificationPreferences(updatedPreferences);
      
      toast({
        title: "Preferences Updated",
        description: "Notification preferences have been updated.",
      });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update notification preferences.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testDiscordWebhook = async (webhookUrl: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('discord-notifications', {
        body: {
          action: 'test-webhook',
          data: { webhookUrl }
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Test Successful",
          description: "Discord webhook is working correctly! Check your Discord server for the test message.",
        });
        return true;
      } else {
        throw new Error(data?.error || 'Test failed');
      }
    } catch (error) {
      console.error('Error testing Discord webhook:', error);
      toast({
        title: "Test Failed",
        description: error.message || "Failed to send test message to Discord.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const generateReminders = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('enhanced-reminders', {
        body: {
          action: 'generate-reminders',
          userId: user.id
        }
      });

      if (error) throw error;

      toast({
        title: "Reminders Generated",
        description: "Your upcoming reminders have been scheduled.",
      });
    } catch (error) {
      console.error('Error generating reminders:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate reminders.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendDailySummary = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('enhanced-reminders', {
        body: {
          action: 'send-daily-summary',
          userId: user.id
        }
      });

      if (error) throw error;

      toast({
        title: "Summary Sent",
        description: "Daily summary has been sent to your configured channels.",
      });
    } catch (error) {
      console.error('Error sending daily summary:', error);
      toast({
        title: "Send Failed",
        description: "Failed to send daily summary.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    discordSettings,
    notificationPreferences,
    loading,
    updateDiscordSettings,
    updateNotificationPreferences,
    testDiscordWebhook,
    generateReminders,
    sendDailySummary,
  };
}