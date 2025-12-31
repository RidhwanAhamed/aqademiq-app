// @ts-nocheck
/// <reference lib="deno.ns" />
/// <reference lib="dom" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ActionBody = {
  action?: 'authorize' | 'signin-authorize' | 'callback' | 'refresh' | 'revoke';
  redirectUri?: string;
  userId?: string;
  code?: string;
  state?: string;
};

function toBase64Url(bytes: Uint8Array): string {
  const bin = String.fromCharCode(...bytes);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateStateToken(size = 32): string {
  const buf = new Uint8Array(size);
  crypto.getRandomValues(buf);
  return toBase64Url(buf);
}

// Extract first IP from x-forwarded-for (comma-separated) safely
function getClientIp(req: Request): string | null {
  const raw = req.headers.get('x-forwarded-for') || '';
  const first = raw.split(',')[0]?.trim();
  return first || null;
}

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
    const clientIp = getClientIp(req) || 'unknown';
    if (!checkRateLimit(clientIp, 30, 60000)) { // 30 requests per minute per IP
      console.log(`Rate limit exceeded for IP: ${clientIp}`);
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try to get action from request body if not in URL
    let requestBody: ActionBody = {};
    if (req.method === 'POST' && req.headers.get('content-type')?.includes('application/json')) {
      try {
        requestBody = await req.json() as ActionBody;
        action = requestBody.action || action;
        console.log('Google OAuth action from body:', action);
        console.log('Request body:', requestBody);
      } catch (e) {
        console.log('No JSON body found, continuing...');
      }
    }

    // Validate environment variables
    if (!googleClientId || !googleClientSecret) {
      console.error('Missing Google OAuth credentials (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET)');
      return new Response(JSON.stringify({ 
        error: 'Google OAuth not configured properly',
        hint: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the Edge Function environment.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    switch (action || 'authorize') {
      case 'signin-authorize': {
        // OAuth Authorization for Sign-In (openid, email, profile only)
        const redirectUri = requestBody?.redirectUri;
        const userId = requestBody?.userId;
        
        if (!redirectUri) {
          throw new Error('Missing redirectUri');
        }

        console.log('Sign-in OAuth authorization requested for:', redirectUri);
        
        // Generate and store state token if user is authenticated
        let state: string;
        if (userId) {
          const rawState = generateStateToken();
          const { data: stateToken, error: stateError } = await supabase
            .rpc('create_oauth_state_token', { 
              p_user_id: userId,
              p_state_token: rawState,
              p_ip_address: getClientIp(req),
              p_user_agent: req.headers.get('user-agent') || null
            });
          
          if (stateError || !stateToken) {
            console.error('Error creating state token:', stateError);
            throw new Error('Failed to create OAuth state token');
          }
          state = 'signin_' + stateToken;
        } else {
          // For unauthenticated sign-in flows, generate a temporary state (not stored)
          state = 'signin_' + generateStateToken();
        }
        
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
        const userId = requestBody?.userId;
        
        console.log('🔐 OAuth authorize request:', { 
          redirectUri, 
          userId: userId ? 'present' : 'MISSING',
          hasRedirectUri: !!redirectUri 
        });
        
        if (!redirectUri) {
          console.error('❌ Missing redirectUri in authorize request');
          throw new Error('Missing redirectUri');
        }

        if (!userId) {
          console.error('❌ Missing userId in authorize request - client must include userId');
          throw new Error('Missing userId - authentication required');
        }

        // Validate redirect URI for security
        const { data: isValidUri, error: validationError } = await supabase
          .rpc('validate_redirect_uri', { p_redirect_uri: redirectUri });

        if (validationError || !isValidUri) {
          console.error('Invalid redirect URI:', redirectUri);
          return new Response(JSON.stringify({ 
            error: 'Invalid redirect URI provided',
            redirectUri,
            hint: 'Ensure this exact URI is in Google OAuth Authorized redirect URIs and in validate_redirect_uri allowlist.'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Generate and store state token using secure database function
        const rawState = generateStateToken();
        const { data: stateToken, error: stateError } = await supabase
          .rpc('create_oauth_state_token', { 
            p_user_id: userId,
            p_state_token: rawState,
            p_ip_address: getClientIp(req),
            p_user_agent: req.headers.get('user-agent') || null
          });
        
        if (stateError || !stateToken) {
          console.error('Error creating state token:', stateError);
          throw new Error('Failed to create OAuth state token');
        }

        // Log OAuth initiation for security monitoring
        await supabase.rpc('log_security_event', {
          p_action: 'oauth_authorization_started',
          p_resource_type: 'oauth_flow',
          p_details: {
            redirect_uri: redirectUri,
            state_stored: true,
            client_ip: getClientIp(req) || 'unknown',
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
        authUrl.searchParams.set('state', stateToken); // Use stored state token

        return new Response(JSON.stringify({ 
          authUrl: authUrl.toString(),
          state: stateToken // Return state for client-side validation
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
              client_ip: getClientIp(req) || 'unknown',
              timestamp: new Date().toISOString()
            }
          });
          return new Response(JSON.stringify({ 
            error: 'Invalid OAuth state - possible CSRF attack',
            hint: 'State validation failed; restart OAuth flow.'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
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
              client_ip: getClientIp(req) || 'unknown',
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
          return new Response(JSON.stringify({ 
            error: 'Invalid redirect URI in callback',
            redirectUri,
            hint: 'Ensure redirectUri matches an allowed domain/path.'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
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
          return new Response(JSON.stringify({ 
            error: 'Failed to store tokens',
            detail: tokenError.message || tokenError,
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
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
          return new Response(JSON.stringify({ 
            error: 'Failed to initialize calendar settings',
            detail: settingsError.message || settingsError,
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
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
          return new Response(JSON.stringify({ 
            error: 'No tokens found for user'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
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
          return new Response(JSON.stringify({ 
            error: 'Failed to update tokens',
            detail: updateError?.message || updateError
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
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
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});