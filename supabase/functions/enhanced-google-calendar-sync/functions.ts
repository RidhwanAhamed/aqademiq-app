import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= CORE SYNC FUNCTIONS =============

export async function setupWebhook(userId: string, supabase: any) {
  console.log(`Setting up webhook for user ${userId}`);
  
  try {
    // Log sync operation start
    const { data: operationData } = await supabase
      .from('sync_operations')
      .insert({
        user_id: userId,
        entity_type: 'webhook',
        entity_id: userId, 
        operation_type: 'webhook_setup',
        operation_status: 'pending',
        sync_direction: 'inbound',
        sync_type: 'manual'
      })
      .select('id')
      .single();

    // Get user's Google token
    const { data: tokenData, error: tokenError } = await supabase
      .rpc('get_user_google_tokens', { p_user_id: userId });

    if (tokenError || !tokenData || tokenData.length === 0) {
      await updateSyncOperation(supabase, operationData?.id, 'failed', 'No valid Google tokens found');
      throw new Error('No Google token found - please reconnect your Google account');
    }

    const token = tokenData[0];
    
    // Refresh token if needed
    const accessToken = await refreshTokenIfNeeded(token, userId, supabase);

    // Create webhook channel with Google Calendar API
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/enhanced-google-calendar-sync`;
    const channelId = `aqademiq-${userId}-${Date.now()}`;
    const expiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    console.log(`Creating webhook channel: ${channelId}`);

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events/watch', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        expiration: expiration.getTime().toString(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Google API error (${response.status})`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      await updateSyncOperation(supabase, operationData?.id, 'failed', errorMessage);
      throw new Error(`Failed to setup webhook: ${errorMessage}`);
    }

    const webhookData = await response.json();
    console.log('Webhook response:', webhookData);

    // Store webhook channel in database
    await supabase
      .from('google_calendar_channels')
      .insert({
        user_id: userId,
        channel_id: channelId,
        resource_id: webhookData.resourceId,
        expiration: new Date(parseInt(webhookData.expiration)),
        webhook_url: webhookUrl,
        is_active: true,
      });

    await updateSyncOperation(supabase, operationData?.id, 'completed', `Webhook setup successful: ${channelId}`);

    console.log(`Webhook setup complete for user ${userId}, channel: ${channelId}`);
    return new Response(
      JSON.stringify({ 
        success: true, 
        channelId,
        message: 'Webhook setup successfully - real-time sync is now active'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook setup error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to setup real-time sync webhook'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

export async function performFullBidirectionalSync(userId: string, supabase: any) {
  console.log(`Starting full bidirectional sync for user ${userId}`);

  // Log sync operation start
  const { data: operationData } = await supabase
    .from('sync_operations')
    .insert({
      user_id: userId,
      entity_type: 'full_sync',
      entity_id: userId,
      operation_type: 'full_sync',
      operation_status: 'pending',
      sync_direction: 'bidirectional',
      sync_type: 'manual'
    })
    .select('id')
    .single();

  try {
    // Get user's settings and tokens
    const [settingsResult, tokenResult] = await Promise.all([
      supabase
        .from('google_calendar_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .rpc('get_user_google_tokens', { p_user_id: userId })
    ]);

    if (!settingsResult.data) {
      // Create default settings if none exist
      const { data: newSettings } = await supabase
        .from('google_calendar_settings')
        .insert({
          user_id: userId,
          sync_enabled: true,
          sync_schedule_blocks: true,
          sync_assignments: true,
          sync_exams: true
        })
        .select('*')
        .single();
      settingsResult.data = newSettings;
    }

    if (!tokenResult.data || tokenResult.data.length === 0) {
      await updateSyncOperation(supabase, operationData?.id, 'failed', 'No valid Google tokens found');
      throw new Error('No Google tokens found - please reconnect your Google account');
    }

    const settings = settingsResult.data;
    const token = tokenResult.data[0];
    const accessToken = await refreshTokenIfNeeded(token, userId, supabase);

    console.log('Starting sync with settings:', { 
      sync_schedule_blocks: settings.sync_schedule_blocks,
      sync_assignments: settings.sync_assignments,
      sync_exams: settings.sync_exams
    });

    // Step 1: Import events from Google Calendar
    const importResults = await importFromGoogleCalendar(userId, accessToken, settings, supabase);

    // Step 2: Export our events to Google Calendar
    const exportResults = await exportToGoogleCalendar(userId, accessToken, settings, supabase);

    // Step 3: Update last sync time
    await supabase
      .from('google_calendar_settings')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', userId);

    await updateSyncOperation(supabase, operationData?.id, 'completed', 
      `Sync completed: imported ${importResults.imported}, exported ${exportResults.exported}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Full bidirectional sync completed successfully',
        imported: importResults.imported,
        exported: exportResults.exported,
        conflicts: importResults.conflicts || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Full sync error:', error);
    await updateSyncOperation(supabase, operationData?.id, 'failed', error.message);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Full bidirectional sync failed'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

export async function performIncrementalSync(userId: string, supabase: any, syncToken?: string) {
  console.log(`Performing incremental sync for user ${userId}`);
  
  const { data: operationData } = await supabase
    .from('sync_operations')
    .insert({
      user_id: userId,
      entity_type: 'incremental_sync',
      entity_id: userId,
      operation_type: 'incremental_sync',
      operation_status: 'pending',
      sync_direction: 'bidirectional',
      sync_type: 'automatic'
    })
    .select('id')
    .single();
  
  try {
    const { data: tokenData, error: tokenError } = await supabase
      .rpc('get_user_google_tokens', { p_user_id: userId });

    if (tokenError || !tokenData || tokenData.length === 0) {
      await updateSyncOperation(supabase, operationData?.id, 'failed', 'No valid Google tokens found');
      throw new Error('No Google tokens found');
    }

    const token = tokenData[0];
    const accessToken = await refreshTokenIfNeeded(token, userId, supabase);
    
    // Get stored sync token
    if (!syncToken) {
      const { data: syncTokenData } = await supabase
        .from('google_sync_tokens')
        .select('sync_token')
        .eq('user_id', userId)
        .eq('calendar_id', 'primary')
        .order('last_used_at', { ascending: false })
        .limit(1)
        .single();
      
      syncToken = syncTokenData?.sync_token;
    }
    
    // Use sync token for efficient incremental updates
    let syncUrl = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
    const params = new URLSearchParams();
    
    if (syncToken) {
      params.append('syncToken', syncToken);
      console.log('Using sync token for incremental sync');
    } else {
      // First sync - get events from last week
      const updatedMin = new Date();
      updatedMin.setDate(updatedMin.getDate() - 7);
      params.append('updatedMin', updatedMin.toISOString());
      params.append('singleEvents', 'true');
      console.log('No sync token found, syncing from last week');
    }
    
    const response = await fetch(`${syncUrl}?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      if (response.status === 410) {
        // Sync token expired - perform full sync
        console.log('Sync token expired, performing full sync');
        await updateSyncOperation(supabase, operationData?.id, 'completed', 'Sync token expired, triggered full sync');
        return await performFullBidirectionalSync(userId, supabase);
      }
      
      const errorText = await response.text();
      await updateSyncOperation(supabase, operationData?.id, 'failed', `Google API error: ${response.status} - ${errorText}`);
      throw new Error(`Google Calendar API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Incremental sync found ${data.items?.length || 0} changed events`);

    const conflicts = [];
    let syncedEvents = 0;

    // Process incremental changes
    for (const event of data.items || []) {
      try {
        if (event.status === 'cancelled') {
          await handleDeletedEvent(userId, event.id, supabase);
        } else {
          const conflict = await processIncrementalEvent(userId, event, supabase);
          if (conflict) conflicts.push(conflict);
          syncedEvents++;
        }
      } catch (eventError) {
        console.error(`Error processing event ${event.id}:`, eventError);
      }
    }

    // Store new sync token if provided
    if (data.nextSyncToken) {
      await supabase
        .from('google_sync_tokens')
        .upsert({
          user_id: userId,
          calendar_id: 'primary',
          sync_token: data.nextSyncToken,
          last_used_at: new Date().toISOString(),
        });
    }

    // Update settings
    await supabase
      .from('google_calendar_settings')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', userId);

    await updateSyncOperation(supabase, operationData?.id, 'completed', 
      `Incremental sync completed: ${syncedEvents} events processed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced_events: syncedEvents,
        conflicts,
        nextSyncToken: data.nextSyncToken,
        message: `Incremental sync completed: ${syncedEvents} events processed`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Incremental sync error:', error);
    await updateSyncOperation(supabase, operationData?.id, 'failed', error.message);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Incremental sync failed'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

export async function resolveConflicts(userId: string, conflictData: any, supabase: any) {
  console.log('Resolving conflicts for user:', userId, conflictData);
  
  try {
    const { conflict_id, resolution_type, resolved_data } = conflictData;

    // Get the conflict record
    const { data: conflict } = await supabase
      .from('sync_conflicts')
      .select('*')
      .eq('id', conflict_id)
      .eq('user_id', userId)
      .single();

    if (!conflict) {
      throw new Error('Conflict not found');
    }

    let finalData;
    
    switch (resolution_type) {
      case 'prefer_local':
        finalData = conflict.local_data;
        await updateGoogleEventFromLocal(conflict, supabase);
        break;
        
      case 'prefer_google':
        finalData = conflict.google_data;
        await updateLocalEventFromGoogle(conflict, conflict.google_data, supabase);
        break;
        
      case 'merge':
        finalData = resolved_data;
        await updateBothFromResolvedData(conflict, resolved_data, supabase);
        break;
        
      default:
        throw new Error('Invalid resolution type');
    }

    // Mark conflict as resolved
    await supabase
      .from('sync_conflicts')
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: resolution_type,
        resolution_preference: resolution_type
      })
      .eq('id', conflict_id);

    // Log the resolution for analytics
    await supabase
      .from('sync_operations')
      .insert({
        user_id: userId,
        entity_type: conflict.entity_type,
        entity_id: conflict.entity_id,
        operation_type: 'conflict_resolution',
        operation_status: 'completed',
        sync_direction: 'bidirectional',
        google_event_id: conflict.google_event_id
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Conflict resolved successfully',
        resolution_type,
        final_data: finalData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Conflict resolution error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// ============= IMPORT/EXPORT FUNCTIONS =============

async function importFromGoogleCalendar(userId: string, accessToken: string, settings: any, supabase: any) {
  console.log('Importing from Google Calendar...');
  
  try {
    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 1); // Import last month's events
    const timeMax = new Date();
    timeMax.setMonth(timeMax.getMonth() + 3); // Import next 3 months

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Found ${data.items?.length || 0} events in Google Calendar`);

    let imported = 0;
    const conflicts = [];

    for (const event of data.items || []) {
      try {
        const result = await processGoogleEvent(userId, event, supabase);
        if (result?.conflict) {
          conflicts.push(result.conflict);
        } else if (result?.imported) {
          imported++;
        }
      } catch (eventError) {
        console.error(`Error processing Google event ${event.id}:`, eventError);
      }
    }

    return { imported, conflicts };
  } catch (error) {
    console.error('Import from Google error:', error);
    throw error;
  }
}

async function processGoogleEvent(userId: string, googleEvent: any, supabase: any) {
  try {
    // Skip events we already know about
    const { data: existingMapping } = await supabase
      .from('google_event_mappings')
      .select('*')
      .eq('google_event_id', googleEvent.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingMapping) {
      // Check if Google event was updated
      const googleUpdated = new Date(googleEvent.updated);
      const lastSynced = new Date(existingMapping.last_synced_at);
      
      if (googleUpdated <= lastSynced) {
        return { skipped: true }; // No changes
      }
      
      // Update existing event
      await updateLocalEventFromGoogle(existingMapping, googleEvent, supabase);
      return { updated: true };
    }

    // Skip events created by our app (check description or source)
    if (googleEvent.description?.includes('Aqademiq') || 
        googleEvent.source?.title === 'Aqademiq' ||
        googleEvent.summary?.includes('[Aqademiq]')) {
      return { skipped: true };
    }

    // Create new event in our system
    await createLocalEventFromGoogle(userId, googleEvent, supabase);
    return { imported: true };
  } catch (error) {
    console.error('Process Google event error:', error);
    return { error: error.message };
  }
}

async function exportToGoogleCalendar(userId: string, accessToken: string, settings: any, supabase: any) {
  console.log('Exporting to Google Calendar...');

  let exported = 0;
  const promises = [];

  if (settings.sync_schedule_blocks) {
    promises.push(exportScheduleBlocks(userId, accessToken, supabase));
  }
  
  if (settings.sync_assignments) {
    promises.push(exportAssignments(userId, accessToken, supabase));
  }
  
  if (settings.sync_exams) {
    promises.push(exportExams(userId, accessToken, supabase));
  }

  const results = await Promise.all(promises);
  exported = results.reduce((sum, result) => sum + (result || 0), 0);

  return { exported };
}

// ============= HELPER FUNCTIONS =============

async function refreshTokenIfNeeded(tokenData: any, userId: string, supabase: any): Promise<string> {
  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  // Check if token expires within 5 minutes
  if (expiresAt <= fiveMinutesFromNow) {
    console.log('Token expired or expiring soon, refreshing...');
    
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: tokenData.refresh_token,
          client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Token refresh failed:', errorText);
        throw new Error(`Token refresh failed: ${errorText}`);
      }

      const tokenResponse = await response.json();
      const newExpiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

      // Update token in database
      await supabase.rpc('update_user_google_tokens', {
        p_user_id: userId,
        p_access_token: tokenResponse.access_token,
        p_refresh_token: tokenResponse.refresh_token || tokenData.refresh_token,
        p_expires_at: newExpiresAt.toISOString(),
        p_scope: tokenData.scope
      });

      console.log('Token refreshed successfully');
      return tokenResponse.access_token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw new Error('Failed to refresh Google token - please reconnect your account');
    }
  }

  return tokenData.access_token;
}

async function updateSyncOperation(supabase: any, operationId: string, status: string, message: string) {
  if (!operationId) return;
  
  try {
    await supabase
      .from('sync_operations')
      .update({
        operation_status: status,
        error_message: status === 'failed' ? message : null,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
        last_attempted_at: new Date().toISOString()
      })
      .eq('id', operationId);
  } catch (error) {
    console.error('Error updating sync operation:', error);
  }
}

// Import the incremental sync functions
async function processIncrementalEvent(userId: string, googleEvent: any, supabase: any) {
  try {
    // Check if we have an existing mapping
    const { data: mapping } = await supabase
      .from('google_event_mappings')
      .select('*')
      .eq('google_event_id', googleEvent.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!mapping) {
      // New event from Google - create local copy
      await createLocalEventFromGoogle(userId, googleEvent, supabase);
      return null;
    }

    // Event exists - check for conflicts
    const localEntity = await getLocalEntity(mapping.entity_type, mapping.entity_id, supabase);
    
    if (!localEntity) {
      // Local entity was deleted - remove mapping
      await supabase
        .from('google_event_mappings')
        .delete()
        .eq('id', mapping.id);
      return null;
    }

    // Compare versions to detect conflicts
    const googleUpdated = new Date(googleEvent.updated);
    const localUpdated = new Date(localEntity.updated_at);
    const lastSynced = new Date(mapping.last_synced_at);

    // Check if both have been modified since last sync
    if (googleUpdated > lastSynced && localUpdated > lastSynced) {
      // Conflict detected - both modified independently
      return await createConflictRecord(userId, mapping, localEntity, googleEvent, supabase);
    } else if (googleUpdated > lastSynced) {
      // Only Google modified - update local
      await updateLocalEventFromGoogle(mapping, googleEvent, supabase);
    } else if (localUpdated > lastSynced) {
      // Only local modified - will be handled in export phase
      await supabase
        .from('google_event_mappings')
        .update({
          local_event_updated: localUpdated.toISOString(),
          last_synced_at: new Date().toISOString()
        })
        .eq('id', mapping.id);
    }

    return null;
  } catch (error) {
    console.error('Process incremental event error:', error);
    return null;
  }
}

async function handleDeletedEvent(userId: string, googleEventId: string, supabase: any) {
  try {
    // Find the mapping
    const { data: mapping } = await supabase
      .from('google_event_mappings')
      .select('*')
      .eq('google_event_id', googleEventId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!mapping) return;

    // Check if local entity should be deleted or just unmapped
    const localEntity = await getLocalEntity(mapping.entity_type, mapping.entity_id, supabase);
    
    if (localEntity) {
      // Just remove mapping to preserve local data
      await supabase
        .from('google_event_mappings')
        .delete()
        .eq('id', mapping.id);

      console.log(`Unmapped deleted Google event ${googleEventId} from local ${mapping.entity_type}`);
    }
  } catch (error) {
    console.error('Handle deleted event error:', error);
  }
}

async function createConflictRecord(userId: string, mapping: any, localEntity: any, googleEvent: any, supabase: any) {
  try {
    const conflict = {
      user_id: userId,
      entity_type: mapping.entity_type,
      entity_id: mapping.entity_id,
      google_event_id: googleEvent.id,
      conflict_type: 'content_modified',
      local_data: localEntity,
      google_data: googleEvent,
    };

    const { data: conflictRecord, error } = await supabase
      .from('sync_conflicts')
      .insert(conflict)
      .select()
      .single();

    if (error) throw error;

    // Log conflict for monitoring
    await supabase
      .from('sync_operations')
      .insert({
        user_id: userId,
        entity_type: mapping.entity_type,
        entity_id: mapping.entity_id,
        operation_type: 'conflict_detection',
        operation_status: 'pending',
        sync_direction: 'bidirectional',
        google_event_id: googleEvent.id,
        conflict_data: { conflict_id: conflictRecord.id }
      });

    console.log(`Created conflict record for ${mapping.entity_type} ${mapping.entity_id}`);
    return conflictRecord;
  } catch (error) {
    console.error('Create conflict record error:', error);
    return null;
  }
}

async function getLocalEntity(entityType: string, entityId: string, supabase: any) {
  try {
    const { data, error } = await supabase
      .from(entityType === 'schedule_block' ? 'schedule_blocks' : 
           entityType === 'assignment' ? 'assignments' : 
           entityType === 'exam' ? 'exams' : entityType)
      .select('*')
      .eq('id', entityId)
      .maybeSingle();

    return error ? null : data;
  } catch (error) {
    console.error('Get local entity error:', error);
    return null;
  }
}

async function updateLocalEventFromGoogle(mapping: any, googleEvent: any, supabase: any) {
  try {
    const entityType = mapping.entity_type;
    const entityId = mapping.entity_id;

    let updateData: any = {};

    // Map Google event fields to local entity fields
    switch (entityType) {
      case 'schedule_block':
        updateData = {
          title: googleEvent.summary || 'Imported Event',
          description: googleEvent.description || null,
          location: googleEvent.location || null,
          updated_at: new Date().toISOString()
        };
        
        if (googleEvent.start?.dateTime) {
          // Extract local time directly from ISO string to preserve timezone
          const startLocal = extractLocalTimeFromISO(googleEvent.start.dateTime);
          const endLocal = extractLocalTimeFromISO(googleEvent.end.dateTime);
          updateData.start_time = startLocal.time;
          updateData.end_time = endLocal.time;
          updateData.specific_date = startLocal.date;
        }
        break;

      case 'assignment':
        updateData = {
          title: googleEvent.summary || 'Imported Assignment',
          description: googleEvent.description || null,
          updated_at: new Date().toISOString()
        };
        
        if (googleEvent.start?.dateTime) {
          updateData.due_date = googleEvent.start.dateTime;
        }
        break;

      case 'exam':
        updateData = {
          title: googleEvent.summary || 'Imported Exam',
          location: googleEvent.location || null,
          notes: googleEvent.description || null,
          updated_at: new Date().toISOString()
        };
        
        if (googleEvent.start?.dateTime) {
          updateData.exam_date = googleEvent.start.dateTime;
        }
        
        if (googleEvent.end?.dateTime && googleEvent.start?.dateTime) {
          const duration = new Date(googleEvent.end.dateTime).getTime() - new Date(googleEvent.start.dateTime).getTime();
          updateData.duration_minutes = Math.round(duration / (1000 * 60));
        }
        break;
    }

    // Update the local entity
    await supabase
      .from(entityType === 'schedule_block' ? 'schedule_blocks' : 
           entityType === 'assignment' ? 'assignments' : 
           entityType === 'exam' ? 'exams' : entityType)
      .update(updateData)
      .eq('id', entityId);

    // Update mapping
    await supabase
      .from('google_event_mappings')
      .update({
        google_event_updated: new Date(googleEvent.updated).toISOString(),
        last_synced_at: new Date().toISOString(),
        sync_hash: await generateSyncHash(entityType, googleEvent)
      })
      .eq('id', mapping.id);

    console.log(`Updated local ${entityType} from Google event: ${googleEvent.summary}`);
  } catch (error) {
    console.error('Update local from Google error:', error);
    throw error;
  }
}

// Helper to extract local time from ISO datetime string (preserves timezone)
function extractLocalTimeFromISO(isoString: string): { time: string; date: string } {
  // ISO format: "2025-12-14T06:00:00+04:00" or "2025-12-14T06:00:00Z"
  // Extract the time portion directly without timezone conversion
  const match = isoString.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/);
  if (match) {
    return { date: match[1], time: match[2] };
  }
  // Fallback for date-only format "2025-12-14"
  if (isoString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return { date: isoString, time: '00:00:00' };
  }
  // Final fallback using Date object (may have timezone issues)
  const d = new Date(isoString);
  return {
    date: d.toISOString().slice(0, 10),
    time: d.toTimeString().slice(0, 8)
  };
}

// Helper to extract timezone from ISO string
function extractTimezoneFromISO(isoString: string): string | null {
  // Match timezone offset like +04:00, -05:00, or Z
  const match = isoString.match(/([+-]\d{2}:\d{2}|Z)$/);
  return match ? match[1] : null;
}

async function createLocalEventFromGoogle(userId: string, googleEvent: any, supabase: any) {
  const startTime = googleEvent.start?.dateTime || googleEvent.start?.date;
  const endTime = googleEvent.end?.dateTime || googleEvent.end?.date;
  
  if (!startTime || !endTime) return;

  // Extract local time directly from ISO string to preserve original timezone
  const startLocal = extractLocalTimeFromISO(startTime);
  const endLocal = extractLocalTimeFromISO(endTime);
  
  // For duration calculation, we still need Date objects
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  
  // Determine event type based on title/description
  const title = googleEvent.summary || 'Imported Event';
  const description = googleEvent.description || '';
  
  let entityType = 'schedule_block';
  let entityId: string;

  if (title.toLowerCase().includes('exam') || title.toLowerCase().includes('test')) {
    // Create as exam - store the original datetime with timezone preserved
    const { data: exam, error } = await supabase
      .from('exams')
      .insert({
        user_id: userId,
        course_id: null, // No course mapping for imported events
        title,
        exam_date: startTime, // Keep original ISO string with timezone
        duration_minutes: Math.round((endDate.getTime() - startDate.getTime()) / 60000),
        location: googleEvent.location,
        notes: `Imported from Google Calendar: ${description}`,
      })
      .select('id')
      .single();
    
    if (error) throw error;
    entityType = 'exam';
    entityId = exam.id;
  } else if (title.toLowerCase().includes('assignment') || title.toLowerCase().includes('homework')) {
    // Create as assignment
    const { data: assignment, error } = await supabase
      .from('assignments')
      .insert({
        user_id: userId,
        course_id: null,
        title,
        due_date: startTime, // Keep original ISO string with timezone
        description: `Imported from Google Calendar: ${description}`,
        assignment_type: 'homework',
      })
      .select('id')
      .single();
    
    if (error) throw error;
    entityType = 'assignment';
    entityId = assignment.id;
  } else {
    // Create as schedule block - extract local time to store separately
    const dayOfWeek = startDate.getDay();
    const { data: scheduleBlock, error } = await supabase
      .from('schedule_blocks')
      .insert({
        user_id: userId,
        course_id: null,
        title,
        description: `Imported from Google Calendar: ${description}`,
        start_time: startLocal.time, // Local time extracted from ISO
        end_time: endLocal.time, // Local time extracted from ISO
        day_of_week: dayOfWeek,
        specific_date: startLocal.date, // Local date extracted from ISO
        is_recurring: false,
        location: googleEvent.location,
      })
      .select('id')
      .single();
    
    if (error) throw error;
    entityType = 'schedule_block';
    entityId = scheduleBlock.id;
  }

  // Create mapping
  await supabase
    .from('google_event_mappings')
    .insert({
      user_id: userId,
      entity_type: entityType,
      entity_id: entityId,
      google_event_id: googleEvent.id,
      google_event_updated: new Date(googleEvent.updated).toISOString(),
      sync_hash: await generateSyncHash(entityType, googleEvent),
    });

  console.log(`Created ${entityType} from Google event: ${title}`);
}

async function exportScheduleBlocks(userId: string, accessToken: string, supabase: any) {
  // Get schedule blocks not yet synced to Google
  const { data: scheduleBlocks } = await supabase
    .from('schedule_blocks')
    .select('*, courses(name, color)')
    .eq('user_id', userId)
    .eq('is_active', true);

  let exported = 0;

  for (const block of scheduleBlocks || []) {
    // Check if already mapped
    const { data: mapping } = await supabase
      .from('google_event_mappings')
      .select('id')
      .eq('user_id', userId)
      .eq('entity_type', 'schedule_block')
      .eq('entity_id', block.id)
      .maybeSingle();

    if (!mapping) {
      await createGoogleEventFromScheduleBlock(block, accessToken, userId, supabase);
      exported++;
    }
  }

  return exported;
}

async function exportAssignments(userId: string, accessToken: string, supabase: any) {
  const { data: assignments } = await supabase
    .from('assignments')
    .select('*, courses(name, color)')
    .eq('user_id', userId);

  let exported = 0;

  for (const assignment of assignments || []) {
    const { data: mapping } = await supabase
      .from('google_event_mappings')
      .select('id')
      .eq('user_id', userId)
      .eq('entity_type', 'assignment')
      .eq('entity_id', assignment.id)
      .maybeSingle();

    if (!mapping) {
      await createGoogleEventFromAssignment(assignment, accessToken, userId, supabase);
      exported++;
    }
  }

  return exported;
}

async function exportExams(userId: string, accessToken: string, supabase: any) {
  const { data: exams } = await supabase
    .from('exams')
    .select('*, courses(name, color)')
    .eq('user_id', userId);

  let exported = 0;

  for (const exam of exams || []) {
    const { data: mapping } = await supabase
      .from('google_event_mappings')
      .select('id')
      .eq('user_id', userId)
      .eq('entity_type', 'exam')
      .eq('entity_id', exam.id)
      .maybeSingle();

    if (!mapping) {
      await createGoogleEventFromExam(exam, accessToken, userId, supabase);
      exported++;
    }
  }

  return exported;
}

async function createGoogleEventFromScheduleBlock(block: any, accessToken: string, userId: string, supabase: any) {
  // Get user's timezone from profile, fallback to UTC
  const userTimezone = await getUserTimezone(userId, supabase);
  
  // Construct local datetime string (without timezone conversion)
  const startDateTime = `${block.specific_date || '2024-01-01'}T${block.start_time}`;
  const endDateTime = `${block.specific_date || '2024-01-01'}T${block.end_time}`;
  
  const eventData = {
    summary: `[Aqademiq] ${block.title}`,
    description: `Academic schedule block from Aqademiq\n\n${block.description || ''}`,
    location: block.location,
    start: {
      dateTime: startDateTime, // Local time without Z suffix
      timeZone: userTimezone, // User's timezone
    },
    end: {
      dateTime: endDateTime, // Local time without Z suffix  
      timeZone: userTimezone, // User's timezone
    },
    colorId: getGoogleColorId(block.courses?.color),
  };

  await createGoogleEvent(eventData, accessToken, userId, 'schedule_block', block.id, supabase);
}

async function createGoogleEventFromAssignment(assignment: any, accessToken: string, userId: string, supabase: any) {
  // Get user's timezone from profile
  const userTimezone = await getUserTimezone(userId, supabase);
  
  // Extract local datetime from the stored due_date
  const dueLocal = extractLocalTimeFromISO(assignment.due_date);
  const dueDate = new Date(assignment.due_date);
  const startDate = new Date(dueDate.getTime() - (assignment.estimated_hours || 2) * 60 * 60 * 1000);
  const startLocal = extractLocalTimeFromISO(startDate.toISOString());

  const eventData = {
    summary: `[Aqademiq] Assignment: ${assignment.title}`,
    description: `Assignment from Aqademiq\n\nDue: ${dueLocal.date} ${dueLocal.time}\nEstimated Hours: ${assignment.estimated_hours || 2}\n\n${assignment.description || ''}`,
    start: {
      dateTime: `${startLocal.date}T${startLocal.time}`,
      timeZone: userTimezone,
    },
    end: {
      dateTime: `${dueLocal.date}T${dueLocal.time}`,
      timeZone: userTimezone,
    },
    colorId: getGoogleColorId(assignment.courses?.color),
  };

  await createGoogleEvent(eventData, accessToken, userId, 'assignment', assignment.id, supabase);
}

async function createGoogleEventFromExam(exam: any, accessToken: string, userId: string, supabase: any) {
  // Get user's timezone from profile
  const userTimezone = await getUserTimezone(userId, supabase);
  
  // Extract local datetime from the stored exam_date
  const examLocal = extractLocalTimeFromISO(exam.exam_date);
  const examDate = new Date(exam.exam_date);
  const endDate = new Date(examDate.getTime() + (exam.duration_minutes || 60) * 60 * 1000);
  const endLocal = extractLocalTimeFromISO(endDate.toISOString());

  const eventData = {
    summary: `[Aqademiq] Exam: ${exam.title}`,
    description: `Exam from Aqademiq\n\nDuration: ${exam.duration_minutes || 60} minutes\nLocation: ${exam.location || 'TBD'}\n\n${exam.notes || ''}`,
    location: exam.location,
    start: {
      dateTime: `${examLocal.date}T${examLocal.time}`,
      timeZone: userTimezone,
    },
    end: {
      dateTime: `${endLocal.date}T${endLocal.time}`,
      timeZone: userTimezone,
    },
    colorId: getGoogleColorId(exam.courses?.color),
  };

  await createGoogleEvent(eventData, accessToken, userId, 'exam', exam.id, supabase);
}

async function createGoogleEvent(eventData: any, accessToken: string, userId: string, entityType: string, entityId: string, supabase: any) {
  try {
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create Google Calendar event: ${errorText}`);
    }

    const createdEvent = await response.json();

    // Create mapping in database
    await supabase
      .from('google_event_mappings')
      .insert({
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        google_event_id: createdEvent.id,
        google_event_updated: new Date(createdEvent.updated).toISOString(),
        sync_hash: await generateSyncHash(entityType, createdEvent),
      });

    console.log(`Created Google Calendar event for ${entityType} ${entityId}: ${createdEvent.id}`);
  } catch (error) {
    console.error(`Error creating Google event for ${entityType} ${entityId}:`, error);
    throw error;
  }
}

// Helper to get user's timezone from profile
async function getUserTimezone(userId: string, supabase: any): Promise<string> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('timezone')
      .eq('user_id', userId)
      .single();
    
    return profile?.timezone || 'UTC';
  } catch (error) {
    console.error('Error fetching user timezone:', error);
    return 'UTC';
  }
}

function getGoogleColorId(courseColor?: string): string {
  const colorMap: { [key: string]: string } = {
    'red': '11',
    'orange': '6',
    'yellow': '5',
    'green': '10',
    'blue': '9',
    'purple': '3',
    'pink': '4',
    'gray': '8',
    'grey': '8',
  };
  
  return colorMap[courseColor?.toLowerCase() || 'blue'] || '9';
}

async function generateSyncHash(entityType: string, data: any): Promise<string> {
  const hashData = `${entityType}-${JSON.stringify(data)}-${Date.now()}`;
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(hashData);
  
  // Use crypto.subtle for proper hashing that supports Unicode
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.slice(0, 32);
}

// Additional helper functions for conflict resolution
async function updateGoogleEventFromLocal(conflict: any, supabase: any) {
  console.log('Updating Google event from local data:', conflict.entity_id);
  // Implementation would involve calling Google Calendar API to update the event
  // This is a placeholder for the actual implementation
}

async function updateBothFromResolvedData(conflict: any, resolvedData: any, supabase: any) {
  console.log('Updating both systems from resolved data:', conflict.entity_id);
  
  // Update local entity
  const tableName = conflict.entity_type === 'schedule_block' ? 'schedule_blocks' : 
                   conflict.entity_type === 'assignment' ? 'assignments' : 
                   conflict.entity_type === 'exam' ? 'exams' : conflict.entity_type;

  await supabase
    .from(tableName)
    .update({
      ...resolvedData,
      updated_at: new Date().toISOString()
    })
    .eq('id', conflict.entity_id);
  
  // Update Google event
  await updateGoogleEventFromLocal(conflict, supabase);
}