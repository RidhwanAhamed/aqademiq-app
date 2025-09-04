import { useState, useEffect } from 'react';
import { supabase } from '@/config/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

export interface ScheduleConflict {
  conflict_type: string;
  conflict_id: string;
  conflict_title: string;
  conflict_start: string;
  conflict_end: string;
}

export function useScheduleConflicts() {
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const checkConflicts = async (startTime: string, endTime: string, excludeId?: string) => {
    if (!user) return [];

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('detect_schedule_conflicts', {
        p_user_id: user.id,
        p_start_time: startTime,
        p_end_time: endTime,
        p_exclude_id: excludeId || null
      });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error checking schedule conflicts:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const checkEventConflicts = async (eventData: {
    start_time: string;
    end_time: string;
    event_type: 'assignment' | 'exam' | 'class';
    exclude_id?: string;
  }) => {
    const conflicts = await checkConflicts(
      eventData.start_time,
      eventData.end_time,
      eventData.exclude_id
    );
    
    setConflicts(conflicts);
    return conflicts;
  };

  const resolveConflict = async (conflictId: string, action: 'reschedule' | 'ignore') => {
    try {
      if (action === 'reschedule') {
        // Implement automatic rescheduling logic
        // This would move the conflicting event to the next available slot
        // For now, we'll just remove it from the conflicts list
        setConflicts(prev => prev.filter(c => c.conflict_id !== conflictId));
      } else {
        // Simply remove from conflicts list
        setConflicts(prev => prev.filter(c => c.conflict_id !== conflictId));
      }

      return { success: true };
    } catch (error) {
      console.error('Error resolving conflict:', error);
      return { success: false, error };
    }
  };

  const clearConflicts = () => {
    setConflicts([]);
  };

  return {
    conflicts,
    loading,
    checkConflicts,
    checkEventConflicts,
    resolveConflict,
    clearConflicts
  };
}