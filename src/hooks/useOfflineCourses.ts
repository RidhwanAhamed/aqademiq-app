import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { offlineStorage } from '@/services/offline';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Course, Semester } from '@/hooks/useCourses';

interface OfflineCourse extends Course {
  isPendingSync?: boolean;
}

interface OfflineSemester extends Semester {
  isPendingSync?: boolean;
}

export function useOfflineCourses() {
  const [courses, setCourses] = useState<OfflineCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { isOnline, triggerSync } = useOfflineSync();

  const loadFromCache = useCallback(async (): Promise<OfflineCourse[]> => {
    const cached = await offlineStorage.getEntities<Course>('courses');
    return Object.values(cached).map(entity => ({
      ...entity.data,
      isPendingSync: entity.isPendingSync
    }));
  }, []);

  const cacheCourses = useCallback(async (data: Course[]) => {
    await offlineStorage.cacheEntities('courses',
      data.map(c => ({
        id: c.id,
        data: c,
        serverUpdatedAt: c.updated_at
      }))
    );
  }, []);

  const fetchCourses = useCallback(async () => {
    if (!user) return;

    try {
      if (isOnline) {
        const { data, error } = await supabase
          .from('courses')
          .select(`
            *,
            semesters (
              name
            )
          `)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          await cacheCourses(data);
          setCourses(data.map(c => ({ ...c, isPendingSync: false })));
        }
      } else {
        const cached = await loadFromCache();
        setCourses(cached.filter(c => c.is_active));
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
      const cached = await loadFromCache();
      if (cached.length > 0) {
        setCourses(cached.filter(c => c.is_active));
        setError(null);
      } else {
        setError('Failed to fetch courses');
      }
    } finally {
      setLoading(false);
    }
  }, [user, isOnline, cacheCourses, loadFromCache]);

  const addCourse = useCallback(async (courseData: Omit<Course, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const newCourse: OfflineCourse = {
      id: tempId,
      user_id: user.id,
      created_at: now,
      updated_at: now,
      ...courseData,
      isPendingSync: !isOnline
    };

    if (isOnline) {
      try {
        const { data, error } = await supabase
          .from('courses')
          .insert([{ ...courseData, user_id: user.id }])
          .select()
          .single();

        if (error) throw error;

        await offlineStorage.cacheEntity('courses', data.id, data, data.updated_at);
        await fetchCourses();
        return data;
      } catch (err) {
        console.error('Error adding course:', err);
        setError('Failed to add course');
        return null;
      }
    } else {
      await offlineStorage.cacheEntity('courses', tempId, newCourse, undefined, true);
      await offlineStorage.addPendingOperation({
        entityType: 'courses',
        operationType: 'create',
        entityId: tempId,
        payload: { ...courseData, user_id: user.id }
      });

      setCourses(prev => [newCourse, ...prev]);
      return newCourse;
    }
  }, [user, isOnline, fetchCourses]);

  const updateCourse = useCallback(async (id: string, updates: Partial<Course>) => {
    if (!user) return false;

    const current = courses.find(c => c.id === id);
    if (!current) return false;

    const updatedCourse: OfflineCourse = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
      isPendingSync: !isOnline
    };

    if (isOnline) {
      try {
        const { error } = await supabase
          .from('courses')
          .update(updates)
          .eq('id', id);

        if (error) throw error;

        await offlineStorage.cacheEntity('courses', id, updatedCourse, updatedCourse.updated_at);
        await fetchCourses();
        return true;
      } catch (err) {
        console.error('Error updating course:', err);
        setError('Failed to update course');
        return false;
      }
    } else {
      await offlineStorage.cacheEntity('courses', id, updatedCourse, undefined, true);
      await offlineStorage.addPendingOperation({
        entityType: 'courses',
        operationType: 'update',
        entityId: id,
        payload: updates
      });

      setCourses(prev => prev.map(c => c.id === id ? updatedCourse : c));
      return true;
    }
  }, [user, isOnline, courses, fetchCourses]);

  const deleteCourse = useCallback(async (id: string) => {
    if (!user) return false;

    if (isOnline) {
      try {
        const { error } = await supabase
          .from('courses')
          .update({ is_active: false })
          .eq('id', id);

        if (error) throw error;

        await offlineStorage.removeEntity('courses', id);
        await fetchCourses();
        return true;
      } catch (err) {
        console.error('Error deleting course:', err);
        setError('Failed to delete course');
        return false;
      }
    } else {
      await offlineStorage.cacheEntity('courses', id, { ...courses.find(c => c.id === id)!, is_active: false }, undefined, true);
      await offlineStorage.addPendingOperation({
        entityType: 'courses',
        operationType: 'update',
        entityId: id,
        payload: { is_active: false }
      });

      setCourses(prev => prev.filter(c => c.id !== id));
      return true;
    }
  }, [user, isOnline, courses, fetchCourses]);

  useEffect(() => {
    if (isOnline) {
      triggerSync();
      fetchCourses();
    }
  }, [isOnline, triggerSync, fetchCourses]);

  useEffect(() => {
    fetchCourses();
  }, [user?.id, fetchCourses]);

  return {
    courses,
    loading,
    error,
    isOnline,
    addCourse,
    updateCourse,
    deleteCourse,
    refetch: fetchCourses,
  };
}

