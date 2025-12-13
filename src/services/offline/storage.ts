import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { 
  EntityType, 
  CachedEntity, 
  PendingOperation, 
  SyncConflict,
  SyncStatus,
  STORAGE_KEYS 
} from './types';

/**
 * Offline storage service using Capacitor Preferences (native) or localStorage (web)
 */
class OfflineStorage {
  private isNative = Capacitor.isNativePlatform();

  /**
   * Get item from storage
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.isNative) {
        const { value } = await Preferences.get({ key });
        return value ? JSON.parse(value) : null;
      } else {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
      }
    } catch (error) {
      console.error('Error reading from storage:', error);
      return null;
    }
  }

  /**
   * Set item in storage
   */
  async set<T>(key: string, value: T): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (this.isNative) {
        await Preferences.set({ key, value: serialized });
      } else {
        localStorage.setItem(key, serialized);
      }
    } catch (error) {
      console.error('Error writing to storage:', error);
    }
  }

  /**
   * Remove item from storage
   */
  async remove(key: string): Promise<void> {
    try {
      if (this.isNative) {
        await Preferences.remove({ key });
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Error removing from storage:', error);
    }
  }

  /**
   * Clear all offline data
   */
  async clear(): Promise<void> {
    try {
      if (this.isNative) {
        await Preferences.clear();
      } else {
        Object.values(STORAGE_KEYS).forEach(key => {
          localStorage.removeItem(key);
        });
      }
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  // ============================================
  // Entity Cache Operations
  // ============================================

  /**
   * Get all cached entities of a type
   */
  async getEntities<T>(entityType: EntityType): Promise<Record<string, CachedEntity<T>>> {
    const allEntities = await this.get<Record<EntityType, Record<string, CachedEntity<T>>>>(
      STORAGE_KEYS.ENTITIES
    );
    return allEntities?.[entityType] || {};
  }

  /**
   * Get a single cached entity
   */
  async getEntity<T>(entityType: EntityType, id: string): Promise<CachedEntity<T> | null> {
    const entities = await this.getEntities<T>(entityType);
    return entities[id] || null;
  }

  /**
   * Cache an entity
   */
  async cacheEntity<T>(
    entityType: EntityType, 
    id: string, 
    data: T, 
    serverUpdatedAt?: string,
    isPendingSync: boolean = false
  ): Promise<void> {
    const allEntities = await this.get<Record<EntityType, Record<string, CachedEntity<T>>>>(
      STORAGE_KEYS.ENTITIES
    ) || {} as Record<EntityType, Record<string, CachedEntity<T>>>;

    if (!allEntities[entityType]) {
      allEntities[entityType] = {};
    }

    const existing = allEntities[entityType][id];
    
    allEntities[entityType][id] = {
      id,
      entityType,
      data,
      cachedAt: Date.now(),
      serverUpdatedAt,
      isPendingSync,
      localVersion: (existing?.localVersion || 0) + 1
    };

    await this.set(STORAGE_KEYS.ENTITIES, allEntities);
  }

  /**
   * Cache multiple entities at once
   */
  async cacheEntities<T>(
    entityType: EntityType, 
    entities: Array<{ id: string; data: T; serverUpdatedAt?: string }>
  ): Promise<void> {
    const allEntities = await this.get<Record<EntityType, Record<string, CachedEntity<T>>>>(
      STORAGE_KEYS.ENTITIES
    ) || {} as Record<EntityType, Record<string, CachedEntity<T>>>;

    if (!allEntities[entityType]) {
      allEntities[entityType] = {};
    }

    entities.forEach(({ id, data, serverUpdatedAt }) => {
      const existing = allEntities[entityType][id];
      allEntities[entityType][id] = {
        id,
        entityType,
        data,
        cachedAt: Date.now(),
        serverUpdatedAt,
        isPendingSync: false,
        localVersion: (existing?.localVersion || 0) + 1
      };
    });

    await this.set(STORAGE_KEYS.ENTITIES, allEntities);
  }

  /**
   * Remove a cached entity
   */
  async removeEntity(entityType: EntityType, id: string): Promise<void> {
    const allEntities = await this.get<Record<EntityType, Record<string, CachedEntity>>>(
      STORAGE_KEYS.ENTITIES
    ) || {} as Record<EntityType, Record<string, CachedEntity>>;

    if (allEntities[entityType]) {
      delete allEntities[entityType][id];
      await this.set(STORAGE_KEYS.ENTITIES, allEntities);
    }
  }

  // ============================================
  // Pending Operations (Write Queue)
  // ============================================

  /**
   * Get all pending operations
   */
  async getPendingOperations(): Promise<PendingOperation[]> {
    return await this.get<PendingOperation[]>(STORAGE_KEYS.PENDING_OPS) || [];
  }

  /**
   * Add a pending operation to the queue
   */
  async addPendingOperation(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const operations = await this.getPendingOperations();
    
    const newOp: PendingOperation = {
      ...operation,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0
    };

    operations.push(newOp);
    await this.set(STORAGE_KEYS.PENDING_OPS, operations);
  }

  /**
   * Update a pending operation (e.g., increment retry count)
   */
  async updatePendingOperation(id: string, updates: Partial<PendingOperation>): Promise<void> {
    const operations = await this.getPendingOperations();
    const index = operations.findIndex(op => op.id === id);
    
    if (index !== -1) {
      operations[index] = { ...operations[index], ...updates };
      await this.set(STORAGE_KEYS.PENDING_OPS, operations);
    }
  }

  /**
   * Remove a pending operation (after successful sync)
   */
  async removePendingOperation(id: string): Promise<void> {
    const operations = await this.getPendingOperations();
    const filtered = operations.filter(op => op.id !== id);
    await this.set(STORAGE_KEYS.PENDING_OPS, filtered);
  }

  /**
   * Clear all pending operations
   */
  async clearPendingOperations(): Promise<void> {
    await this.set(STORAGE_KEYS.PENDING_OPS, []);
  }

  // ============================================
  // Sync Conflicts
  // ============================================

  /**
   * Get all sync conflicts
   */
  async getConflicts(): Promise<SyncConflict[]> {
    return await this.get<SyncConflict[]>(STORAGE_KEYS.CONFLICTS) || [];
  }

  /**
   * Add a sync conflict
   */
  async addConflict(conflict: Omit<SyncConflict, 'id' | 'detectedAt'>): Promise<void> {
    const conflicts = await this.getConflicts();
    
    const newConflict: SyncConflict = {
      ...conflict,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      detectedAt: Date.now()
    };

    conflicts.push(newConflict);
    await this.set(STORAGE_KEYS.CONFLICTS, conflicts);
  }

  /**
   * Remove a sync conflict (after resolution)
   */
  async removeConflict(id: string): Promise<void> {
    const conflicts = await this.getConflicts();
    const filtered = conflicts.filter(c => c.id !== id);
    await this.set(STORAGE_KEYS.CONFLICTS, filtered);
  }

  /**
   * Clear all conflicts
   */
  async clearConflicts(): Promise<void> {
    await this.set(STORAGE_KEYS.CONFLICTS, []);
  }

  // ============================================
  // Sync Status
  // ============================================

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    return await this.get<SyncStatus>(STORAGE_KEYS.SYNC_STATUS) || {
      isOnline: navigator.onLine,
      lastSyncAt: null,
      pendingOperationsCount: 0,
      conflictsCount: 0,
      isSyncing: false
    };
  }

  /**
   * Update sync status
   */
  async updateSyncStatus(updates: Partial<SyncStatus>): Promise<void> {
    const current = await this.getSyncStatus();
    await this.set(STORAGE_KEYS.SYNC_STATUS, { ...current, ...updates });
  }
}

export const offlineStorage = new OfflineStorage();
export default offlineStorage;
