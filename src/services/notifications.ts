import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { LocalNotifications, LocalNotificationSchema, ScheduleOptions } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  schedule?: {
    at: Date;
    repeats?: boolean;
    every?: 'day' | 'hour' | 'minute' | 'week' | 'month' | 'year';
  };
}

class NotificationService {
  private initialized = false;
  private pushToken: string | null = null;

  /**
   * Initialize push notifications (call once on app start)
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;
    
    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications only available on native platforms');
      return false;
    }

    try {
      // Request permission
      const permStatus = await PushNotifications.requestPermissions();
      
      if (permStatus.receive === 'granted') {
        // Register with APNs/FCM
        await PushNotifications.register();
        
        // Set up listeners
        this.setupListeners();
        
        this.initialized = true;
        console.log('Push notifications initialized');
        return true;
      } else {
        console.log('Push notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      return false;
    }
  }

  private setupListeners() {
    // Handle registration success
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('Push registration success, token:', token.value);
      this.pushToken = token.value;
      
      // Store token in database for sending push notifications later
      await this.storePushToken(token.value);
    });

    // Handle registration error
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Error on registration:', error);
    });

    // Handle push notification received while app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push notification received:', notification);
      // Show as local notification if needed
      this.showLocalNotification({
        title: notification.title || 'Aqademiq',
        body: notification.body || '',
        data: notification.data
      });
    });

    // Handle push notification action (user tapped notification)
    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('Push notification action performed:', action);
      this.handleNotificationAction(action.notification.data);
    });
  }

  /**
   * Store push token in database for server-side notifications
   */
  private async storePushToken(token: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Store in notification_preferences or a dedicated push_tokens table
      // For now, we'll log it - you can extend this to store in DB
      console.log('Push token for user', user.id, ':', token);
    } catch (error) {
      console.error('Error storing push token:', error);
    }
  }

  /**
   * Handle notification tap - navigate to relevant screen
   */
  private handleNotificationAction(data: Record<string, unknown> | undefined) {
    if (!data) return;

    const { type, id } = data as { type?: string; id?: string };
    
    switch (type) {
      case 'assignment':
        window.location.href = `/assignments?id=${id}`;
        break;
      case 'exam':
        window.location.href = `/calendar?exam=${id}`;
        break;
      case 'study_session':
        window.location.href = `/timer`;
        break;
      case 'reminder':
        window.location.href = `/calendar`;
        break;
      default:
        window.location.href = '/';
    }
  }

  /**
   * Initialize local notifications
   */
  async initializeLocal(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Local notifications only available on native platforms');
      return false;
    }

    try {
      const permStatus = await LocalNotifications.requestPermissions();
      return permStatus.display === 'granted';
    } catch (error) {
      console.error('Error initializing local notifications:', error);
      return false;
    }
  }

  /**
   * Show an immediate local notification
   */
  async showLocalNotification(payload: NotificationPayload): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      // Fallback to browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(payload.title, { body: payload.body });
      }
      return;
    }

    try {
      const notification: LocalNotificationSchema = {
        id: Date.now(),
        title: payload.title,
        body: payload.body,
        extra: payload.data,
        smallIcon: 'ic_stat_notification',
        iconColor: '#6366f1'
      };

      await LocalNotifications.schedule({ notifications: [notification] });
    } catch (error) {
      console.error('Error showing local notification:', error);
    }
  }

  /**
   * Schedule a local notification for later
   */
  async scheduleNotification(payload: NotificationPayload): Promise<number | null> {
    if (!payload.schedule?.at) {
      console.error('Schedule time required for scheduled notifications');
      return null;
    }

    if (!Capacitor.isNativePlatform()) {
      console.log('Scheduled notifications only available on native platforms');
      return null;
    }

    try {
      const id = Date.now();
      const notification: LocalNotificationSchema = {
        id,
        title: payload.title,
        body: payload.body,
        extra: payload.data,
        schedule: {
          at: payload.schedule.at,
          repeats: payload.schedule.repeats || false,
          every: payload.schedule.every
        },
        smallIcon: 'ic_stat_notification',
        iconColor: '#6366f1'
      };

      await LocalNotifications.schedule({ notifications: [notification] });
      console.log('Notification scheduled for', payload.schedule.at);
      return id;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(id: number): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await LocalNotifications.cancel({ notifications: [{ id }] });
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  /**
   * Schedule assignment reminder
   */
  async scheduleAssignmentReminder(
    assignmentId: string, 
    title: string, 
    dueDate: Date, 
    reminderMinutesBefore: number = 60
  ): Promise<number | null> {
    const reminderTime = new Date(dueDate.getTime() - reminderMinutesBefore * 60 * 1000);
    
    if (reminderTime <= new Date()) {
      console.log('Reminder time is in the past, skipping');
      return null;
    }

    return this.scheduleNotification({
      title: '📚 Assignment Due Soon',
      body: `"${title}" is due in ${reminderMinutesBefore} minutes`,
      data: { type: 'assignment', id: assignmentId },
      schedule: { at: reminderTime }
    });
  }

  /**
   * Schedule exam reminder
   */
  async scheduleExamReminder(
    examId: string, 
    title: string, 
    examDate: Date, 
    reminderDaysBefore: number = 1
  ): Promise<number | null> {
    const reminderTime = new Date(examDate.getTime() - reminderDaysBefore * 24 * 60 * 60 * 1000);
    reminderTime.setHours(9, 0, 0, 0); // Set to 9 AM

    if (reminderTime <= new Date()) {
      console.log('Reminder time is in the past, skipping');
      return null;
    }

    return this.scheduleNotification({
      title: '📝 Exam Coming Up',
      body: `"${title}" is in ${reminderDaysBefore} day(s)`,
      data: { type: 'exam', id: examId },
      schedule: { at: reminderTime }
    });
  }

  /**
   * Schedule study session reminder
   */
  async scheduleStudySessionReminder(
    sessionTitle: string,
    startTime: Date,
    reminderMinutesBefore: number = 15
  ): Promise<number | null> {
    const reminderTime = new Date(startTime.getTime() - reminderMinutesBefore * 60 * 1000);

    if (reminderTime <= new Date()) {
      console.log('Reminder time is in the past, skipping');
      return null;
    }

    return this.scheduleNotification({
      title: '⏰ Study Session Starting',
      body: `"${sessionTitle}" starts in ${reminderMinutesBefore} minutes`,
      data: { type: 'study_session' },
      schedule: { at: reminderTime }
    });
  }

  /**
   * Get current push token
   */
  getPushToken(): string | null {
    return this.pushToken;
  }
}

export const notificationService = new NotificationService();
export default notificationService;
