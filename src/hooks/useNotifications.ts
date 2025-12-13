import { useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { notificationService } from '@/services/notifications';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook for managing push and local notifications
 */
export function useNotifications() {
  const { user } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    if (!user || initialized.current) return;

    const init = async () => {
      // Initialize push notifications (native only)
      await notificationService.initialize();
      
      // Initialize local notifications
      await notificationService.initializeLocal();
      
      initialized.current = true;
    };

    init();
  }, [user]);

  const showNotification = useCallback(async (title: string, body: string, data?: Record<string, unknown>) => {
    await notificationService.showLocalNotification({ title, body, data });
  }, []);

  const scheduleAssignmentReminder = useCallback(async (
    assignmentId: string,
    title: string,
    dueDate: Date,
    minutesBefore?: number
  ) => {
    return notificationService.scheduleAssignmentReminder(assignmentId, title, dueDate, minutesBefore);
  }, []);

  const scheduleExamReminder = useCallback(async (
    examId: string,
    title: string,
    examDate: Date,
    daysBefore?: number
  ) => {
    return notificationService.scheduleExamReminder(examId, title, examDate, daysBefore);
  }, []);

  const scheduleStudyReminder = useCallback(async (
    sessionTitle: string,
    startTime: Date,
    minutesBefore?: number
  ) => {
    return notificationService.scheduleStudySessionReminder(sessionTitle, startTime, minutesBefore);
  }, []);

  const cancelNotification = useCallback(async (id: number) => {
    await notificationService.cancelNotification(id);
  }, []);

  const cancelAllNotifications = useCallback(async () => {
    await notificationService.cancelAllNotifications();
  }, []);

  return {
    showNotification,
    scheduleAssignmentReminder,
    scheduleExamReminder,
    scheduleStudyReminder,
    cancelNotification,
    cancelAllNotifications,
    isNative: Capacitor.isNativePlatform()
  };
}

export default useNotifications;
