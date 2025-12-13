import { Network, ConnectionStatus } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { offlineStorage } from './storage';
import { 
  EntityType, 
  PendingOperation, 
  SyncConflict,
  MAX_RETRY_COUNT,
  SYNC_DEBOUNCE_MS 
} from './types';
import haptics from '../haptics';

type SyncCallback = (status: { 
  isOnline: boolean; 
  isSyncing: boolean; 
  pendingCount: number;
  conflictsCount: number;
}) => void;

/**
 * Sync manager handles background synchronization between local storage and Supabase
 */
class SyncManager {
  private isInitialized = false;
  private isSyncing = false;
  private syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private statusCallbacks: Set<SyncCallback> = new Set();
  private isOnline = navigator.onLine;

  /**
   * Initialize sync manager - call once on app start
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Set up network status listeners
    if (Capacitor.isNativePlatform()) {
      const status = await Network.getStatus();
      this.isOnline = status.connected;

      Network.addListener('networkStatusChange', (status: ConnectionStatus) => {
        const wasOffline = !this.isOnline;
        this.isOnline = status.connected;
        
        console.log('Network status changed:', status.connected ? 'online' : 'offline');
        
        // Trigger sync when coming back online
        if (status.connected && wasOffline) {
          console.log('Back online, triggering sync...');
          haptics.success();
          this.triggerSync();
        }

        this.notifyStatusChange();
      });
    } else {
      // Web fallback
      window.addEventListener('online', () => {
        this.isOnline = true;
        console.log('Back online, triggering sync...');
        this.triggerSync();
        this.notifyStatusChange();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        console.log('Went offline');
        this.notifyStatusChange();
      });
    }

    this.isInitialized = true;
    console.log('SyncManager initialized');

    // Do initial sync if online
    if (this.isOnline) {
      this.triggerSync();
    }
  }

  /**
   * Subscribe to sync status changes
   */
  onStatusChange(callback: SyncCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  private async notifyStatusChange(): Promise<void> {
    const pendingOps = await offlineStorage.getPendingOperations();
    const conflicts = await offlineStorage.getConflicts();
    
    const status = {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: pendingOps.length,
      conflictsCount: conflicts.length
    };

    this.statusCallbacks.forEach(cb => cb(status));
  }

  /**
   * Trigger a debounced sync
   */
  triggerSync(): void {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }

    this.syncDebounceTimer = setTimeout(() => {
      this.sync();
    }, SYNC_DEBOUNCE_MS);
  }

  /**
   * Main sync function - processes pending operations
   */
  async sync(): Promise<void> {
    if (!this.isOnline || this.isSyncing) {
      console.log('Skipping sync:', !this.isOnline ? 'offline' : 'already syncing');
      return;
    }

    this.isSyncing = true;
    this.notifyStatusChange();
    console.log('Starting sync...');

    try {
      const pendingOps = await offlineStorage.getPendingOperations();
      console.log(`Processing ${pendingOps.length} pending operations`);

      for (const op of pendingOps) {
        await this.processOperation(op);
      }

      await offlineStorage.updateSyncStatus({
        lastSyncAt: Date.now(),
        isOnline: true,
        isSyncing: false
      });

      console.log('Sync completed');
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      this.isSyncing = false;
      this.notifyStatusChange();
    }
  }

  /**
   * Process a single pending operation
   */
  private async processOperation(op: PendingOperation): Promise<void> {
    try {
      switch (op.operationType) {
        case 'create':
          await this.handleCreate(op);
          break;
        case 'update':
          await this.handleUpdate(op);
          break;
        case 'delete':
          await this.handleDelete(op);
          break;
      }

      // Success - remove from queue
      await offlineStorage.removePendingOperation(op.id);
      console.log(`Operation ${op.id} synced successfully`);
    } catch (error: any) {
      console.error(`Operation ${op.id} failed:`, error);

      if (op.retryCount >= MAX_RETRY_COUNT) {
        // Max retries reached - create conflict for user resolution
        await this.createConflictFromOperation(op, error.message);
        await offlineStorage.removePendingOperation(op.id);
      } else {
        // Increment retry count
        await offlineStorage.updatePendingOperation(op.id, {
          retryCount: op.retryCount + 1,
          lastError: error.message
        });
      }
    }
  }

  private async handleCreate(op: PendingOperation): Promise<void> {
    const { data, error } = await supabase
      .from(op.entityType)
      .insert(op.payload as any)
      .select()
      .single();

    if (error) throw error;

    // Update local cache with server response
    const result = data as Record<string, any>;
    await offlineStorage.cacheEntity(op.entityType, op.entityId, result, result.updated_at || result.created_at);
  }

