import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { 
  setupWebhook, 
  performFullBidirectionalSync, 
  performIncrementalSync, 
  resolveConflicts 
} from './functions.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  action: 'webhook' | 'setup-webhook' | 'full-sync' | 'incremental-sync' | 'conflict-resolution';
  userId?: string;
  webhookData?: any;
  conflictData?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Enhanced Google Calendar sync request received');
    console.log('Method:', req.method);
    console.log('Headers:', Object.fromEntries(req.headers.entries()));

    let body: SyncRequest;
    try {
      body = await req.json() as SyncRequest;
      console.log('Request body:', body);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    if (!body.action) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (body.action) {
      case 'webhook':
        return await handleWebhook(req, supabase);
      
      case 'setup-webhook':
        if (!body.userId) {
          return new Response(
            JSON.stringify({ error: 'Missing required field: userId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return await setupWebhook(body.userId, supabase);
      
      case 'full-sync':
        if (!body.userId) {
          return new Response(
            JSON.stringify({ error: 'Missing required field: userId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return await performFullBidirectionalSync(body.userId, supabase);
      
      case 'incremental-sync':
        if (!body.userId) {
          return new Response(
            JSON.stringify({ error: 'Missing required field: userId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return await performIncrementalSync(body.userId, supabase);
      
      case 'conflict-resolution':
        if (!body.userId || !body.conflictData) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields: userId and conflictData' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return await resolveConflicts(body.userId, body.conflictData, supabase);
      
      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid action',
            validActions: ['webhook', 'setup-webhook', 'full-sync', 'incremental-sync', 'conflict-resolution']
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Enhanced sync error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: 'An unexpected error occurred during sync operation'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleWebhook(req: Request, supabase: any) {
  const channelId = req.headers.get('x-goog-channel-id');
  const resourceState = req.headers.get('x-goog-resource-state');
  const resourceId = req.headers.get('x-goog-resource-id');

  console.log('Google Calendar webhook received:', {
    channelId,
    resourceState,
    resourceId,
    timestamp: new Date().toISOString()
  });

  if (!channelId || !resourceState) {
    console.error('Invalid webhook - missing headers');
    return new Response(
      JSON.stringify({ error: 'Invalid webhook - missing required headers' }), 
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Find the user associated with this channel
  const { data: channel, error: channelError } = await supabase
    .from('google_calendar_channels')
    .select('user_id, calendar_id')
    .eq('channel_id', channelId)
    .eq('is_active', true)
    .maybeSingle();

  if (channelError) {
    console.error('Database error finding channel:', channelError);
    return new Response(
      JSON.stringify({ error: 'Database error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!channel) {
    console.log('Channel not found or inactive:', channelId);
    return new Response(
      JSON.stringify({ error: 'Channel not found or inactive' }), 
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (resourceState === 'exists') {
    // Calendar has been updated - trigger incremental sync
    console.log(`Triggering incremental sync for user ${channel.user_id}`);
    
    try {
      // Trigger incremental sync in background
      await performIncrementalSync(channel.user_id, supabase);
      console.log(`Incremental sync completed for user ${channel.user_id}`);
    } catch (syncError) {
      console.error(`Error during incremental sync for user ${channel.user_id}:`, syncError);
      // Don't fail the webhook response - just log the error
    }
  }

  return new Response(
    JSON.stringify({ message: 'Webhook processed successfully' }), 
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Edge function execution complete
console.log('Enhanced Google Calendar sync operation completed');