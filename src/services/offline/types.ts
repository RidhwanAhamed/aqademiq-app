/**
 * Types for offline data management
 */

export type EntityType = 
  | 'assignments' 
  | 'exams' 
  | 'courses' 
  | 'study_sessions' 
  | 'schedule_blocks' 
  | 'semesters'
  | 'reminders';

export type OperationType = 'create' | 'update' | 'delete';

export interface PendingOperation {
  id: string;
  entityType: EntityType;
  operationType: OperationType;
  entityId: string;
  payload: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

export interface CachedEntity<T = unknown> {
  id: string;
  entityType: EntityType;
  data: T;
  cachedAt: number;
  serverUpdatedAt?: string;
  isPendingSync: boolean;
  localVersion: number;
}

export interface SyncConflict {
  id: string;
  entityType: EntityType;
  entityId: string;
  localData: Record<string, unknown>;
  serverData: Record<string, unknown>;
  localTimestamp: number;
  serverTimestamp: string;
  detectedAt: number;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSyncAt: number | null;
  pendingOperationsCount: number;
  conflictsCount: number;
  isSyncing: boolean;
}

export interface OfflineStore {
  entities: Record<EntityType, Record<string, CachedEntity>>;
  pendingOperations: PendingOperation[];
  conflicts: SyncConflict[];
  syncStatus: SyncStatus;
}

export const STORAGE_KEYS = {
  ENTITIES: 'aqademiq_offline_entities',
  PENDING_OPS: 'aqademiq_pending_operations',
  CONFLICTS: 'aqademiq_sync_conflicts',
  SYNC_STATUS: 'aqademiq_sync_status',
  USER_ID: 'aqademiq_user_id'
} as const;

export const MAX_RETRY_COUNT = 3;
export const SYNC_DEBOUNCE_MS = 2000;
