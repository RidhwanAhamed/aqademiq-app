import { useEffect, useState, useCallback } from "react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from "@/hooks/useAuth";
import { offlineStorage } from "@/services/offline";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { Assignment } from "@/hooks/useAssignments";

interface OfflineAssignment extends Assignment {
  isPendingSync?: boolean;
}

export function useOfflineAssignments() {
  const [assignments, setAssignments] = useState<OfflineAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { isOnline, triggerSync } = useOfflineSync();

  const loadFromCache = useCallback(async (): Promise<OfflineAssignment[]> => {
    const cached = await offlineStorage.getEntities<Assignment>('assignments');
    return Object.values(cached).map(entity => ({
      ...entity.data,
      isPendingSync: entity.isPendingSync
    }));
  }, []);

  const cacheAssignments = useCallback(async (data: Assignment[]) => {
    await offlineStorage.cacheEntities('assignments', 
      data.map(a => ({ 
        id: a.id, 
        data: a, 
        serverUpdatedAt: a.updated_at 
      }))
    );
  }, []);

  const fetchAssignments = useCallback(async () => {
    if (!user) return;

    try {
      if (isOnline) {
        // Try to fetch from server
        const { data, error } = await supabase
          .from("assignments")
          .select("*")
          .eq("user_id", user.id)
          .order("due_date", { ascending: true });

        if (error) throw error;

        // Cache the data for offline use
        if (data) {
          await cacheAssignments(data);
          setAssignments(data.map(a => ({ ...a, isPendingSync: false })));
        }
      } else {
        // Load from cache when offline
        const cached = await loadFromCache();
        setAssignments(cached.sort((a, b) => 
          new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        ));
      }
    } catch (err) {
      console.error("Error fetching assignments:", err);
      // Fall back to cache on error
      const cached = await loadFromCache();
      if (cached.length > 0) {
        setAssignments(cached);
        setError(null); // Clear error if we have cached data
      } else {
        setError("Failed to fetch assignments");
      }
    } finally {
      setLoading(false);
    }
  }, [user, isOnline, cacheAssignments, loadFromCache]);

  const addAssignment = useCallback(async (assignment: {
    title: string;
    description?: string;
    course_id: string;
    due_date: string;
    estimated_hours?: number;
    is_recurring?: boolean;
    recurrence_pattern?: string;
    recurrence_interval?: number;
    recurrence_end_date?: string;
    exam_id?: string;
  }) => {
    if (!user) return { data: null as OfflineAssignment | null, error: "Not authenticated" };

    // Generate a temporary ID for offline creation
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const newAssignment: OfflineAssignment = {
      id: tempId,
      user_id: user.id,
      created_at: now,
      updated_at: now,
      ...assignment,
      isPendingSync: !isOnline
    };

    if (isOnline) {
      try {
        const { data, error } = await supabase
          .from("assignments")
          .insert([{ ...assignment, user_id: user.id }])
          .select()
          .single();

        if (error) throw error;

        // Cache the new assignment
        await offlineStorage.cacheEntity('assignments', data.id, data, data.updated_at);
        await fetchAssignments();
        return { data: { ...data, isPendingSync: false }, error: null };
      } catch (err: any) {
        console.error("Error adding assignment:", err);
        setError("Failed to add assignment");
        return { data: null, error: err?.message || "Failed to add assignment" };
      }
    } else {
      // Offline: Add to cache and queue for sync
      await offlineStorage.cacheEntity('assignments', tempId, newAssignment, undefined, true);
      await offlineStorage.addPendingOperation({
        entityType: 'assignments',
        operationType: 'create',
        entityId: tempId,
        payload: { ...assignment, user_id: user.id }
      });

      // Optimistic update
      setAssignments(prev => [...prev, newAssignment].sort((a, b) => 
        new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      ));

      return { data: newAssignment, error: null };
    }
  }, [user, isOnline, fetchAssignments]);

  const updateAssignment = useCallback(async (id: string, updates: Partial<Assignment>) => {
    if (!user) return false;

    // Find the current assignment
    const current = assignments.find(a => a.id === id);
    if (!current) return false;

    const updatedAssignment: OfflineAssignment = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
      isPendingSync: !isOnline
    };

    if (isOnline) {
      try {
        const { error } = await supabase
          .from("assignments")
          .update(updates)
          .eq("id", id);

        if (error) throw error;

        await offlineStorage.cacheEntity('assignments', id, updatedAssignment, updatedAssignment.updated_at);
        await fetchAssignments();
        return true;
      } catch (err: any) {
        console.error("Error updating assignment:", err);
        setError("Failed to update assignment");
        return false;
      }
    } else {
      // Offline: Update cache and queue for sync
      await offlineStorage.cacheEntity('assignments', id, updatedAssignment, undefined, true);
      await offlineStorage.addPendingOperation({
        entityType: 'assignments',
        operationType: 'update',
        entityId: id,
        payload: updates
      });

      // Optimistic update
      setAssignments(prev => prev.map(a => a.id === id ? updatedAssignment : a));
      return true;
    }
  }, [user, isOnline, assignments, fetchAssignments]);

  const toggleComplete = useCallback(async (id: string, completed: boolean) => {
    return updateAssignment(id, { 
      is_completed: completed,
      completion_percentage: completed ? 100 : 0
    });
  }, [updateAssignment]);

  const deleteAssignment = useCallback(async (id: string) => {
    if (!user) return false;

    if (isOnline) {
      try {
        const { error } = await supabase
          .from("assignments")
          .delete()
          .eq("id", id);

        if (error) throw error;

        await offlineStorage.removeEntity('assignments', id);
        await fetchAssignments();
        return true;
      } catch (err: any) {
        console.error("Error deleting assignment:", err);
        setError("Failed to delete assignment");
        return false;
      }
    } else {
      // Offline: Remove from cache and queue delete
      await offlineStorage.removeEntity('assignments', id);
      await offlineStorage.addPendingOperation({
        entityType: 'assignments',
        operationType: 'delete',
        entityId: id,
        payload: {}
      });

      // Optimistic update
      setAssignments(prev => prev.filter(a => a.id !== id));
      return true;
    }
  }, [user, isOnline, fetchAssignments]);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline) {
      triggerSync();
      fetchAssignments();
    }
  }, [isOnline, triggerSync, fetchAssignments]);

  useEffect(() => {
    fetchAssignments();
  }, [user?.id, fetchAssignments]);

  return {
    assignments,
    loading,
    error,
    isOnline,
    refetch: fetchAssignments,
    addAssignment,
    updateAssignment,
    toggleComplete,
    deleteAssignment,
  };
}
