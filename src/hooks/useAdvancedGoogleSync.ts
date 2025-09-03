import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface SyncStatus {
  isOnline: boolean;
  lastSync: string | null;
  pendingOperations: number;
  conflictsCount: number;
  syncHealth: 'good' | 'warning' | 'error';
  syncType: 'incremental' | 'full' | 'none';
}

interface SyncProgress {
  status: 'idle' | 'syncing' | 'completed' | 'error';
  progress: number;
  currentOperation: string | null;
  estimatedTimeRemaining: number | null;
}

interface AcademicPreferences {
  auto_study_sessions: boolean;
  study_session_duration: number;
  break_time_minutes: number;
  exam_prep_days: number;
  assignment_buffer_hours: number;
  color_coding_enabled: boolean;
  reminder_escalation: boolean;
  weekend_study_allowed: boolean;
}

export function useAdvancedGoogleSync() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    lastSync: null,
    pendingOperations: 0,
    conflictsCount: 0,
    syncHealth: 'good',
    syncType: 'none'
  });

  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    status: 'idle',
    progress: 0,
    currentOperation: null,
    estimatedTimeRemaining: null
  });

  const [academicPreferences, setAcademicPreferences] = useState<AcademicPreferences | null>(null);
  const [loading, setLoading] = useState(false);

  // Monitor online/offline status
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

  // Load sync status and preferences
  useEffect(() => {
    if (!user) return;

    const loadSyncData = async () => {
      try {
        // Load academic preferences
        const { data: preferences } = await supabase
          .from('academic_sync_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (preferences) {
          setAcademicPreferences(preferences);
        } else {
          // Create default preferences
          const defaultPrefs = {
            user_id: user.id,
            auto_study_sessions: true,
            study_session_duration: 120,
            break_time_minutes: 15,
            exam_prep_days: 14,
            assignment_buffer_hours: 2,
            color_coding_enabled: true,
            reminder_escalation: true,
            weekend_study_allowed: true
          };
          
          await supabase.from('academic_sync_preferences').insert(defaultPrefs);
          setAcademicPreferences(defaultPrefs);
        }

        // Get sync operations status
        const { data: operations } = await supabase
          .from('sync_operations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (operations) {
          const pending = operations.filter(op => op.operation_status === 'pending').length;
          const conflicts = operations.filter(op => op.operation_status === 'conflict').length;
          const lastSuccessful = operations.find(op => op.operation_status === 'success');

          setSyncStatus(prev => ({
            ...prev,
            pendingOperations: pending,
            conflictsCount: conflicts,
            lastSync: lastSuccessful?.created_at || null,
            syncHealth: conflicts > 0 ? 'warning' : pending > 5 ? 'warning' : 'good'
          }));
        }

      } catch (error) {
        console.error('Error loading sync data:', error);
      }
    };

    loadSyncData();

    // Set up real-time subscription
    const subscription = supabase
      .channel('advanced_sync_changes')
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

  const performIncrementalSync = useCallback(async () => {
    if (!user || !syncStatus.isOnline) return;

    setLoading(true);
    setSyncProgress({
      status: 'syncing',
      progress: 0,
      currentOperation: 'Checking for changes...',
      estimatedTimeRemaining: 15
    });

    try {
      const { data, error } = await supabase.functions.invoke('advanced-google-sync', {
        body: { action: 'incremental-sync', userId: user.id }
      });

      if (error) throw error;

      setSyncProgress(prev => ({ ...prev, progress: 100, currentOperation: 'Completed' }));
      
      setSyncStatus(prev => ({
        ...prev,
        lastSync: new Date().toISOString(),
        syncType: 'incremental'
      }));

      toast({
        title: "Quick Sync Complete",
        description: `Synced ${data.googleChangesSynced + data.localChangesSynced} changes in real-time.`,
      });

    } catch (error) {
      console.error('Incremental sync error:', error);
      setSyncProgress({ status: 'error', progress: 0, currentOperation: null, estimatedTimeRemaining: null });
      
      toast({
        title: "Quick Sync Failed",
        description: "Failed to perform incremental sync. Trying full sync...",
        variant: "destructive",
      });

      // Fallback to full sync
      await performFullSync();
    } finally {
      setLoading(false);
      setTimeout(() => {
        setSyncProgress({ status: 'idle', progress: 0, currentOperation: null, estimatedTimeRemaining: null });
      }, 2000);
    }
  }, [user, syncStatus.isOnline, toast]);

  const performFullSync = useCallback(async () => {
    if (!user || !syncStatus.isOnline) return;

    setLoading(true);
    setSyncProgress({
      status: 'syncing',
      progress: 0,
      currentOperation: 'Starting full sync...',
      estimatedTimeRemaining: 45
    });

    try {
      // Step 1: Full bidirectional sync
      setSyncProgress(prev => ({ ...prev, progress: 25, currentOperation: 'Syncing calendar events...' }));
      
      const { data: syncData, error: syncError } = await supabase.functions.invoke('advanced-google-sync', {
        body: { action: 'full-bidirectional-sync', userId: user.id }
      });

      if (syncError) throw syncError;

      // Step 2: Academic schedule intelligence
      setSyncProgress(prev => ({ ...prev, progress: 50, currentOperation: 'Generating study sessions...' }));
      
      const { data: academicData, error: academicError } = await supabase.functions.invoke('advanced-google-sync', {
        body: { action: 'academic-schedule-sync', userId: user.id }
      });

      if (academicError) throw academicError;

      // Step 3: Setup real-time webhook
      setSyncProgress(prev => ({ ...prev, progress: 75, currentOperation: 'Enabling real-time sync...' }));
      
      await supabase.functions.invoke('advanced-google-sync', {
        body: { action: 'setup-webhook', userId: user.id }
      });

      setSyncProgress(prev => ({ ...prev, progress: 100, currentOperation: 'Sync complete!' }));

      setSyncStatus(prev => ({
        ...prev,
        lastSync: new Date().toISOString(),
        syncType: 'full',
        syncHealth: 'good'
      }));

      toast({
        title: "Full Sync Complete",
        description: `Synced all data bidirectionally. Created ${academicData.studySessionsCreated} study sessions.`,
      });

    } catch (error) {
      console.error('Full sync error:', error);
      setSyncProgress({ status: 'error', progress: 0, currentOperation: null, estimatedTimeRemaining: null });
      
      toast({
        title: "Full Sync Failed",
        description: "Failed to complete full sync. Please check your connection.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setTimeout(() => {
        setSyncProgress({ status: 'idle', progress: 0, currentOperation: null, estimatedTimeRemaining: null });
      }, 3000);
    }
  }, [user, syncStatus.isOnline, toast]);

  const updateAcademicPreferences = useCallback(async (newPreferences: Partial<AcademicPreferences>) => {
    if (!user || !academicPreferences) return;

    try {
      const updatedPrefs = { ...academicPreferences, ...newPreferences };
      
      const { error } = await supabase
        .from('academic_sync_preferences')
        .update(updatedPrefs)
        .eq('user_id', user.id);

      if (error) throw error;

      setAcademicPreferences(updatedPrefs);
      
      toast({
        title: "Preferences Updated",
        description: "Academic sync preferences have been updated.",
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update academic preferences.",
        variant: "destructive",
      });
    }
  }, [user, academicPreferences, toast]);

  const resolveConflict = useCallback(async (conflictId: string, resolution: 'prefer_local' | 'prefer_google' | 'merge') => {
    if (!user) return;

    try {
      const { error } = await supabase.functions.invoke('advanced-google-sync', {
        body: { 
          action: 'conflict-resolution', 
          userId: user.id,
          data: { conflictId, resolution }
        }
      });

      if (error) throw error;

      toast({
        title: "Conflict Resolved",
        description: `Conflict resolved using ${resolution.replace('_', ' ')} preference.`,
      });
    } catch (error) {
      console.error('Error resolving conflict:', error);
      toast({
        title: "Resolution Failed",
        description: "Failed to resolve sync conflict.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const performSyncHealthCheck = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('advanced-google-sync', {
        body: { action: 'sync-health-check', userId: user.id }
      });

      if (error) throw error;

      setSyncStatus(prev => ({
        ...prev,
        syncHealth: data.health,
        lastSync: data.lastSync
      }));

      return data;
    } catch (error) {
      console.error('Health check error:', error);
      setSyncStatus(prev => ({ ...prev, syncHealth: 'error' }));
    }
  }, [user]);

  return {
    syncStatus,
    syncProgress,
    academicPreferences,
    loading,
    performIncrementalSync,
    performFullSync,
    updateAcademicPreferences,
    resolveConflict,
    performSyncHealthCheck
  };
}