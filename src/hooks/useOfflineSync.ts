import { useState, useEffect, useCallback } from 'react';
import { syncManager, offlineStorage, SyncConflict } from '@/services/offline';

interface OfflineSyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  conflictsCount: number;
  lastSyncAt: number | null;
}

/**
 * Hook for managing offline sync state and operations
 */
export function useOfflineSync() {
  const [status, setStatus] = useState<OfflineSyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingCount: 0,
    conflictsCount: 0,
    lastSyncAt: null
  });
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);

  useEffect(() => {
    // Initialize sync manager
    syncManager.initialize();

    // Load initial status
    const loadStatus = async () => {
      const syncStatus = await offlineStorage.getSyncStatus();
      const pendingOps = await offlineStorage.getPendingOperations();
      const storedConflicts = await offlineStorage.getConflicts();
      
      setStatus({
        isOnline: syncManager.getIsOnline(),
        isSyncing: syncManager.getIsSyncing(),
        pendingCount: pendingOps.length,
        conflictsCount: storedConflicts.length,
        lastSyncAt: syncStatus.lastSyncAt
      });
      setConflicts(storedConflicts);
    };

    loadStatus();

    // Subscribe to status changes
    const unsubscribe = syncManager.onStatusChange((newStatus) => {
      setStatus(prev => ({
        ...prev,
        ...newStatus
      }));
      
      // Reload conflicts if count changed
      if (newStatus.conflictsCount !== status.conflictsCount) {
        offlineStorage.getConflicts().then(setConflicts);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const triggerSync = useCallback(() => {
    syncManager.triggerSync();
  }, []);

  const fullSync = useCallback(async () => {
    await syncManager.fullSync();
    const storedConflicts = await offlineStorage.getConflicts();
    setConflicts(storedConflicts);
  }, []);

  const resolveConflict = useCallback(async (
    conflictId: string,
    resolution: 'local' | 'server' | 'merge',
    mergedData?: Record<string, unknown>
  ) => {
    await syncManager.resolveConflict(conflictId, resolution, mergedData);
    const storedConflicts = await offlineStorage.getConflicts();
    setConflicts(storedConflicts);
  }, []);

  const getFormattedLastSync = useCallback(() => {
    if (!status.lastSyncAt) return 'Never';
    
    const date = new Date(status.lastSyncAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  }, [status.lastSyncAt]);

  return {
    ...status,
    conflicts,
    triggerSync,
    fullSync,
    resolveConflict,
    getFormattedLastSync
  };
}

export default useOfflineSync;
