import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { offlineStorage } from '@/services/offline';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Exam } from '@/hooks/useExams';

interface OfflineExam extends Exam {
  isPendingSync?: boolean;
}

export function useOfflineExams() {
  const [exams, setExams] = useState<OfflineExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { isOnline, triggerSync } = useOfflineSync();

  const loadFromCache = useCallback(async (): Promise<OfflineExam[]> => {
    const cached = await offlineStorage.getEntities<Exam>('exams');
    return Object.values(cached).map(entity => ({
      ...entity.data,
      isPendingSync: entity.isPendingSync
    }));
  }, []);

  const cacheExams = useCallback(async (data: Exam[]) => {
    await offlineStorage.cacheEntities('exams',
      data.map(e => ({
        id: e.id,
        data: e,
        serverUpdatedAt: e.updated_at
      }))
    );
  }, []);

  const fetchExams = useCallback(async () => {
    if (!user) return;

    try {
      if (isOnline) {
        const { data, error } = await supabase
          .from('exams')
          .select(`
            *,
            courses (
              name,
              color
            )
          `)
          .eq('user_id', user.id)
          .order('exam_date', { ascending: true });

        if (error) throw error;

        if (data) {
          await cacheExams(data);
          setExams(data.map(e => ({ ...e, isPendingSync: false })));
        }
      } else {
        const cached = await loadFromCache();
        setExams(cached.sort((a, b) =>
          new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()
        ));
      }
    } catch (err) {
      console.error('Error fetching exams:', err);
      const cached = await loadFromCache();
      if (cached.length > 0) {
        setExams(cached);
        setError(null);
      } else {
        setError('Failed to fetch exams');
      }
    } finally {
      setLoading(false);
    }
  }, [user, isOnline, cacheExams, loadFromCache]);

  const addExam = useCallback(async (examData: Omit<Exam, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const newExam: OfflineExam = {
      id: tempId,
      user_id: user.id,
      created_at: now,
      updated_at: now,
      ...examData,
      isPendingSync: !isOnline
    };

    if (isOnline) {
      try {
        const { data, error } = await supabase
          .from('exams')
          .insert([{ ...examData, user_id: user.id }])
          .select()
          .single();

        if (error) throw error;

        await offlineStorage.cacheEntity('exams', data.id, data, data.updated_at);
        await fetchExams();
        return data;
      } catch (err) {
        console.error('Error adding exam:', err);
        setError('Failed to add exam');
        return null;
      }
    } else {
      await offlineStorage.cacheEntity('exams', tempId, newExam, undefined, true);
      await offlineStorage.addPendingOperation({
        entityType: 'exams',
        operationType: 'create',
        entityId: tempId,
        payload: { ...examData, user_id: user.id }
      });

      setExams(prev => [...prev, newExam].sort((a, b) =>
        new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()
      ));
      return newExam;
    }
  }, [user, isOnline, fetchExams]);

  const updateExam = useCallback(async (id: string, updates: Partial<Exam>) => {
    if (!user) return false;

    const current = exams.find(e => e.id === id);
    if (!current) return false;

    const updatedExam: OfflineExam = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
      isPendingSync: !isOnline
    };

    if (isOnline) {
      try {
        const { error } = await supabase
          .from('exams')
          .update(updates)
          .eq('id', id);

        if (error) throw error;

        await offlineStorage.cacheEntity('exams', id, updatedExam, updatedExam.updated_at);
        await fetchExams();
        return true;
      } catch (err) {
        console.error('Error updating exam:', err);
        setError('Failed to update exam');
        return false;
      }
    } else {
      await offlineStorage.cacheEntity('exams', id, updatedExam, undefined, true);
      await offlineStorage.addPendingOperation({
        entityType: 'exams',
        operationType: 'update',
        entityId: id,
        payload: updates
      });

      setExams(prev => prev.map(e => e.id === id ? updatedExam : e));
      return true;
    }
  }, [user, isOnline, exams, fetchExams]);

  const deleteExam = useCallback(async (id: string) => {
    if (!user) return false;

    if (isOnline) {
      try {
        const { error } = await supabase
          .from('exams')
          .delete()
          .eq('id', id);

        if (error) throw error;

        await offlineStorage.removeEntity('exams', id);
        await fetchExams();
        return true;
      } catch (err) {
        console.error('Error deleting exam:', err);
        setError('Failed to delete exam');
        return false;
      }
    } else {
      await offlineStorage.removeEntity('exams', id);
      await offlineStorage.addPendingOperation({
        entityType: 'exams',
        operationType: 'delete',
        entityId: id,
        payload: {}
      });

      setExams(prev => prev.filter(e => e.id !== id));
      return true;
    }
  }, [user, isOnline, fetchExams]);

  useEffect(() => {
    if (isOnline) {
      triggerSync();
      fetchExams();
    }
  }, [isOnline, triggerSync, fetchExams]);

  useEffect(() => {
    fetchExams();
  }, [user?.id, fetchExams]);

  return {
    exams,
    loading,
    error,
    isOnline,
    addExam,
    updateExam,
    deleteExam,
    refetch: fetchExams,
  };
}