export function useOfflineSemesters() {
  const [semesters, setSemesters] = useState<OfflineSemester[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { isOnline, triggerSync } = useOfflineSync();

  const loadFromCache = useCallback(async (): Promise<OfflineSemester[]> => {
    const cached = await offlineStorage.getEntities<Semester>('semesters');
    return Object.values(cached).map(entity => ({
      ...entity.data,
      isPendingSync: entity.isPendingSync
    }));
  }, []);

  const cacheSemesters = useCallback(async (data: Semester[]) => {
    await offlineStorage.cacheEntities('semesters',
      data.map(s => ({
        id: s.id,
        data: s,
        serverUpdatedAt: s.updated_at
      }))
    );
  }, []);

  const fetchSemesters = useCallback(async () => {
    if (!user) return;

    try {
      if (isOnline) {
        const { data, error } = await supabase
          .from('semesters')
          .select('*')
          .eq('user_id', user.id)
          .order('start_date', { ascending: false });

        if (error) throw error;

        if (data) {
          await cacheSemesters(data);
          setSemesters(data.map(s => ({ ...s, isPendingSync: false })));
        }
      } else {
        const cached = await loadFromCache();
        setSemesters(cached);
      }
    } catch (err) {
      console.error('Error fetching semesters:', err);
      const cached = await loadFromCache();
      if (cached.length > 0) {
        setSemesters(cached);
        setError(null);
      } else {
        setError('Failed to fetch semesters');
      }
    } finally {
      setLoading(false);
    }
  }, [user, isOnline, cacheSemesters, loadFromCache]);

  const addSemester = useCallback(async (semesterData: Omit<Semester, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const newSemester: OfflineSemester = {
      id: tempId,
      user_id: user.id,
      created_at: now,
      updated_at: now,
      ...semesterData,
      isPendingSync: !isOnline
    };

    if (isOnline) {
      try {
        const { data, error } = await supabase
          .from('semesters')
          .insert([{ ...semesterData, user_id: user.id }])
          .select()
          .single();

        if (error) throw error;

        await offlineStorage.cacheEntity('semesters', data.id, data, data.updated_at);
        await fetchSemesters();
        return data;
      } catch (err) {
        console.error('Error adding semester:', err);
        setError('Failed to add semester');
        return null;
      }
    } else {
      await offlineStorage.cacheEntity('semesters', tempId, newSemester, undefined, true);
      await offlineStorage.addPendingOperation({
        entityType: 'semesters',
        operationType: 'create',
        entityId: tempId,
        payload: { ...semesterData, user_id: user.id }
      });

      setSemesters(prev => [newSemester, ...prev]);
      return newSemester;
    }
  }, [user, isOnline, fetchSemesters]);

  useEffect(() => {
    if (isOnline) {
      triggerSync();
      fetchSemesters();
    }
  }, [isOnline, triggerSync, fetchSemesters]);

  useEffect(() => {
    fetchSemesters();
  }, [user?.id, fetchSemesters]);

  return {
    semesters,
    loading,
    error,
    isOnline,
    addSemester,
    refetch: fetchSemesters,
  };
}
