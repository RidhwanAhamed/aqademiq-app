import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { offlineStorage } from '@/services/offline';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { ScheduleBlock } from '@/hooks/useSchedule';

interface OfflineScheduleBlock extends ScheduleBlock {
  isPendingSync?: boolean;
}

export function useOfflineSchedule() {
  const [scheduleBlocks, setScheduleBlocks] = useState<OfflineScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { isOnline, triggerSync } = useOfflineSync();

  const loadFromCache = useCallback(async (): Promise<OfflineScheduleBlock[]> => {
    const cached = await offlineStorage.getEntities<ScheduleBlock>('schedule_blocks');
    return Object.values(cached).map(entity => ({
      ...entity.data,
      isPendingSync: entity.isPendingSync
    }));
  }, []);

  const cacheScheduleBlocks = useCallback(async (data: ScheduleBlock[]) => {
    await offlineStorage.cacheEntities('schedule_blocks',
      data.map(sb => ({
        id: sb.id,
        data: sb,
        serverUpdatedAt: sb.updated_at
      }))
    );
  }, []);

  const fetchScheduleBlocks = useCallback(async () => {
    if (!user) return;

    try {
      if (isOnline) {
        const { data, error } = await supabase
          .from('schedule_blocks')
          .select(`
            *,
            courses (
              name,
              color
            )
          `)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('start_time', { ascending: true });

        if (error) throw error;

        if (data) {
          await cacheScheduleBlocks(data as ScheduleBlock[]);
          setScheduleBlocks((data as ScheduleBlock[]).map(sb => ({ ...sb, isPendingSync: false })));
        }
      } else {
        const cached = await loadFromCache();
        setScheduleBlocks(cached.filter(sb => sb.is_active));
      }
    } catch (err) {
      console.error('Error fetching schedule blocks:', err);
      const cached = await loadFromCache();
      if (cached.length > 0) {
        setScheduleBlocks(cached.filter(sb => sb.is_active));
        setError(null);
      } else {
        setError('Failed to fetch schedule');
      }
    } finally {
      setLoading(false);
    }
  }, [user, isOnline, cacheScheduleBlocks, loadFromCache]);

  const addScheduleBlock = useCallback(async (blockData: Omit<ScheduleBlock, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const newBlock: OfflineScheduleBlock = {
      id: tempId,
      user_id: user.id,
      created_at: now,
      updated_at: now,
      ...blockData,
      isPendingSync: !isOnline
    };

    if (isOnline) {
      try {
        // Normalize title for comparison
        const normalizedTitle = blockData.title
          .replace(/[^a-zA-Z\s]/g, '')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, ' ');

        // Check for duplicates
        let query = supabase
          .from('schedule_blocks')
          .select('id, title')
          .eq('user_id', user.id)
          .eq('start_time', blockData.start_time)
          .eq('is_active', true);

        if (blockData.is_recurring === false && blockData.specific_date) {
          query = query.eq('specific_date', blockData.specific_date);
        } else {
          query = query.eq('day_of_week', blockData.day_of_week ?? null);
        }

        const { data: existingBlocks } = await query;

        const hasDuplicate = existingBlocks?.some(block => {
          const existingNormalized = block.title
            .replace(/[^a-zA-Z\s]/g, '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ');
          return existingNormalized === normalizedTitle;
        });

        if (hasDuplicate) {
          console.log('Duplicate schedule block detected, skipping insert');
          await fetchScheduleBlocks();
          return existingBlocks?.[0] || null;
        }

        const { data, error } = await supabase
          .from('schedule_blocks')
          .insert([{ ...blockData, user_id: user.id }])
          .select()
          .single();

        if (error) throw error;

        await offlineStorage.cacheEntity('schedule_blocks', data.id, data, data.updated_at);
        await fetchScheduleBlocks();
        return data;
      } catch (err) {
        console.error('Error adding schedule block:', err);
        setError('Failed to add schedule block');
        return null;
      }
    } else {
      await offlineStorage.cacheEntity('schedule_blocks', tempId, newBlock, undefined, true);
      await offlineStorage.addPendingOperation({
        entityType: 'schedule_blocks',
        operationType: 'create',
        entityId: tempId,
        payload: { ...blockData, user_id: user.id }
      });

      setScheduleBlocks(prev => [...prev, newBlock]);
      return newBlock;
    }
  }, [user, isOnline, fetchScheduleBlocks]);

  const updateScheduleBlock = useCallback(async (id: string, updates: Partial<ScheduleBlock>) => {
    if (!user) return false;

    const current = scheduleBlocks.find(sb => sb.id === id);
    if (!current) return false;

    const updatedBlock: OfflineScheduleBlock = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
      isPendingSync: !isOnline
    };

    if (isOnline) {
      try {
        const { error } = await supabase
          .from('schedule_blocks')
          .update(updates)
          .eq('id', id);

        if (error) throw error;

        await offlineStorage.cacheEntity('schedule_blocks', id, updatedBlock, updatedBlock.updated_at);
        await fetchScheduleBlocks();
        return true;
      } catch (err) {
        console.error('Error updating schedule block:', err);
        setError('Failed to update schedule block');
        return false;
      }
    } else {
      await offlineStorage.cacheEntity('schedule_blocks', id, updatedBlock, undefined, true);
      await offlineStorage.addPendingOperation({
        entityType: 'schedule_blocks',
        operationType: 'update',
        entityId: id,
        payload: updates
      });

      setScheduleBlocks(prev => prev.map(sb => sb.id === id ? updatedBlock : sb));
      return true;
    }
  }, [user, isOnline, scheduleBlocks, fetchScheduleBlocks]);

  const deleteScheduleBlock = useCallback(async (id: string) => {
    if (!user) return false;

    if (isOnline) {
      try {
        const { error } = await supabase
          .from('schedule_blocks')
          .update({ is_active: false })
          .eq('id', id);

        if (error) throw error;

        await offlineStorage.removeEntity('schedule_blocks', id);
        await fetchScheduleBlocks();
        return true;
      } catch (err) {
        console.error('Error deleting schedule block:', err);
        setError('Failed to delete schedule block');
        return false;
      }
    } else {
      await offlineStorage.removeEntity('schedule_blocks', id);
      await offlineStorage.addPendingOperation({
        entityType: 'schedule_blocks',
        operationType: 'update',
        entityId: id,
        payload: { is_active: false }
      });

      setScheduleBlocks(prev => prev.filter(sb => sb.id !== id));
      return true;
    }
  }, [user, isOnline, fetchScheduleBlocks]);

  useEffect(() => {
    if (isOnline) {
      triggerSync();
      fetchScheduleBlocks();
    }
  }, [isOnline, triggerSync, fetchScheduleBlocks]);

  useEffect(() => {
    fetchScheduleBlocks();
  }, [user?.id, fetchScheduleBlocks]);

  return {
    scheduleBlocks,
    loading,
    error,
    isOnline,
    addScheduleBlock,
    updateScheduleBlock,
    deleteScheduleBlock,
    refetch: fetchScheduleBlocks,
  };
}