  private async handleUpdate(op: PendingOperation): Promise<void> {
    // First check for conflicts
    const { data: serverData, error: fetchError } = await supabase
      .from(op.entityType)
      .select('*')
      .eq('id', op.entityId)
      .single();

    if (fetchError) throw fetchError;

    const cachedEntity = await offlineStorage.getEntity(op.entityType, op.entityId);
    const serverRecord = serverData as Record<string, any>;
    
    // Check if server has newer data
    if (serverRecord && cachedEntity && serverRecord.updated_at) {
      const serverUpdatedAt = new Date(serverRecord.updated_at).getTime();
      const localUpdatedAt = cachedEntity.serverUpdatedAt 
        ? new Date(cachedEntity.serverUpdatedAt).getTime() 
        : 0;

      if (serverUpdatedAt > localUpdatedAt) {
        // Conflict detected - create conflict for user resolution
        await offlineStorage.addConflict({
          entityType: op.entityType,
          entityId: op.entityId,
          localData: op.payload,
          serverData: serverRecord,
          localTimestamp: op.timestamp,
          serverTimestamp: serverRecord.updated_at
        });
        
        haptics.warning();
        throw new Error('Conflict detected - server has newer data');
      }
    }

    // No conflict - proceed with update
    const { data, error } = await supabase
      .from(op.entityType)
      .update(op.payload as any)
      .eq('id', op.entityId)
      .select()
      .single();

    if (error) throw error;

    // Update local cache
    const result = data as Record<string, any>;
    await offlineStorage.cacheEntity(op.entityType, op.entityId, result, result.updated_at || result.created_at);
  }

  private async handleDelete(op: PendingOperation): Promise<void> {
    const { error } = await supabase
      .from(op.entityType)
      .delete()
      .eq('id', op.entityId);

    if (error) throw error;

    // Remove from local cache
    await offlineStorage.removeEntity(op.entityType, op.entityId);
  }

  private async createConflictFromOperation(op: PendingOperation, errorMessage: string): Promise<void> {
    // Try to get server data for conflict resolution
    const { data: serverData } = await supabase
      .from(op.entityType)
      .select('*')
      .eq('id', op.entityId)
      .single();

    const serverRecord = serverData as Record<string, any> | null;

    await offlineStorage.addConflict({
      entityType: op.entityType,
      entityId: op.entityId,
      localData: op.payload,
      serverData: serverRecord || { error: errorMessage },
      localTimestamp: op.timestamp,
      serverTimestamp: serverRecord?.updated_at || new Date().toISOString()
    });

    haptics.warning();
  }

  /**
   * Resolve a conflict - user chooses which version to keep
   */
  async resolveConflict(
    conflictId: string, 
    resolution: 'local' | 'server' | 'merge',
    mergedData?: Record<string, unknown>
  ): Promise<void> {
    const conflicts = await offlineStorage.getConflicts();
    const conflict = conflicts.find(c => c.id === conflictId);

    if (!conflict) {
      console.error('Conflict not found:', conflictId);
      return;
    }

    try {
      let dataToSave: Record<string, unknown>;

      switch (resolution) {
        case 'local':
          dataToSave = conflict.localData;
          break;
        case 'server':
          dataToSave = conflict.serverData;
          break;
        case 'merge':
          dataToSave = mergedData || { ...conflict.serverData, ...conflict.localData };
          break;
      }

      // Apply the resolution
      const { data, error } = await (supabase as any)
        .from(conflict.entityType)
        .upsert(dataToSave)
        .select()
        .single();

      if (error) throw error;

      // Update local cache
      const result = data as Record<string, any>;
      await offlineStorage.cacheEntity(
        conflict.entityType, 
        conflict.entityId, 
        result, 
        result.updated_at || result.created_at
      );

      // Remove the conflict
      await offlineStorage.removeConflict(conflictId);
      
      haptics.success();
      console.log('Conflict resolved:', conflictId, 'using', resolution);
      
      this.notifyStatusChange();
    } catch (error) {
      console.error('Error resolving conflict:', error);
      haptics.error();
      throw error;
    }
  }

  /**
   * Check if currently online
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Check if currently syncing
   */
  getIsSyncing(): boolean {
    return this.isSyncing;
  }

  /**
   * Force a full sync of all data
   */
  async fullSync(): Promise<void> {
    if (!this.isOnline) {
      console.log('Cannot full sync while offline');
      return;
    }

    console.log('Starting full sync...');
    haptics.light();

    // First process pending operations
    await this.sync();

    // Then refresh all cached data from server
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const entityTypes: EntityType[] = [
      'assignments', 
      'exams', 
      'courses', 
      'study_sessions', 
      'schedule_blocks', 
      'semesters',
      'reminders'
    ];

    for (const entityType of entityTypes) {
      try {
        const { data, error } = await supabase
          .from(entityType)
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          console.error(`Error fetching ${entityType}:`, error);
          continue;
        }

        if (data) {
          await offlineStorage.cacheEntities(
            entityType,
            data.map((item: any) => ({
              id: item.id,
              data: item,
              serverUpdatedAt: item.updated_at || item.created_at
            }))
          );
        }
      } catch (error) {
        console.error(`Error caching ${entityType}:`, error);
      }
    }

    await offlineStorage.updateSyncStatus({ lastSyncAt: Date.now() });
    haptics.success();
    console.log('Full sync completed');
    this.notifyStatusChange();
  }
}

export const syncManager = new SyncManager();
export default syncManager;
