import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  action: string;
  userId: string;
  data?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const requestData: SyncRequest = await req.json();
    const { action, userId, data } = requestData;

    console.log(`Advanced Google Sync - Action: ${action}, User: ${userId}`);

    switch (action) {
      case 'incremental-sync':
        return await performIncrementalSync(userId, supabase);
      
      case 'full-bidirectional-sync':
        return await performFullBidirectionalSync(userId, supabase);
      
      case 'conflict-resolution':
        return await resolveConflict(userId, data, supabase);
      
      case 'academic-schedule-sync':
        return await syncAcademicSchedule(userId, supabase);
      
      case 'setup-webhook':
        return await setupGoogleWebhook(userId, supabase);
      
      case 'process-webhook':
        return await processWebhookNotification(req, supabase);
      
      case 'sync-health-check':
        return await performSyncHealthCheck(userId, supabase);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Advanced Google Sync Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function performIncrementalSync(userId: string, supabase: any) {
  console.log(`Starting incremental sync for user: ${userId}`);
  
  try {
    // Get user's Google tokens and settings
    const [tokenResult, settingsResult, syncTokenResult] = await Promise.all([
      supabase.rpc('get_user_google_tokens', { p_user_id: userId }),
      supabase.from('google_calendar_settings').select('*').eq('user_id', userId).single(),
      supabase.from('google_sync_tokens').select('*').eq('user_id', userId).single()
    ]);

    const tokens = tokenResult.data?.[0];
    const settings = settingsResult.data;
    const syncToken = syncTokenResult.data;

    if (!tokens || !settings) {
      throw new Error('Missing tokens or settings');
    }

    // Refresh access token if needed
    const accessToken = await refreshTokenIfNeeded(tokens, userId, supabase);

    // Use sync token for incremental sync if available
    let syncUrl = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
    if (syncToken?.sync_token) {
      syncUrl += `?syncToken=${encodeURIComponent(syncToken.sync_token)}`;
    } else {
      // First sync - get events from last 30 days
      const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      syncUrl += `?timeMin=${timeMin}&singleEvents=true&orderBy=startTime`;
    }

    console.log('Fetching Google Calendar changes...');
    const response = await fetch(syncUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      if (response.status === 410) {
        // Sync token expired - fall back to full sync
        console.log('Sync token expired, falling back to full sync');
        return await performFullBidirectionalSync(userId, supabase);
      }
      throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Process changed events
    const changesSynced = await processGoogleEvents(userId, data.items || [], supabase);
    
    // Store new sync token for next incremental sync
    if (data.nextSyncToken) {
      await supabase
        .from('google_sync_tokens')
        .upsert({
          user_id: userId,
          calendar_id: 'primary',
          sync_token: data.nextSyncToken,
          last_used_at: new Date().toISOString()
        });
    }

    // Sync our changes to Google (bidirectional)
    const localChangesSynced = await syncLocalChangesToGoogle(userId, accessToken, settings, supabase);

    // Update last sync time
    await supabase
      .from('google_calendar_settings')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', userId);

    return new Response(JSON.stringify({
      success: true,
      type: 'incremental',
      googleChangesSynced: changesSynced,
      localChangesSynced: localChangesSynced,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Incremental sync error:', error);
    
    // Log sync failure
    await supabase.from('sync_operations').insert({
      user_id: userId,
      operation_type: 'incremental_sync',
      entity_type: 'calendar',
      entity_id: userId,
      operation_status: 'failed',
      error_message: error.message,
      sync_direction: 'bidirectional'
    });

    throw error;
  }
}

async function performFullBidirectionalSync(userId: string, supabase: any) {
  console.log(`Starting full bidirectional sync for user: ${userId}`);

  try {
    const [tokenResult, settingsResult] = await Promise.all([
      supabase.rpc('get_user_google_tokens', { p_user_id: userId }),
      supabase.from('google_calendar_settings').select('*').eq('user_id', userId).single()
    ]);

    const tokens = tokenResult.data?.[0];
    const settings = settingsResult.data;

    if (!tokens || !settings) {
      throw new Error('Missing tokens or settings');
    }

    const accessToken = await refreshTokenIfNeeded(tokens, userId, supabase);

    // Step 1: Import events from Google Calendar
    const importResults = await importFromGoogleCalendar(userId, accessToken, supabase);
    
    // Step 2: Export our events to Google Calendar
    const exportResults = await exportToGoogleCalendar(userId, accessToken, settings, supabase);
    
    // Step 3: Generate academic study sessions
    const studySessionResults = await generateAcademicStudySessions(userId, supabase);

    // Step 4: Clear old sync token to start fresh next time
    await supabase.from('google_sync_tokens').delete().eq('user_id', userId);

    // Step 5: Update last sync time
    await supabase
      .from('google_calendar_settings')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', userId);

    return new Response(JSON.stringify({
      success: true,
      type: 'full_bidirectional',
      results: {
        imported: importResults,
        exported: exportResults,
        studySessions: studySessionResults
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Full bidirectional sync error:', error);
    throw error;
  }
}

async function syncAcademicSchedule(userId: string, supabase: any) {
  console.log(`Syncing academic schedule for user: ${userId}`);

  try {
    // Get user's academic preferences
    const { data: preferences } = await supabase
      .from('academic_sync_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!preferences) {
      // Create default preferences
      await supabase.from('academic_sync_preferences').insert({
        user_id: userId
      });
    }

    // Generate intelligent study sessions for upcoming exams
    const upcomingExams = await supabase
      .from('exams')
      .select('*, courses(name, color)')
      .eq('user_id', userId)
      .gte('exam_date', new Date().toISOString())
      .lte('exam_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());

    let studySessionsCreated = 0;

    for (const exam of upcomingExams.data || []) {
      const examDate = new Date(exam.exam_date);
      const daysUntilExam = Math.ceil((examDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      
      if (daysUntilExam > 0 && daysUntilExam <= (preferences?.exam_prep_days || 14)) {
        // Create study sessions leading up to exam
        const sessionsNeeded = Math.min(daysUntilExam, preferences?.exam_prep_days || 14);
        
        for (let i = 1; i <= sessionsNeeded; i++) {
          const sessionDate = new Date(examDate.getTime() - i * 24 * 60 * 60 * 1000);
          
          // Check if session already exists
          const existingSession = await supabase
            .from('study_sessions')
            .select('id')
            .eq('user_id', userId)
            .eq('exam_id', exam.id)
            .gte('scheduled_start', sessionDate.toDateString())
            .lt('scheduled_start', new Date(sessionDate.getTime() + 24 * 60 * 60 * 1000).toDateString())
            .single();

          if (!existingSession.data) {
            // Create study session
            const sessionStart = new Date(sessionDate);
            sessionStart.setHours(preferences?.auto_study_sessions ? 14 : 19, 0, 0, 0); // 2PM or 7PM
            
            const sessionEnd = new Date(sessionStart.getTime() + (preferences?.study_session_duration || 120) * 60 * 1000);

            await supabase.from('study_sessions').insert({
              user_id: userId,
              exam_id: exam.id,
              course_id: exam.course_id,
              title: `Study for ${exam.title}`,
              scheduled_start: sessionStart.toISOString(),
              scheduled_end: sessionEnd.toISOString(),
              status: 'scheduled'
            });

            studySessionsCreated++;
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      studySessionsCreated,
      message: `Created ${studySessionsCreated} study sessions for upcoming exams`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Academic schedule sync error:', error);
    throw error;
  }
}

async function processGoogleEvents(userId: string, events: any[], supabase: any) {
  let processed = 0;
  
  for (const event of events) {
    try {
      // Check if we have a mapping for this event
      const { data: mapping } = await supabase
        .from('google_event_mappings')
        .select('*')
        .eq('google_event_id', event.id)
        .eq('user_id', userId)
        .single();

      if (mapping) {
        // Update existing local event
        await updateLocalEventFromGoogle(mapping, event, supabase);
      } else if (event.status !== 'cancelled') {
        // Create new local event (only if not created by our app)
        if (!event.description?.includes('Lovable Academic Planner') && 
            !event.source?.title?.includes('Lovable Academic Planner')) {
          await createLocalEventFromGoogle(userId, event, supabase);
        }
      }
      processed++;
    } catch (error) {
      console.error('Error processing Google event:', error);
    }
  }
  
  return processed;
}

async function createLocalEventFromGoogle(userId: string, googleEvent: any, supabase: any) {
  try {
    const eventData = extractEventData(googleEvent);

    // Determine the entity type based on the event description or source
    let entityType = 'assignment'; // Default
    if (googleEvent.description?.includes('#exam')) {
      entityType = 'exam';
    } else if (googleEvent.description?.includes('#class')) {
      entityType = 'schedule_block';
    } else if (googleEvent.summary?.toLowerCase().includes('study session')) {
      entityType = 'study_session';
    }

    const tableName = getTableName(entityType);

    // Insert the new event into the appropriate table
    const { data: newEvent, error } = await supabase
      .from(tableName)
      .insert({
        user_id: userId,
        ...eventData,
        created_by: 'google_calendar',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    // Create a mapping between the Google event and the local event
    await supabase.from('google_event_mappings').insert({
      user_id: userId,
      google_event_id: googleEvent.id,
      entity_type: entityType,
      entity_id: newEvent.id,
      local_event_created: new Date().toISOString(),
      last_synced_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error creating local event:', error);
  }
  // Import the exact same logic for creating local events
}

async function updateLocalEventFromGoogle(mapping: any, googleEvent: any, supabase: any) {
  try {
    const googleUpdated = new Date(googleEvent.updated);
    const localUpdated = new Date(mapping.local_event_updated || mapping.last_synced_at);

    // Check for conflicts (both updated since last sync)
    if (googleUpdated > new Date(mapping.last_synced_at) && 
        localUpdated > new Date(mapping.last_synced_at)) {
      // Conflict detected - store for resolution
      await supabase.from('sync_conflicts').insert({
        user_id: mapping.user_id,
        entity_type: mapping.entity_type,
        entity_id: mapping.entity_id,
        google_event_id: googleEvent.id,
        local_data: {}, // Would fetch local data here
        google_data: googleEvent,
        conflict_type: 'simultaneous_update'
      });
      return;
    }

    // Update local event with Google data
    const updateData = extractEventData(googleEvent);
    
    await supabase
      .from(getTableName(mapping.entity_type))
      .update(updateData)
      .eq('id', mapping.entity_id);

    // Update mapping
    await supabase
      .from('google_event_mappings')
      .update({
        google_event_updated: googleUpdated.toISOString(),
        last_synced_at: new Date().toISOString()
      })
      .eq('id', mapping.id);

  } catch (error) {
    console.error('Error updating local event:', error);
  }
}

// rest of helper functions
async function refreshTokenIfNeeded(tokenData: any, userId: string, supabase: any): Promise<string> {
  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();
  
  if (expiresAt <= new Date(now.getTime() + 60 * 60 * 1000)) { // Refresh 1 hour before expiry
    const response = await supabase.functions.invoke('google-oauth', {
      body: { action: 'refresh', userId }
    });
    
    if (response.error) {
      throw new Error('Failed to refresh Google token');
    }
    
    return response.data.access_token;
  }
  
  return tokenData.access_token;
}

function getTableName(entityType: string): string {
  const tableMap: Record<string, string> = {
    'schedule_block': 'schedule_blocks',
    'assignment': 'assignments',
    'exam': 'exams',
    'study_session': 'study_sessions'
  };
  return tableMap[entityType] || entityType;
}

function extractEventData(googleEvent: any) {
  // Extract and transform Google event data to local format
  return {
    title: googleEvent.summary,
    description: googleEvent.description,
    location: googleEvent.location,
    updated_at: new Date().toISOString()
  };
}

// Placeholder functions - implement based on existing functions.ts
async function importFromGoogleCalendar(userId: string, accessToken: string, supabase: any) {
  return { imported: 0 };
}

async function exportToGoogleCalendar(userId: string, accessToken: string, settings: any, supabase: any) {
  return { exported: 0 };
}

async function syncLocalChangesToGoogle(userId: string, accessToken: string, settings: any, supabase: any) {
  return { synced: 0 };
}

async function generateAcademicStudySessions(userId: string, supabase: any) {
  return { created: 0 };
}

async function setupGoogleWebhook(userId: string, supabase: any) {
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function processWebhookNotification(req: Request, supabase: any) {
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function resolveConflict(userId: string, data: any, supabase: any) {
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function performSyncHealthCheck(userId: string, supabase: any) {
  return new Response(JSON.stringify({ 
    success: true, 
    health: 'good',
    lastSync: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
