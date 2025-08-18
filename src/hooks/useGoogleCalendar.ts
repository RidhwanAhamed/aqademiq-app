import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GoogleCalendarSettings {
  sync_enabled: boolean;
  sync_schedule_blocks: boolean;
  sync_assignments: boolean;
  sync_exams: boolean;
  last_sync_at: string | null;
}

interface GoogleTokenStatus {
  isConnected: boolean;
  expiresAt: string | null;
}

export function useGoogleCalendar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<GoogleCalendarSettings | null>(null);
  const [tokenStatus, setTokenStatus] = useState<GoogleTokenStatus>({
    isConnected: false,
    expiresAt: null,
  });
  const [loading, setLoading] = useState(false);

  // Load settings and token status
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        // Load calendar settings
        const { data: settingsData } = await supabase
          .from('google_calendar_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (settingsData) {
          setSettings(settingsData);
        }

        // Check token status
        const { data: tokenData } = await supabase
          .from('google_tokens')
          .select('expires_at')
          .eq('user_id', user.id)
          .maybeSingle();

        setTokenStatus({
          isConnected: !!tokenData,
          expiresAt: tokenData?.expires_at || null,
        });
      } catch (error) {
        console.error('Error loading Google Calendar data:', error);
      }
    };

    loadData();
  }, [user]);

  const connectToGoogle = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      
      const { data, error } = await supabase.functions.invoke('google-oauth', {
        body: { action: 'authorize', redirectUri }
      });

      if (error) {
        console.error('Error from google-oauth function:', error);
        throw new Error(error.message || 'Failed to get authorization URL');
      }

      // Open Google OAuth in a new window
      const authWindow = window.open(
        data.authUrl,
        'google-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!authWindow) {
        throw new Error('Failed to open authentication window. Please allow popups for this site.');
      }

      // Listen for the auth completion
      const handleAuthComplete = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
          authWindow?.close();
          window.removeEventListener('message', handleAuthComplete);
          clearInterval(checkClosed);
          
          // Handle the auth code
          handleAuthCallback(event.data.code);
        } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
          authWindow?.close();
          window.removeEventListener('message', handleAuthComplete);
          clearInterval(checkClosed);
          setLoading(false);
          
          toast({
            title: "Authentication Failed",
            description: `Google authentication failed: ${event.data.error}`,
            variant: "destructive",
          });
        }
      };

      window.addEventListener('message', handleAuthComplete);

      // Check if window was closed manually
      const checkClosed = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleAuthComplete);
          setLoading(false);
          
          toast({
            title: "Authentication Cancelled",
            description: "Google Calendar connection was cancelled.",
            variant: "destructive",
          });
        }
      }, 1000);
    } catch (error) {
      console.error('Error connecting to Google:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to connect to Google Calendar. Please try again.";
      toast({
        title: "Connection Failed",
        description: `Error: ${errorMessage}. Check if Google OAuth is properly configured.`,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleAuthCallback = async (code: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('google-oauth', {
        body: { 
          action: 'callback', 
          code, 
          userId: user.id,
          redirectUri: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        console.error('Error from google-oauth callback:', error);
        throw new Error(error.message || 'Failed to process authentication callback');
      }

      // Refresh data
      const { data: settingsData } = await supabase
        .from('google_calendar_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const { data: tokenData } = await supabase
        .from('google_tokens')
        .select('expires_at')
        .eq('user_id', user.id)
        .single();

      setSettings(settingsData);
      setTokenStatus({
        isConnected: true,
        expiresAt: tokenData.expires_at,
      });

      toast({
        title: "Connected Successfully",
        description: "Google Calendar has been connected to your account.",
      });
    } catch (error) {
      console.error('Error handling auth callback:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to complete Google Calendar connection.";
      toast({
        title: "Connection Failed",
        description: `Error: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const disconnectFromGoogle = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('google-oauth', {
        body: { action: 'revoke', userId: user.id }
      });

      if (error) throw error;

      setTokenStatus({ isConnected: false, expiresAt: null });
      setSettings(prev => prev ? { ...prev, sync_enabled: false } : null);

      toast({
        title: "Disconnected",
        description: "Google Calendar has been disconnected from your account.",
      });
    } catch (error) {
      console.error('Error disconnecting from Google:', error);
      toast({
        title: "Disconnection Failed",
        description: "Failed to disconnect Google Calendar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<GoogleCalendarSettings>) => {
    if (!user || !settings) return;

    try {
      const updatedSettings = { ...settings, ...newSettings };
      
      const { error } = await supabase
        .from('google_calendar_settings')
        .update(updatedSettings)
        .eq('user_id', user.id);

      if (error) throw error;

      setSettings(updatedSettings);
      
      toast({
        title: "Settings Updated",
        description: "Google Calendar sync settings have been updated.",
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update Google Calendar settings.",
        variant: "destructive",
      });
    }
  };

  const syncNow = async () => {
    if (!user || !tokenStatus.isConnected) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-google-calendar-sync', {
        body: { action: 'full-sync', userId: user.id }
      });

      if (error) throw error;

      // Update last sync time
      setSettings(prev => prev ? { ...prev, last_sync_at: new Date().toISOString() } : null);

      toast({
        title: "Bi-Directional Sync Complete",
        description: `Successfully synced your academic data with Google Calendar in both directions.`,
      });
    } catch (error) {
      console.error('Error syncing with Google Calendar:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync with Google Calendar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupWebhook = async () => {
    if (!user || !tokenStatus.isConnected) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-google-calendar-sync', {
        body: { action: 'setup-webhook', userId: user.id }
      });

      if (error) throw error;

      toast({
        title: "Real-Time Sync Enabled",
        description: "Google Calendar changes will now sync automatically to your app.",
      });
    } catch (error) {
      console.error('Error setting up webhook:', error);
      toast({
        title: "Webhook Setup Failed",
        description: "Failed to enable real-time sync. Manual sync is still available.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    settings,
    tokenStatus,
    loading,
    connectToGoogle,
    disconnectFromGoogle,
    updateSettings,
    syncNow,
    setupWebhook,
  };
}