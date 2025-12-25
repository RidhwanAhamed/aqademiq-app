/**
 * Get Token Usage Edge Function
 * Returns the user's daily token usage for AI features
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_LIMIT = 50000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // If no auth header, return default unlimited (will be checked client-side)
    if (!authHeader) {
      console.log('No auth header, returning default');
      return new Response(
        JSON.stringify({
          used: 0,
          limit: DAILY_LIMIT,
          remaining: DAILY_LIMIT,
          is_exceeded: false,
          is_unlimited: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from auth token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    // If auth fails, return default values instead of 401
    if (authError || !user) {
      console.log('Auth failed, returning default:', authError?.message);
      return new Response(
        JSON.stringify({
          used: 0,
          limit: DAILY_LIMIT,
          remaining: DAILY_LIMIT,
          is_exceeded: false,
          is_unlimited: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get daily token usage using RPC
    const { data: usageData, error: usageError } = await supabase.rpc('get_daily_token_usage', {
      p_user_id: user.id
    });

    if (usageError) {
      console.error('Error fetching token usage:', usageError);
      throw usageError;
    }

    const usage = usageData?.[0] || {
      total_tokens_today: 0,
      remaining_tokens: DAILY_LIMIT,
      is_limit_exceeded: false,
      resets_at: new Date(new Date().setUTCHours(24, 0, 0, 0)).toISOString()
    };

    // Check if user has unlimited access (remaining_tokens = 999999999)
    const isUnlimited = Number(usage.remaining_tokens) >= 999999999;
    
    return new Response(
      JSON.stringify({
        used: Number(usage.total_tokens_today),
        limit: isUnlimited ? 'unlimited' : DAILY_LIMIT,
        remaining: isUnlimited ? 'unlimited' : Number(usage.remaining_tokens),
        is_exceeded: usage.is_limit_exceeded,
        resets_at: usage.resets_at,
        is_unlimited: isUnlimited
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-token-usage:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An error occurred',
        used: 0,
        limit: DAILY_LIMIT,
        remaining: DAILY_LIMIT,
        is_exceeded: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
