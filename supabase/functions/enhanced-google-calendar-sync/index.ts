import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

    const body = await req.json() as SyncRequest;
    console.log('Enhanced Google Calendar sync request:', body);

    switch (body.action) {
      case 'webhook':
        return await handleWebhook(req, supabase);
      
      case 'setup-webhook':
        return await setupWebhook(body.userId!, supabase);
      
      case 'full-sync':
        return await performFullBidirectionalSync(body.userId!, supabase);
      
      case 'incremental-sync':
        return await performIncrementalSync(body.userId!, supabase);
      
      case 'conflict-resolution':
        return await resolveConflicts(body.userId!, body.conflictData, supabase);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Enhanced sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
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
    resourceId
  });

  if (!channelId || !resourceState) {
    return new Response('Invalid webhook', { status: 400 });
  }

  // Find the user associated with this channel
  const { data: channel } = await supabase
    .from('google_calendar_channels')
    .select('user_id, calendar_id')
    .eq('channel_id', channelId)
    .eq('is_active', true)
    .single();

  if (!channel) {
    console.log('Channel not found:', channelId);
    return new Response('Channel not found', { status: 404 });
  }

  if (resourceState === 'exists') {
    // Calendar has been updated - trigger incremental sync
    console.log(`Triggering incremental sync for user ${channel.user_id}`);
    
    // Use background task to avoid blocking webhook response
    EdgeRuntime.waitUntil(performIncrementalSync(channel.user_id, supabase));
  }

  return new Response('OK', { status: 200 });
}

// Import all the function implementations
const functionsModule = await import('./functions.ts');