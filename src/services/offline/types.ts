/**
 * Types for offline data management
 */

// Entity types that correspond to actual Supabase tables and can be synced
export type SyncableEntityType = 
  | 'assignments' 
  | 'exams' 
  | 'courses' 
  | 'study_sessions' 
  | 'schedule_blocks' 
  | 'semesters'
  | 'reminders';

// All entity types including local-only cache types
export type EntityType = 
  | SyncableEntityType
  | 'profiles'
  | 'user_preferences';

export type OperationType = 'create' | 'update' | 'delete';

// PendingOperation only uses SyncableEntityType since only those can be synced to Supabase
export interface PendingOperation {
  id: string;
  entityType: SyncableEntityType;
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

// SyncConflict only uses SyncableEntityType since only those can have sync conflicts
export interface SyncConflict {
  id: string;
  entityType: SyncableEntityType;
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
  USER_ID: 'aqademiq_user_id',
  AUTH_SESSION: 'aqademiq_auth_session',
  ONBOARDING_STATUS: 'aqademiq_onboarding_status'
} as const;

export interface CachedAuthSession {
  userId: string;
  email: string | undefined;
  accessToken: string;
  refreshToken: string | undefined;
  expiresAt: number;
  userMetadata: Record<string, unknown>;
  cachedAt: number;
}

export interface CachedOnboardingStatus {
  userId: string;
  hasProfile: boolean;
  hasSemester: boolean;
  onboardingCompleted: boolean;
  cachedAt: number;
}

export const MAX_RETRY_COUNT = 3;
export const SYNC_DEBOUNCE_MS = 2000;
