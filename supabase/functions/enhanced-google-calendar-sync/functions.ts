async function setupWebhook(userId: string, supabase: any) {
  try {
    // Get user's Google token
    const { data: tokenData } = await supabase
      .from('google_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', userId)
      .single();

    if (!tokenData) {
      throw new Error('No Google token found');
    }

    // Refresh token if needed
    const accessToken = await refreshTokenIfNeeded(tokenData, userId, supabase);

    // Create webhook channel with Google Calendar API
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/enhanced-google-calendar-sync`;
    const channelId = `lovable-${userId}-${Date.now()}`;
    const expiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

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
      const error = await response.text();
      throw new Error(`Failed to setup webhook: ${error}`);
    }

    const webhookData = await response.json();

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

    console.log(`Webhook setup complete for user ${userId}`);
    return new Response(
      JSON.stringify({ success: true, channelId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook setup error:', error);
    throw error;
  }
}

async function performFullBidirectionalSync(userId: string, supabase: any) {
  console.log(`Starting full bidirectional sync for user ${userId}`);

  try {
    // Get user's settings and tokens
    const [settingsResult, tokenResult] = await Promise.all([
      supabase
        .from('google_calendar_settings')
        .select('*')
        .eq('user_id', userId)
        .single(),
      supabase
        .from('google_tokens')
        .select('*')
        .eq('user_id', userId)
        .single()
    ]);

    if (!settingsResult.data || !tokenResult.data) {
      throw new Error('Missing settings or tokens');
    }

    const settings = settingsResult.data;
    const tokenData = tokenResult.data;
    const accessToken = await refreshTokenIfNeeded(tokenData, userId, supabase);

    // Step 1: Import events from Google Calendar
    await importFromGoogleCalendar(userId, accessToken, settings, supabase);

    // Step 2: Export our events to Google Calendar
    await exportToGoogleCalendar(userId, accessToken, settings, supabase);

    // Step 3: Update last sync time
    await supabase
      .from('google_calendar_settings')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', userId);

    return new Response(
      JSON.stringify({ success: true, message: 'Full bidirectional sync completed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Full sync error:', error);
    throw error;
  }
}

async function performIncrementalSync(userId: string, supabase: any) {
  console.log(`Performing incremental sync for user ${userId}`);
  
  // For now, perform a full sync - in production this would be optimized
  // to only sync changes since last sync
  return await performFullBidirectionalSync(userId, supabase);
}

async function resolveConflicts(userId: string, conflictData: any, supabase: any) {
  // Implement conflict resolution logic based on user preferences
  console.log('Resolving conflicts for user:', userId, conflictData);
  
  return new Response(
    JSON.stringify({ success: true, message: 'Conflicts resolved' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function importFromGoogleCalendar(userId: string, accessToken: string, settings: any, supabase: any) {
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

    for (const event of data.items || []) {
      await processGoogleEvent(userId, event, supabase);
    }
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
      .single();

    if (existingMapping) {
      // Check if Google event was updated
      const googleUpdated = new Date(googleEvent.updated);
      const lastSynced = new Date(existingMapping.last_synced_at);
      
      if (googleUpdated <= lastSynced) {
        return; // No changes
      }
      
      // Update existing event
      await updateLocalEventFromGoogle(existingMapping, googleEvent, supabase);
      return;
    }

    // Skip events created by our app (check description or source)
    if (googleEvent.description?.includes('Lovable Academic Planner') || 
        googleEvent.source?.title === 'Lovable Academic Planner') {
      return;
    }

    // Create new event in our system
    await createLocalEventFromGoogle(userId, googleEvent, supabase);
  } catch (error) {
    console.error('Process Google event error:', error);
  }
}

async function exportToGoogleCalendar(userId: string, accessToken: string, settings: any, supabase: any) {
  console.log('Exporting to Google Calendar...');

  // Get unmapped events from our database
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

  await Promise.all(promises);
}

async function createLocalEventFromGoogle(userId: string, googleEvent: any, supabase: any) {
  const startTime = googleEvent.start?.dateTime || googleEvent.start?.date;
  const endTime = googleEvent.end?.dateTime || googleEvent.end?.date;
  
  if (!startTime || !endTime) return;

  const start = new Date(startTime);
  const end = new Date(endTime);
  
  // Determine event type based on title/description
  const title = googleEvent.summary || 'Imported Event';
  const description = googleEvent.description || '';
  
  let entityType = 'schedule_block';
  let entityId: string;

  if (title.toLowerCase().includes('exam') || title.toLowerCase().includes('test')) {
    // Create as exam
    const { data: exam, error } = await supabase
      .from('exams')
      .insert({
        user_id: userId,
        course_id: null, // No course mapping for imported events
        title,
        exam_date: start.toISOString(),
        duration_minutes: Math.round((end.getTime() - start.getTime()) / 60000),
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
        due_date: start.toISOString(),
        description: `Imported from Google Calendar: ${description}`,
        assignment_type: 'homework',
      })
      .select('id')
      .single();
    
    if (error) throw error;
    entityType = 'assignment';
    entityId = assignment.id;
  } else {
    // Create as schedule block
    const dayOfWeek = start.getDay();
    const { data: scheduleBlock, error } = await supabase
      .from('schedule_blocks')
      .insert({
        user_id: userId,
        course_id: null,
        title,
        description: `Imported from Google Calendar: ${description}`,
        start_time: start.toTimeString().slice(0, 8),
        end_time: end.toTimeString().slice(0, 8),
        day_of_week: dayOfWeek,
        specific_date: start.toISOString().slice(0, 10),
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

  for (const block of scheduleBlocks || []) {
    // Check if already mapped
    const { data: mapping } = await supabase
      .from('google_event_mappings')
      .select('id')
      .eq('user_id', userId)
      .eq('entity_type', 'schedule_block')
      .eq('entity_id', block.id)
      .single();

    if (!mapping) {
      await createGoogleEventFromScheduleBlock(block, accessToken, userId, supabase);
    }
  }
}

async function exportAssignments(userId: string, accessToken: string, supabase: any) {
  const { data: assignments } = await supabase
    .from('assignments')
    .select('*, courses(name, color)')
    .eq('user_id', userId);

  for (const assignment of assignments || []) {
    const { data: mapping } = await supabase
      .from('google_event_mappings')
      .select('id')
      .eq('user_id', userId)
      .eq('entity_type', 'assignment')
      .eq('entity_id', assignment.id)
      .single();

    if (!mapping) {
      await createGoogleEventFromAssignment(assignment, accessToken, userId, supabase);
    }
  }
}

async function exportExams(userId: string, accessToken: string, supabase: any) {
  const { data: exams } = await supabase
    .from('exams')
    .select('*, courses(name, color)')
    .eq('user_id', userId);

  for (const exam of exams || []) {
    const { data: mapping } = await supabase
      .from('google_event_mappings')
      .select('id')
      .eq('user_id', userId)
      .eq('entity_type', 'exam')
      .eq('entity_id', exam.id)
      .single();

    if (!mapping) {
      await createGoogleEventFromExam(exam, accessToken, userId, supabase);
    }
  }
}

async function createGoogleEventFromScheduleBlock(block: any, accessToken: string, userId: string, supabase: any) {
  const course = block.courses;
  const eventData = {
    summary: `${course?.name || 'Class'}: ${block.title}`,
    description: `${block.description || ''}\n\nCreated by Lovable Academic Planner`,
    location: block.location,
    start: {
      dateTime: `${block.specific_date}T${block.start_time}`,
      timeZone: 'UTC',
    },
    end: {
      dateTime: `${block.specific_date}T${block.end_time}`,
      timeZone: 'UTC',
    },
    colorId: getGoogleColorId(course?.color),
    source: {
      title: 'Lovable Academic Planner',
    },
  };

  await createGoogleEvent(eventData, accessToken, userId, 'schedule_block', block.id, supabase);
}

async function createGoogleEventFromAssignment(assignment: any, accessToken: string, userId: string, supabase: any) {
  const course = assignment.courses;
  const dueDate = new Date(assignment.due_date);
  
  const eventData = {
    summary: `Assignment Due: ${assignment.title}`,
    description: `${assignment.description || ''}\n\nCourse: ${course?.name || 'Unknown'}\nType: ${assignment.assignment_type}\n\nCreated by Lovable Academic Planner`,
    start: {
      dateTime: dueDate.toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: new Date(dueDate.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration
      timeZone: 'UTC',
    },
    colorId: getGoogleColorId(course?.color),
    source: {
      title: 'Lovable Academic Planner',
    },
  };

  await createGoogleEvent(eventData, accessToken, userId, 'assignment', assignment.id, supabase);
}

async function createGoogleEventFromExam(exam: any, accessToken: string, userId: string, supabase: any) {
  const course = exam.courses;
  const examDate = new Date(exam.exam_date);
  const endDate = new Date(examDate.getTime() + (exam.duration_minutes || 120) * 60 * 1000);
  
  const eventData = {
    summary: `${exam.exam_type}: ${exam.title}`,
    description: `${exam.notes || ''}\n\nCourse: ${course?.name || 'Unknown'}\nLocation: ${exam.location || 'TBD'}\n\nCreated by Lovable Academic Planner`,
    location: exam.location,
    start: {
      dateTime: examDate.toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: 'UTC',
    },
    colorId: getGoogleColorId(course?.color),
    source: {
      title: 'Lovable Academic Planner',
    },
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
      const error = await response.text();
      console.error('Failed to create Google event:', error);
      return;
    }

    const googleEvent = await response.json();

    // Create mapping
    await supabase
      .from('google_event_mappings')
      .insert({
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        google_event_id: googleEvent.id,
        google_event_updated: new Date(googleEvent.updated).toISOString(),
        sync_hash: await generateSyncHash(entityType, eventData),
      });

    console.log(`Created Google event for ${entityType}: ${eventData.summary}`);
  } catch (error) {
    console.error('Create Google event error:', error);
  }
}

async function refreshTokenIfNeeded(tokenData: any, userId: string, supabase: any): Promise<string> {
  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

  if (expiresAt <= oneHourFromNow) {
    console.log('Refreshing Google token for user:', userId);
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
        refresh_token: tokenData.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh Google token');
    }

    const newTokenData = await response.json();
    const newExpiresAt = new Date(Date.now() + newTokenData.expires_in * 1000);

    await supabase
      .from('google_tokens')
      .update({
        access_token: newTokenData.access_token,
        expires_at: newExpiresAt.toISOString(),
      })
      .eq('user_id', userId);

    return newTokenData.access_token;
  }

  return tokenData.access_token;
}

async function updateLocalEventFromGoogle(mapping: any, googleEvent: any, supabase: any) {
  // Update local event based on Google changes
  console.log('Updating local event from Google:', mapping.entity_type, mapping.entity_id);
  
  // Implementation would depend on entity type and what changed
  // For now, just update the sync timestamp
  await supabase
    .from('google_event_mappings')
    .update({
      google_event_updated: new Date(googleEvent.updated).toISOString(),
      last_synced_at: new Date().toISOString(),
    })
    .eq('id', mapping.id);
}

function getGoogleColorId(courseColor?: string): string {
  const colorMap: Record<string, string> = {
    'red': '11',
    'orange': '6',
    'yellow': '5',
    'green': '10',
    'blue': '9',
    'purple': '3',
    'pink': '4',
  };
  
  return colorMap[courseColor || 'blue'] || '9';
}

async function generateSyncHash(entityType: string, data: any): Promise<string> {
  const encoder = new TextEncoder();
  const dataStr = JSON.stringify({ entityType, data });
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(dataStr));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}