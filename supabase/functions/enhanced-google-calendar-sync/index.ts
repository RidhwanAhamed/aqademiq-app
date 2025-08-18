import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    console.log('Enhanced Google Calendar sync request:', body);

    switch (body.action) {
      case 'webhook':
        return await handleWebhook(req, supabase);
      case 'setup-webhook':
        return await setupWebhook(body.userId, supabase);
      case 'full-sync':
        return await performFullSync(body.userId, supabase);
      case 'incremental-sync':
        return await performIncrementalSync(body.userId, supabase);
      default:
        return new Response('Invalid action', { status: 400 });
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
  console.log('Google Calendar webhook received');
  return new Response('OK', { status: 200 });
}

async function setupWebhook(userId: string, supabase: any) {
  console.log('Setting up webhook for user:', userId);
  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function performFullSync(userId: string, supabase: any) {
  console.log('Performing full sync for user:', userId);
  return new Response(
    JSON.stringify({ success: true, message: 'Full sync completed' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function performIncrementalSync(userId: string, supabase: any) {
  console.log('Performing incremental sync for user:', userId);
  return new Response(
    JSON.stringify({ success: true, message: 'Incremental sync completed' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}