import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Rate limiting store (in-memory, resets on function restart)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const key = identifier;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

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
      case 'signin-authorize': {
        // OAuth Authorization for Sign-In (openid, email, profile only)
        const redirectUri = requestBody?.redirectUri;
        
        if (!redirectUri) {
          throw new Error('Missing redirectUri');
        }

        console.log('Sign-in OAuth authorization requested for:', redirectUri);
        
        // Generate cryptographically secure state parameter with signin prefix
        const state = 'signin_' + Array.from(
          crypto.getRandomValues(new Uint8Array(32)), 
          b => b.toString(16).padStart(2, '0')
        ).join('');
        
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', googleClientId);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', 'openid email profile');
        authUrl.searchParams.set('access_type', 'offline');
        authUrl.searchParams.set('prompt', 'consent');
        authUrl.searchParams.set('state', state);

        return new Response(JSON.stringify({ 
          url: authUrl.toString(),
          state
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'authorize': {
        // Enhanced OAuth Authorization with Security Validations
        const redirectUri = requestBody?.redirectUri;
        
        if (!redirectUri) {
          throw new Error('Missing redirectUri');
        }

        // Validate redirect URI for security
        const { data: isValidUri, error: validationError } = await supabase
          .rpc('validate_redirect_uri', { p_redirect_uri: redirectUri });

        if (validationError || !isValidUri) {
          console.error('Invalid redirect URI:', redirectUri);
          throw new Error('Invalid redirect URI provided');
        }

        // Generate cryptographically secure state parameter for CSRF protection
        const state = Array.from(
          crypto.getRandomValues(new Uint8Array(32)), 
          b => b.toString(16).padStart(2, '0')
        ).join('');

        // Log OAuth initiation for security monitoring
        await supabase.rpc('log_security_event', {
          p_action: 'oauth_authorization_started',
          p_resource_type: 'oauth_flow',
          p_details: {
            redirect_uri: redirectUri,
            state_generated: true,
            client_ip: req.headers.get('x-forwarded-for') || 'unknown',
            user_agent: req.headers.get('user-agent') || 'unknown',
            timestamp: new Date().toISOString()
          }
        });
        
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', googleClientId);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar email profile');
        authUrl.searchParams.set('access_type', 'offline');
        authUrl.searchParams.set('prompt', 'consent');
        authUrl.searchParams.set('state', state); // Add CSRF protection

        return new Response(JSON.stringify({ 
          authUrl: authUrl.toString(),
          state // Return state for client-side validation
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'callback': {
        // Enhanced OAuth Callback with Security Validations
        const { code, userId, redirectUri, state } = requestBody || {};
        
        if (!code || !userId) {
          throw new Error('Missing code or userId');
        }

        // Validate state parameter for CSRF protection
        if (state) {
          const { data: isValidState, error: stateError } = await supabase
            .rpc('validate_oauth_state', { 
              p_state_token: state, 
              p_user_id: userId 
            });

          if (stateError || !isValidState) {
            await supabase.rpc('log_security_event', {
              p_action: 'oauth_csrf_attack_detected',
              p_resource_type: 'security_incident',
              p_details: {
                user_id: userId,
                invalid_state: state,
                client_ip: req.headers.get('x-forwarded-for') || 'unknown',
                timestamp: new Date().toISOString()
              }
            });
            throw new Error('Invalid OAuth state - possible CSRF attack');
          }
        }

        // Rate limit OAuth callback attempts
        const { data: canProceed, error: rateLimitError } = await supabase
          .rpc('check_operation_rate_limit', {
            p_user_id: userId,
            p_operation_type: 'oauth_callback',
            p_max_operations: 5,
            p_window_minutes: 15
          });

        if (rateLimitError || !canProceed) {
          await supabase.rpc('log_security_event', {
            p_action: 'oauth_rate_limit_exceeded',
            p_resource_type: 'security_control',
            p_details: {
              user_id: userId,
              operation: 'oauth_callback',
              client_ip: req.headers.get('x-forwarded-for') || 'unknown',
              timestamp: new Date().toISOString()
            }
          });
          throw new Error('OAuth callback rate limit exceeded');
        }

        // Validate redirect URI
        if (redirectUri) {
          const { data: isValidUri, error: uriError } = await supabase
            .rpc('validate_redirect_uri', { p_redirect_uri: redirectUri });

          if (uriError || !isValidUri) {
            throw new Error('Invalid redirect URI in callback');
          }
        }

        // Use the provided redirect URI or fall back to a default
        const finalRedirectUri = redirectUri || `${url.origin}/auth-callback`;

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

        // Store tokens using secure function
        const { data: tokenStored, error: tokenError } = await supabase
          .rpc('insert_user_google_tokens', {
            p_user_id: userId,
            p_access_token: tokens.access_token,
            p_refresh_token: tokens.refresh_token,
            p_expires_at: expiresAt.toISOString(),
            p_scope: tokens.scope || 'https://www.googleapis.com/auth/calendar email profile'
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

        // Get current tokens using secure function
        const { data: tokens, error: tokenError } = await supabase
          .rpc('get_user_google_tokens', { p_user_id: userId });

        if (tokenError || !tokens || tokens.length === 0) {
          throw new Error('No tokens found for user');
        }

        const tokenData = tokens[0];
        if (!tokenData?.refresh_token) {
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

        // Update tokens using secure function
        const expiresAt = new Date(Date.now() + (newTokens.expires_in * 1000));
        const { data: updated, error: updateError } = await supabase
          .rpc('update_user_google_tokens', {
            p_user_id: userId,
            p_access_token: newTokens.access_token,
            p_refresh_token: newTokens.refresh_token || undefined,
            p_expires_at: expiresAt.toISOString()
          });

        if (updateError || !updated) {
          console.error('Error updating tokens:', updateError);
          throw new Error('Failed to update tokens');
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

        // Get current tokens using secure function
        const { data: tokens, error: tokenError } = await supabase
          .rpc('get_user_google_tokens', { p_user_id: userId });

        // Revoke token with Google if it exists
        if (!tokenError && tokens && tokens.length > 0 && tokens[0]?.access_token) {
          try {
            await fetch(`https://oauth2.googleapis.com/revoke?token=${tokens[0].access_token}`, {
              method: 'POST',
            });
          } catch (error) {
            console.error('Error revoking token with Google:', error);
          }
        }

        // Delete tokens using secure function
        const { data: deleted, error: deleteError } = await supabase
          .rpc('delete_user_google_tokens', { p_user_id: userId });

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