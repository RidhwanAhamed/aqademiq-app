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
    if (!user || !syncStatus.isOnline) {
      toast({
        title: "Sync Unavailable",
        description: syncStatus.isOnline ? "Please sign in first." : "You're offline. Please check your internet connection.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log('Triggering incremental sync for user:', user.id);
      
      const { data, error } = await supabase.functions.invoke('enhanced-google-calendar-sync', {
        body: { action: 'incremental-sync', userId: user.id }
      });

      console.log('Incremental sync response:', { data, error });

      if (error) {
        console.error('Incremental sync error:', error);
        throw new Error(error.message || 'Failed to perform incremental sync');
      }

      if (data?.error) {
        console.error('Incremental sync returned error:', data.error);
        throw new Error(data.error);
      }

      const syncedEvents = data?.synced_events || 0;
      const conflictsDetected = data?.conflicts?.length || 0;

      let message = "Incremental sync completed successfully.";
      if (syncedEvents > 0) {
        message += ` ${syncedEvents} events processed.`;
      }
      if (conflictsDetected > 0) {
        message += ` ${conflictsDetected} conflicts detected.`;
      }

      toast({
        title: "Sync Completed",
        description: message,
      });
      
      return data;
    } catch (error) {
      console.error('Error triggering incremental sync:', error);
      
      let errorMessage = "Failed to sync recent changes.";
      if (error instanceof Error) {
        if (error.message.includes('token')) {
          errorMessage = "Authentication expired. Please reconnect your Google account.";
        } else if (error.message.includes('No Google tokens found')) {
          errorMessage = "Google account not connected. Please connect your Google account first.";
        } else if (error.message.includes('quota')) {
          errorMessage = "Google API quota exceeded. Please try again later.";
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = "Network connection error. Please check your internet connection.";
        } else {
          errorMessage = `Sync failed: ${error.message}`;
        }
      }
      
      toast({
        title: "Sync Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, syncStatus.isOnline, toast]);

  const resolveConflict = useCallback(async (operationId: string, resolution: 'prefer_local' | 'prefer_google' | 'merge') => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to resolve conflicts.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const operation = operations.find(op => op.id === operationId);
      if (!operation) {
        throw new Error('Operation not found - it may have already been resolved');
      }

      console.log(`Resolving conflict ${operationId} with resolution: ${resolution}`);

      const { data, error } = await supabase.functions.invoke('enhanced-google-calendar-sync', {
        body: { 
          action: 'conflict-resolution', 
          userId: user.id,
          conflictData: {
            conflict_id: operationId,
            resolution_type: resolution,
            resolved_data: operation.conflict_data
          }
        }
      });

      console.log('Conflict resolution response:', { data, error });

      if (error) {
        console.error('Conflict resolution error:', error);
        throw new Error(error.message || 'Failed to resolve conflict');
      }

      if (data?.error) {
        console.error('Conflict resolution returned error:', data.error);
        throw new Error(data.error);
      }

      // Update operation status locally
      setOperations(prev => prev.map(op => 
        op.id === operationId 
          ? { ...op, operation_status: 'success' } 
          : op
      ));

      // Update sync status
      setSyncStatus(prev => ({
        ...prev,
        conflictsCount: Math.max(0, prev.conflictsCount - 1)
      }));

      toast({
        title: "Conflict Resolved",
        description: `Conflict resolved using ${resolution.replace('_', ' ')} preference.`,
      });
      
      return data;
    } catch (error) {
      console.error('Error resolving conflict:', error);
      
      let errorMessage = "Failed to resolve sync conflict.";
      if (error instanceof Error) {
        if (error.message.includes('Conflict not found')) {
          errorMessage = "Conflict no longer exists or has already been resolved.";
        } else if (error.message.includes('token')) {
          errorMessage = "Authentication expired. Please reconnect your Google account.";
        } else if (error.message.includes('Operation not found')) {
          errorMessage = "This conflict may have already been resolved.";
        } else {
          errorMessage = `Conflict resolution failed: ${error.message}`;
        }
      }
      
      toast({
        title: "Resolution Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw error;
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