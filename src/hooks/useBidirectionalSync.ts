import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface SyncOperation {
  id: string;
  operation_type: 'import' | 'export' | 'conflict';
  entity_type: 'schedule_block' | 'assignment' | 'exam';
  entity_id: string;
  google_event_id?: string;
  operation_status: 'pending' | 'success' | 'failed' | 'conflict';
  created_at: string;
  error_message?: string;
  conflict_data?: any;
}

interface SyncStatus {
  isOnline: boolean;
  lastSync: string | null;
  pendingOperations: number;
  conflictsCount: number;
}

export function useBidirectionalSync() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    lastSync: null,
    pendingOperations: 0,
    conflictsCount: 0,
  });
  const [operations, setOperations] = useState<SyncOperation[]>([]);
  const [loading, setLoading] = useState(false);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setSyncStatus(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setSyncStatus(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load sync operations and status
  useEffect(() => {
    if (!user) return;

    const loadSyncData = async () => {
      try {
        // Get recent sync operations
        const { data: operationsData } = await supabase
          .from('sync_operations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (operationsData) {
          setOperations(operationsData as SyncOperation[]);
          
          const pending = operationsData.filter(op => op.operation_status === 'pending').length;
          const conflicts = operationsData.filter(op => op.operation_status === 'conflict').length;
          const lastSuccessful = operationsData.find(op => op.operation_status === 'success');

          setSyncStatus(prev => ({
            ...prev,
            pendingOperations: pending,
            conflictsCount: conflicts,
            lastSync: lastSuccessful?.created_at || null,
          }));
        }

        // Get last sync time from settings
        const { data: settingsData } = await supabase
          .from('google_calendar_settings')
          .select('last_sync_at')
          .eq('user_id', user.id)
          .single();

        if (settingsData?.last_sync_at) {
          setSyncStatus(prev => ({ ...prev, lastSync: settingsData.last_sync_at }));
        }
      } catch (error) {
        console.error('Error loading sync data:', error);
      }
    };

    loadSyncData();

    // Set up real-time subscription for sync operations
    const subscription = supabase
      .channel('sync_operations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_operations',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadSyncData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  const triggerIncrementalSync = useCallback(async () => {
    if (!user || !syncStatus.isOnline) return;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('enhanced-google-calendar-sync', {
        body: { action: 'incremental-sync', userId: user.id }
      });

      if (error) throw error;

      toast({
        title: "Sync Triggered",
        description: "Incremental sync is processing in the background.",
      });
    } catch (error) {
      console.error('Error triggering sync:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to trigger incremental sync.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, syncStatus.isOnline, toast]);

  const resolveConflict = useCallback(async (operationId: string, resolution: 'prefer_local' | 'prefer_google' | 'merge') => {
    if (!user) return;

    setLoading(true);
    try {
      const operation = operations.find(op => op.id === operationId);
      if (!operation) throw new Error('Operation not found');

      const { error } = await supabase.functions.invoke('enhanced-google-calendar-sync', {
        body: { 
          action: 'conflict-resolution', 
          userId: user.id,
          conflictData: {
            operationId,
            resolution,
            conflictData: operation.conflict_data
          }
        }
      });

      if (error) throw error;

      // Update operation status
      await supabase
        .from('sync_operations')
        .update({ operation_status: 'success' })
        .eq('id', operationId);

      toast({
        title: "Conflict Resolved",
        description: `Conflict resolved using ${resolution.replace('_', ' ')} preference.`,
      });
    } catch (error) {
      console.error('Error resolving conflict:', error);
      toast({
        title: "Resolution Failed",
        description: "Failed to resolve conflict.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, operations, toast]);

  const retryFailedOperation = useCallback(async (operationId: string) => {
    if (!user) return;

    try {
      const { data: currentOp } = await supabase
        .from('sync_operations')
        .select('retry_count')
        .eq('id', operationId)
        .single();

      await supabase
        .from('sync_operations')
        .update({ 
          operation_status: 'pending',
          retry_count: (currentOp?.retry_count || 0) + 1,
          last_attempted_at: new Date().toISOString()
        })
        .eq('id', operationId);

      // Trigger sync to process the retried operation
      await triggerIncrementalSync();
    } catch (error) {
      console.error('Error retrying operation:', error);
      toast({
        title: "Retry Failed",
        description: "Failed to retry operation.",
        variant: "destructive",
      });
    }
  }, [user, triggerIncrementalSync, toast]);

  const clearCompletedOperations = useCallback(async () => {
    if (!user) return;

    try {
      await supabase
        .from('sync_operations')
        .delete()
        .eq('user_id', user.id)
        .in('operation_status', ['success'])
        .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Older than 7 days

      toast({
        title: "History Cleared",
        description: "Completed sync operations have been cleared.",
      });
    } catch (error) {
      console.error('Error clearing operations:', error);
      toast({
        title: "Clear Failed",
        description: "Failed to clear sync history.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const getConflictOperations = useCallback(() => {
    return operations.filter(op => op.operation_status === 'conflict');
  }, [operations]);

  const getPendingOperations = useCallback(() => {
    return operations.filter(op => op.operation_status === 'pending');
  }, [operations]);

  const getFailedOperations = useCallback(() => {
    return operations.filter(op => op.operation_status === 'failed');
  }, [operations]);

  return {
    syncStatus,
    operations,
    loading,
    triggerIncrementalSync,
    resolveConflict,
    retryFailedOperation,
    clearCompletedOperations,
    getConflictOperations,
    getPendingOperations,
    getFailedOperations,
  };
}