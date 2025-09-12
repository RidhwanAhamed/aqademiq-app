import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NotificationPreferences {
  email_enabled: boolean;
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
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(false);

  // Load notification preferences
  useEffect(() => {
    if (!user) return;

    const loadSettings = async () => {
      try {
        // Load notification preferences
        const { data: prefData } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (prefData) {
          setNotificationPreferences({
            email_enabled: prefData.email_enabled,
            in_app_enabled: prefData.in_app_enabled,
            assignment_reminders: prefData.assignment_reminders,
            exam_reminders: prefData.exam_reminders,
            deadline_warnings: prefData.deadline_warnings,
            daily_summary: prefData.daily_summary,
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

  const testEmailNotification = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          action: 'send-notification',
          userId: user.id,
          data: {
            type: 'info',
            title: 'Email Test Successful! ✅',
            message: 'Your email notification system is working correctly. You\'ll receive academic reminders and updates via email.',
            metadata: {}
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Test Email Sent",
        description: "Check your email inbox for the test notification!",
      });
      return true;
    } catch (error) {
      console.error('Error sending test email:', error);
      toast({
        title: "Test Failed",
        description: "Failed to send test email. Please check your notification settings.",
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
        description: "Your upcoming reminders have been scheduled and will be sent via email.",
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
        title: "Daily Summary Sent",
        description: "Your daily summary has been sent to your email address.",
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
    notificationPreferences,
    loading,
    updateNotificationPreferences,
    testEmailNotification,
    generateReminders,
    sendDailySummary,
  };
}