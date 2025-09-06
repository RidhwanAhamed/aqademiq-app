import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SyncToken {
  calendar_id: string;
  sync_token: string;
  last_used_at: string;
  expires_at?: string;
}

interface ConflictResolution {
  conflict_id: string;
  resolution_type: 'prefer_local' | 'prefer_google' | 'merge' | 'manual';
  resolved_data: any;
  confidence_score: number;
}

interface SyncProgress {
  current_operation: string;
  completed_operations: number;
  total_operations: number;
  estimated_time_remaining: number;
  sync_speed: 'fast' | 'normal' | 'slow';
  current_entity_type?: string;
}

interface SyncMetrics {
  total_synced: number;
  conflicts_resolved: number;
  errors_count: number;
  sync_duration_ms: number;
  api_calls_made: number;
  bandwidth_used: number;
}

export function useIntelligentSync() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [syncTokens, setSyncTokens] = useState<SyncToken[]>([]);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [syncMetrics, setSyncMetrics] = useState<SyncMetrics | null>(null);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(false);
  const [lastSyncHealth, setLastSyncHealth] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');

  // Load sync tokens and status
  useEffect(() => {
    if (!user) return;

    const loadSyncData = async () => {
      // Use existing table structure
      const { data: channels } = await supabase
        .from('google_calendar_channels')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      setIsRealTimeEnabled(channels && channels.length > 0);

      // For sync tokens, use empty array for now - they'll be managed by the edge function
      setSyncTokens([]);
    };

    loadSyncData();
  }, [user]);

  // Perform incremental sync using sync tokens
  const performIncrementalSync = useCallback(async () => {
    if (!user) return { success: false, error: 'User not authenticated' };

    setSyncProgress({
      current_operation: 'Initializing incremental sync',
      completed_operations: 0,
      total_operations: 4,
      estimated_time_remaining: 15000,
      sync_speed: 'fast'
    });

    const startTime = Date.now();
    let metrics: SyncMetrics = {
      total_synced: 0,
      conflicts_resolved: 0,
      errors_count: 0,
      sync_duration_ms: 0,
      api_calls_made: 0,
      bandwidth_used: 0
    };

    try {
      // Step 1: Get latest sync token from localStorage or default
      setSyncProgress(prev => prev ? {
        ...prev,
        current_operation: 'Retrieving sync tokens',
        completed_operations: 1
      } : null);

      // Use localStorage for sync token management as fallback
      const storedToken = localStorage.getItem(`google_sync_token_${user.id}`);
      const latestToken = storedToken ? JSON.parse(storedToken) : null;

      // Step 2: Perform incremental sync
      setSyncProgress(prev => prev ? {
        ...prev,
        current_operation: 'Syncing incremental changes',
        completed_operations: 2
      } : null);

      const { data: syncResult, error } = await supabase.functions.invoke('enhanced-google-calendar-sync', {
        body: { 
          action: 'incremental-sync', 
          userId: user.id,
          syncToken: latestToken?.sync_token
        }
      });

      if (error) throw error;

      metrics.api_calls_made += 2; // Estimated API calls
      metrics.total_synced = syncResult.synced_events || 0;

      // Step 3: Handle conflicts if any
      if (syncResult.conflicts && syncResult.conflicts.length > 0) {
        setSyncProgress(prev => prev ? {
          ...prev,
          current_operation: 'Resolving conflicts',
          completed_operations: 3
        } : null);

        const resolvedConflicts = await autoResolveConflicts(syncResult.conflicts);
        metrics.conflicts_resolved = resolvedConflicts.resolved;
        metrics.errors_count = resolvedConflicts.failed;
      }

      // Step 4: Update sync tokens
      setSyncProgress(prev => prev ? {
        ...prev,
        current_operation: 'Updating sync tokens',
        completed_operations: 4
      } : null);

      if (syncResult.nextSyncToken) {
        // Store sync token in localStorage as fallback
        localStorage.setItem(
          `google_sync_token_${user.id}`, 
          JSON.stringify({
            sync_token: syncResult.nextSyncToken,
            last_used_at: new Date().toISOString(),
            calendar_id: 'primary'
          })
        );
      }

      metrics.sync_duration_ms = Date.now() - startTime;
      setSyncMetrics(metrics);

      // Update sync health based on performance
      const healthScore = calculateSyncHealth(metrics);
      setLastSyncHealth(healthScore);

      setSyncProgress(null);

      toast({
        title: "Incremental Sync Complete",
        description: `Synced ${metrics.total_synced} events in ${Math.round(metrics.sync_duration_ms / 1000)}s`,
      });

      return { success: true, metrics };

    } catch (error) {
      console.error('Incremental sync error:', error);
      metrics.errors_count++;
      metrics.sync_duration_ms = Date.now() - startTime;
      setSyncMetrics(metrics);
      setSyncProgress(null);

      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      toast({
        title: "Sync Failed",
        description: `Incremental sync failed: ${errorMessage}`,
        variant: "destructive",
      });

      return { success: false, error: errorMessage };
    }
  }, [user, toast]);

  // Auto-resolve conflicts using intelligent algorithms
  const autoResolveConflicts = useCallback(async (conflicts: any[]): Promise<{ resolved: number; failed: number }> => {
    let resolved = 0;
    let failed = 0;

    for (const conflict of conflicts) {
      try {
        const resolution = await generateConflictResolution(conflict);
        
        if (resolution.confidence_score > 0.8) {
          // High confidence - auto resolve
          const { error } = await supabase.functions.invoke('enhanced-google-calendar-sync', {
            body: {
              action: 'conflict-resolution',
              userId: user?.id,
              conflictData: {
                conflict_id: conflict.id,
                resolution_type: resolution.resolution_type,
                resolved_data: resolution.resolved_data
              }
            }
          });

          if (!error) {
            resolved++;
          } else {
            failed++;
          }
        } else {
          // Low confidence - mark for manual resolution using sync_operations table
          await supabase
            .from('sync_operations')
            .insert({
              user_id: user?.id,
              entity_type: conflict.entity_type,
              entity_id: conflict.entity_id,
              operation_type: 'conflict_pending',
              operation_status: 'pending',
              sync_direction: 'bidirectional',
              google_event_id: conflict.google_event_id,
              conflict_data: {
                conflict_type: conflict.conflict_type,
                local_data: conflict.local_data,
                google_data: conflict.google_data
              }
            });
          failed++;
        }
      } catch (error) {
        console.error('Conflict resolution error:', error);
        failed++;
      }
    }

    return { resolved, failed };
  }, [user]);

  // Generate intelligent conflict resolution suggestions
  const generateConflictResolution = useCallback(async (conflict: any): Promise<ConflictResolution> => {
    // Analyze the conflict and determine the best resolution strategy
    const localData = conflict.local_data;
    const googleData = conflict.google_data;
    
    let resolutionType: 'prefer_local' | 'prefer_google' | 'merge' | 'manual' = 'manual';
    let resolvedData = localData;
    let confidenceScore = 0.5;

    // Rule-based conflict resolution
    if (conflict.conflict_type === 'time_modified') {
      const localModified = new Date(localData.updated_at);
      const googleModified = new Date(googleData.updated);
      
      if (Math.abs(localModified.getTime() - googleModified.getTime()) < 60000) {
        // Modified within 1 minute - likely the same change
        resolutionType = 'prefer_local';
        confidenceScore = 0.9;
      } else if (googleModified > localModified) {
        // Google has newer data
        resolutionType = 'prefer_google';
        resolvedData = googleData;
        confidenceScore = 0.85;
      } else {
        // Local has newer data
        resolutionType = 'prefer_local';
        confidenceScore = 0.85;
      }
    } else if (conflict.conflict_type === 'content_modified') {
      // Try to merge non-conflicting changes
      const merged = attemptSmartMerge(localData, googleData);
      if (merged) {
        resolutionType = 'merge';
        resolvedData = merged;
        confidenceScore = 0.75;
      }
    } else if (conflict.conflict_type === 'location_conflict') {
      // Prefer Google for location data (likely more accurate)
      if (googleData.location && googleData.location.trim()) {
        resolutionType = 'prefer_google';
        resolvedData = { ...localData, location: googleData.location };
        confidenceScore = 0.8;
      }
    }

    return {
      conflict_id: conflict.id,
      resolution_type: resolutionType,
      resolved_data: resolvedData,
      confidence_score: confidenceScore
    };
  }, []);

  // Attempt to intelligently merge conflicting data
  const attemptSmartMerge = useCallback((localData: any, googleData: any) => {
    try {
      const merged = { ...localData };
      
      // Merge rules for common fields
      if (googleData.summary && googleData.summary !== localData.title) {
        // If Google summary is more descriptive, use it
        if (googleData.summary.length > localData.title.length) {
          merged.title = googleData.summary;
        }
      }
      
      if (googleData.description && (!localData.description || localData.description.length < googleData.description.length)) {
        merged.description = googleData.description;
      }
      
      if (googleData.location && !localData.location) {
        merged.location = googleData.location;
      }
      
      // Merge attendees if applicable
      if (googleData.attendees && googleData.attendees.length > 0) {
        merged.attendees = googleData.attendees;
      }

      return merged;
    } catch (error) {
      console.error('Smart merge error:', error);
      return null;
    }
  }, []);

  // Calculate sync health score based on metrics
  const calculateSyncHealth = useCallback((metrics: SyncMetrics): 'excellent' | 'good' | 'fair' | 'poor' => {
    let score = 100;
    
    // Deduct points for errors
    score -= metrics.errors_count * 10;
    
    // Deduct points for slow sync
    if (metrics.sync_duration_ms > 30000) score -= 20; // > 30 seconds
    else if (metrics.sync_duration_ms > 15000) score -= 10; // > 15 seconds
    
    // Deduct points for high API usage
    if (metrics.api_calls_made > 20) score -= 15;
    else if (metrics.api_calls_made > 10) score -= 5;
    
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    return 'poor';
  }, []);

  // Setup real-time sync with webhooks
  const setupRealTimeSync = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase.functions.invoke('enhanced-google-calendar-sync', {
        body: { action: 'setup-webhook', userId: user.id }
      });

      if (error) throw error;

      setIsRealTimeEnabled(true);
      
      toast({
        title: "Real-Time Sync Enabled",
        description: "Your calendar will now sync automatically when changes are made in Google Calendar.",
      });
    } catch (error) {
      console.error('Webhook setup error:', error);
      toast({
        title: "Real-Time Setup Failed",
        description: "Could not enable real-time sync. Manual sync is still available.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  // Disable real-time sync
  const disableRealTimeSync = useCallback(async () => {
    if (!user) return;

    try {
      // Deactivate webhook channels
      await supabase
        .from('google_calendar_channels')
        .update({ is_active: false })
        .eq('user_id', user.id);

      setIsRealTimeEnabled(false);
      
      toast({
        title: "Real-Time Sync Disabled",
        description: "Automatic sync has been disabled. You can still sync manually.",
      });
    } catch (error) {
      console.error('Webhook disable error:', error);
    }
  }, [user, toast]);

  // Get detailed sync statistics (using available tables)
  const getSyncStatistics = useCallback(async () => {
    if (!user) return null;

    try {
      const { data: operations } = await supabase
        .from('sync_operations')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const stats = {
        total_operations: operations?.length || 0,
        successful_operations: operations?.filter(op => op.operation_status === 'completed').length || 0,
        failed_operations: operations?.filter(op => op.operation_status === 'failed').length || 0,
        pending_operations: operations?.filter(op => op.operation_status === 'pending').length || 0,
        total_conflicts: 0, // Will be implemented when sync_conflicts table exists
        resolved_conflicts: 0,
        success_rate: operations?.length ? 
          (operations.filter(op => op.operation_status === 'completed').length / operations.length) * 100 : 100,
        last_sync_health: lastSyncHealth
      };

      return stats;
    } catch (error) {
      console.error('Error getting sync statistics:', error);
      return null;
    }
  }, [user, lastSyncHealth]);

  return {
    syncTokens,
    syncProgress,
    syncMetrics,
    isRealTimeEnabled,
    lastSyncHealth,
    performIncrementalSync,
    autoResolveConflicts,
    setupRealTimeSync,
    disableRealTimeSync,
    getSyncStatistics,
    generateConflictResolution,
  };
}