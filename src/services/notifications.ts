import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';
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

export interface PermissionStatus {
  display: 'granted' | 'denied' | 'prompt';
}

class NotificationService {
  private initialized = false;
  private pushToken: string | null = null;
  private localNotificationsInitialized = false;

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
   * Check and request notification permissions
   * Returns the current permission status
   */
  async checkAndRequestPermissions(): Promise<PermissionStatus> {
    if (!Capacitor.isNativePlatform()) {
      // Web fallback - check browser notification permission
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          return { display: 'granted' };
        } else if (Notification.permission === 'denied') {
          return { display: 'denied' };
        } else {
          const result = await Notification.requestPermission();
          return { display: result === 'granted' ? 'granted' : 'denied' };
        }
      }
      return { display: 'denied' };
    }

    try {
      // Check current permission status
      const status = await LocalNotifications.checkPermissions();
      
      if (status.display === 'granted') {
        return { display: 'granted' };
      }
      
      // Request permissions if not granted
      const requestResult = await LocalNotifications.requestPermissions();
      return { display: requestResult.display as 'granted' | 'denied' | 'prompt' };
    } catch (error) {
      console.error('Error checking/requesting permissions:', error);
      return { display: 'denied' };
    }
  }

  /**
   * Initialize local notifications with proper channel for Android
   */
  async initializeLocal(): Promise<boolean> {
    if (this.localNotificationsInitialized) return true;
    
    if (!Capacitor.isNativePlatform()) {
      console.log('Local notifications only available on native platforms');
      return false;
    }

    try {
      // Request permissions
      const permStatus = await this.checkAndRequestPermissions();
      
      if (permStatus.display !== 'granted') {
        console.log('Local notification permission not granted');
        return false;
      }

      // Create notification channel for Android (required for Android 8.0+)
      if (Capacitor.getPlatform() === 'android') {
        try {
          await LocalNotifications.createChannel({
            id: 'aqademiq_default',
            name: 'Aqademiq Notifications',
            description: 'Default notification channel for Aqademiq',
            importance: 5, // Max importance
            visibility: 1, // Public
            vibration: true,
            lights: true,
            sound: 'default'
          });
          console.log('Android notification channel created');
        } catch (channelError) {
          console.warn('Error creating notification channel:', channelError);
        }
      }

      // Set up local notification action listener
      LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        console.log('Local notification action:', notification);
        this.handleNotificationAction(notification.notification.extra);
      });

      this.localNotificationsInitialized = true;
      console.log('Local notifications initialized');
      return true;
    } catch (error) {
      console.error('Error initializing local notifications:', error);
      return false;
    }
  }

  /**
   * Show an immediate local notification
   * Returns true if notification was shown successfully
   */
  async showLocalNotification(payload: NotificationPayload): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      // Fallback to browser notification
      if ('Notification' in window) {
        if (Notification.permission !== 'granted') {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            console.warn('Browser notification permission denied');
            return false;
          }
        }
        try {
          new Notification(payload.title, { body: payload.body });
          return true;
        } catch (e) {
          console.error('Error showing browser notification:', e);
          return false;
        }
      }
      return false;
    }

    // Check permissions first
    const permStatus = await this.checkAndRequestPermissions();
    if (permStatus.display !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    try {
      const notification: LocalNotificationSchema = {
        id: Date.now(),
        title: payload.title,
        body: payload.body,
        extra: payload.data,
        channelId: 'aqademiq_default',
        smallIcon: 'ic_stat_notification',
        iconColor: '#8B5CF6' // Aqademiq purple
      };

      await LocalNotifications.schedule({ notifications: [notification] });
      console.log('Local notification shown successfully');
      return true;
    } catch (error) {
      console.error('Error showing local notification:', error);
      return false;
    }
  }

  /**
   * Schedule a local notification for later
   * Returns notification ID if successful, null otherwise
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

    // Check permissions first
    const permStatus = await this.checkAndRequestPermissions();
    if (permStatus.display !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    try {
      const id = Date.now();
      const notification: LocalNotificationSchema = {
        id,
        title: payload.title,
        body: payload.body,
        extra: payload.data,
        channelId: 'aqademiq_default',
        schedule: {
          at: payload.schedule.at,
          repeats: payload.schedule.repeats || false,
          every: payload.schedule.every,
          allowWhileIdle: true // Important for Android Doze mode
        },
        smallIcon: 'ic_stat_notification',
        iconColor: '#8B5CF6'
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
  async cancelNotification(id: number): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;

    try {
      await LocalNotifications.cancel({ notifications: [{ id }] });
      return true;
    } catch (error) {
      console.error('Error canceling notification:', error);
      return false;
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;

    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }
      return true;
    } catch (error) {
      console.error('Error canceling all notifications:', error);
      return false;
    }
  }

  /**
   * Get current permission status without requesting
   */
  async getPermissionStatus(): Promise<PermissionStatus> {
    if (!Capacitor.isNativePlatform()) {
      if ('Notification' in window) {
        return { display: Notification.permission === 'granted' ? 'granted' : 'denied' };
      }
      return { display: 'denied' };
    }

    try {
      const status = await LocalNotifications.checkPermissions();
      return { display: status.display as 'granted' | 'denied' | 'prompt' };
    } catch (error) {
      return { display: 'denied' };
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