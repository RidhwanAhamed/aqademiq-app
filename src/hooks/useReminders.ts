import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Reminder {
  id: string;
  user_id: string;
  assignment_id?: string;
  exam_id?: string;
  schedule_block_id?: string;
  title: string;
  message?: string;
  remind_at: string;
  reminder_type: string;
  is_sent: boolean;
  is_active: boolean;
  created_at: string;
}

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchReminders = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('remind_at', { ascending: true });

      if (error) throw error;
      setReminders(data || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
      setError('Failed to fetch reminders');
    }
  };

  const addReminder = async (reminder: Omit<Reminder, 'id' | 'user_id' | 'created_at' | 'is_sent'>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('reminders')
        .insert({
          ...reminder,
          user_id: user.id
        });

      if (error) throw error;
      await fetchReminders();
    } catch (error) {
      console.error('Error adding reminder:', error);
      setError('Failed to add reminder');
    }
  };

  const updateReminder = async (id: string, updates: Partial<Reminder>) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchReminders();
    } catch (error) {
      console.error('Error updating reminder:', error);
      setError('Failed to update reminder');
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      await fetchReminders();
    } catch (error) {
      console.error('Error deleting reminder:', error);
      setError('Failed to delete reminder');
    }
  };

  const getUpcomingReminders = () => {
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    return reminders.filter(reminder => {
      const remindTime = new Date(reminder.remind_at);
      return remindTime >= now && remindTime <= next24Hours && !reminder.is_sent;
    });
  };

  const markAsSent = async (id: string) => {
    await updateReminder(id, { is_sent: true });
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await fetchReminders();
      setLoading(false);
    };

    fetchData();
  }, [user]);

  return {
    reminders,
    loading,
    error,
    addReminder,
    updateReminder,
    deleteReminder,
    getUpcomingReminders,
    markAsSent,
    refetch: fetchReminders
  };
}