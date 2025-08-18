import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Rate limiting and security utilities
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const csrfTokenStore = new Map<string, { token: string; expires: number }>();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
};

function checkRateLimit(identifier: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

function generateCSRFToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), 
    b => b.toString(16).padStart(2, '0')).join('');
}

function validateCSRFToken(sessionId: string, token: string): boolean {
  const stored = csrfTokenStore.get(sessionId);
  if (!stored || Date.now() > stored.expires) {
    csrfTokenStore.delete(sessionId);
    return false;
  }
  return stored.token === token;
}

// Input sanitization
function sanitizeInput(value: any): any {
  if (typeof value === 'string') {
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .slice(0, 10000); // Max length protection
  }
  
  if (Array.isArray(value)) {
    return value.map(sanitizeInput);
  }
  
  if (typeof value === 'object' && value !== null) {
    const sanitized: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      if (typeof key === 'string' && key.length < 100) { // Key length protection
        sanitized[key] = sanitizeInput(val);
      }
    }
    return sanitized;
  }
  
  return value;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(clientIp, 50, 60000)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'process';

    if (action === 'csrf-token') {
      // Generate CSRF token
      const token = generateCSRFToken();
      const expires = Date.now() + (30 * 60 * 1000); // 30 minutes
      csrfTokenStore.set(user.id, { token, expires });
      
      return new Response(JSON.stringify({ csrfToken: token }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For state-changing operations, validate CSRF token
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
      const csrfToken = req.headers.get('x-csrf-token');
      if (!csrfToken || !validateCSRFToken(user.id, csrfToken)) {
        return new Response(JSON.stringify({ error: 'Invalid CSRF token' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Sanitize input
    const body = await req.text();
    let requestData;
    try {
      requestData = body ? sanitizeInput(JSON.parse(body)) : {};
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log security event
    await supabase.rpc('log_security_event', {
      p_action: 'secure_operation',
      p_resource_type: 'api_endpoint',
      p_details: { 
        endpoint: 'security-middleware',
        method: req.method,
        action: action,
        sanitized: true,
        csrf_validated: req.method !== 'GET'
      }
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Security middleware operational',
      user_id: user.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Security middleware error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});