import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const url = new URL(req.url);
    let action = url.pathname.split('/').pop();
    
    console.log('Google OAuth request URL:', req.url);
    console.log('Google OAuth method:', req.method);
    console.log('Google OAuth action from URL:', action);

    // Basic rate limiting for OAuth endpoints
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(clientIp, 30, 60000)) { // 30 requests per minute per IP
      console.log(`Rate limit exceeded for IP: ${clientIp}`);
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try to get action from request body if not in URL
    let requestBody = null;
    if (req.method === 'POST' && req.headers.get('content-type')?.includes('application/json')) {
      try {
        requestBody = await req.json();
        action = requestBody.action || action;
        console.log('Google OAuth action from body:', action);
        console.log('Request body:', requestBody);
      } catch (e) {
        console.log('No JSON body found, continuing...');
      }
    }

    // Validate environment variables
    if (!googleClientId || !googleClientSecret) {
      console.error('Missing Google OAuth credentials');
      throw new Error('Google OAuth not configured properly');
    }

    switch (action || 'authorize') {
      case 'authorize': {
        // Generate Google OAuth URL
        const redirectUri = requestBody?.redirectUri;
        
        if (!redirectUri) {
          throw new Error('Missing redirectUri');
        }
        
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', googleClientId);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar email profile');
        authUrl.searchParams.set('access_type', 'offline');
        authUrl.searchParams.set('prompt', 'consent');

        return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'callback': {
        // Handle OAuth callback
        const { code, userId, redirectUri } = requestBody || {};
        
        if (!code || !userId) {
          throw new Error('Missing code or userId');
        }

        // Use the provided redirect URI or fall back to a default
        const finalRedirectUri = redirectUri || `${url.origin}/auth/callback`;

        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: googleClientId,
            client_secret: googleClientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: finalRedirectUri,
          }),
        });

        const tokens = await tokenResponse.json();
        console.log('Token response:', { ...tokens, access_token: '[REDACTED]', refresh_token: '[REDACTED]' });

        if (!tokens.access_token) {
          throw new Error('Failed to get access token: ' + (tokens.error_description || tokens.error || 'Unknown error'));
        }

        // Calculate expiry time
        const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

        // Store tokens in database
        const { error: tokenError } = await supabase
          .from('google_tokens')
          .upsert({
            user_id: userId,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: expiresAt.toISOString(),
            scope: tokens.scope || 'https://www.googleapis.com/auth/calendar email profile',
          }, {
            onConflict: 'user_id'
          });

        if (tokenError) {
          console.error('Error storing tokens:', tokenError);
          throw tokenError;
        }

        // Initialize Google Calendar settings
        const { error: settingsError } = await supabase
          .from('google_calendar_settings')
          .upsert({
            user_id: userId,
            sync_enabled: true,
          }, {
            onConflict: 'user_id'
          });

        if (settingsError) {
          console.error('Error creating calendar settings:', settingsError);
          throw settingsError;
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'refresh': {
        // Refresh access token
        const { userId } = requestBody || {};
        
        if (!userId) {
          throw new Error('Missing userId');
        }

        // Get current tokens
        const { data: tokenData, error: tokenError } = await supabase
          .from('google_tokens')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (tokenError || !tokenData?.refresh_token) {
          throw new Error('No refresh token found');
        }

        // Refresh the token
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: googleClientId,
            client_secret: googleClientSecret,
            refresh_token: tokenData.refresh_token,
            grant_type: 'refresh_token',
          }),
        });

        const newTokens = await refreshResponse.json();
        console.log('Refresh response:', { ...newTokens, access_token: '[REDACTED]' });

        if (!newTokens.access_token) {
          throw new Error('Failed to refresh access token');
        }

        // Update tokens in database
        const expiresAt = new Date(Date.now() + (newTokens.expires_in * 1000));
        const { error: updateError } = await supabase
          .from('google_tokens')
          .update({
            access_token: newTokens.access_token,
            expires_at: expiresAt.toISOString(),
            ...(newTokens.refresh_token && { refresh_token: newTokens.refresh_token }),
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error('Error updating tokens:', updateError);
          throw updateError;
        }

        return new Response(JSON.stringify({ 
          access_token: newTokens.access_token,
          expires_at: expiresAt.toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'revoke': {
        // Revoke access and delete tokens
        const { userId } = requestBody || {};
        
        if (!userId) {
          throw new Error('Missing userId');
        }

        // Get current tokens
        const { data: tokenData } = await supabase
          .from('google_tokens')
          .select('access_token')
          .eq('user_id', userId)
          .single();

        // Revoke token with Google
        if (tokenData?.access_token) {
          try {
            await fetch(`https://oauth2.googleapis.com/revoke?token=${tokenData.access_token}`, {
              method: 'POST',
            });
          } catch (error) {
            console.error('Error revoking token with Google:', error);
          }
        }

        // Delete tokens from database
        const { error: deleteError } = await supabase
          .from('google_tokens')
          .delete()
          .eq('user_id', userId);

        if (deleteError) {
          console.error('Error deleting tokens:', deleteError);
          throw deleteError;
        }

        // Disable sync
        const { error: settingsError } = await supabase
          .from('google_calendar_settings')
          .update({ sync_enabled: false })
          .eq('user_id', userId);

        if (settingsError) {
          console.error('Error updating settings:', settingsError);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in google-oauth function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});