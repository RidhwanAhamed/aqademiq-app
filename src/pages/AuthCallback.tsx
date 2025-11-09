import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(location.search);
      const hash = location.hash;
      const code = params.get('code');
      const error = params.get('error');
      const state = params.get('state');

      // Check if this is a Supabase auth callback (Google Sign-In)
      if (hash.includes('access_token') || hash.includes('type=')) {
        // This is a Supabase OAuth callback - let Supabase handle it
        try {
          const { data, error: authError } = await supabase.auth.getSession();
          
          if (authError) {
            console.error('Supabase auth error:', authError);
            navigate('/auth?error=' + encodeURIComponent(authError.message));
            return;
          }
          
          if (data.session) {
            // Successfully authenticated with Google, redirect to dashboard
            navigate('/');
            return;
          }
        } catch (err) {
          console.error('Auth callback error:', err);
          navigate('/auth?error=authentication_failed');
          return;
        }
      }

      // Check if this is a custom Google Sign-In callback (state starts with 'signin_')
      if (code && state?.startsWith('signin_')) {
        try {
          console.log('Processing custom Google Sign-In callback...');
          
          // Call edge function to exchange code for session
          const { data, error: callbackError } = await supabase.functions.invoke(
            'google-signin-callback',
            {
              body: { 
                code,
                redirect_uri: `${window.location.origin}/auth-callback`
              },
            }
          );

          if (callbackError || !data?.session) {
            console.error('Sign-in callback error:', callbackError);
            navigate('/auth?error=' + encodeURIComponent(callbackError?.message || 'authentication_failed'));
            return;
          }

          // Set the session in Supabase client
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
          });

          console.log('Successfully authenticated with custom Google Sign-In');
          navigate('/');
          return;
        } catch (err) {
          console.error('Custom sign-in error:', err);
          navigate('/auth?error=authentication_failed');
          return;
        }
      }

      // Check if this is a Google Calendar OAuth callback (Settings)
      if (code || error) {
        // If opened in popup, send message to parent
        if (window.opener) {
          if (code) {
            window.opener.postMessage({
              type: 'GOOGLE_AUTH_SUCCESS',
              code: code,
              state: state
            }, window.location.origin);
          } else {
            window.opener.postMessage({
              type: 'GOOGLE_AUTH_ERROR',
              error: error || 'unknown_error'
            }, window.location.origin);
          }
          window.close();
          return;
        }

        // If not in popup, handle differently
        if (error) {
          console.error('OAuth error:', error);
          navigate('/settings?auth_error=' + encodeURIComponent(error));
        } else if (code) {
          // Store code temporarily and redirect to settings
          sessionStorage.setItem('google_auth_code', code);
          navigate('/settings?auth_success=true');
        }
      } else {
        // No OAuth params, redirect to auth page
        navigate('/auth');
      }
    };

    // Small delay to ensure URL is fully loaded
    const timer = setTimeout(handleCallback, 100);
    
    return () => clearTimeout(timer);
  }, [location, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Processing Authentication
          </CardTitle>
          <CardDescription>
            Completing your Google Calendar connection...
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Verifying credentials
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Setting up calendar sync
          </div>
          <p className="text-xs text-muted-foreground">
            This should only take a moment. You'll be redirected automatically.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}