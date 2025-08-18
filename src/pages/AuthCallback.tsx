import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = () => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      const error = params.get('error');
      const state = params.get('state');

      // Check if this is a Google OAuth callback
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
        // No OAuth params, redirect to settings
        navigate('/settings');
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