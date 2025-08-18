import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

interface SyncRequest {
  action: 'sync-schedule' | 'sync-assignments' | 'sync-exams' | 'manual-sync';
  userId: string;
  scheduleData?: any;
  itemIds?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, userId, scheduleData, itemIds }: SyncRequest = await req.json();
    
    console.log('Enhanced Google Calendar sync invoked:', { action, userId });

    // Get user's Google Calendar settings and token
    const { data: googleToken, error: tokenError } = await supabase
      .from('google_tokens')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (tokenError || !googleToken) {
      throw new Error('Google Calendar not connected. Please connect your Google account first.');
    }

    // Check token expiration and refresh if needed
    const now = new Date();
    const expiresAt = new Date(googleToken.expires_at);
    let accessToken = googleToken.access_token;

    if (now >= expiresAt && googleToken.refresh_token) {
      console.log('Refreshing Google access token...');
      accessToken = await refreshGoogleToken(googleToken.refresh_token, userId);
    }

    // Get user's Google Calendar settings
    const { data: calendarSettings } = await supabase
      .from('google_calendar_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!calendarSettings?.sync_enabled) {
      throw new Error('Google Calendar sync is disabled in settings');
    }

    let syncResults = { success: true, synced: 0, errors: [], details: {} };

    switch (action) {
      case 'sync-schedule':
        syncResults = await syncScheduleToGoogle(scheduleData, accessToken, calendarSettings);
        break;
      case 'sync-assignments':
        syncResults = await syncAssignmentsToGoogle(userId, accessToken, calendarSettings, itemIds);
        break;
      case 'sync-exams':
        syncResults = await syncExamsToGoogle(userId, accessToken, calendarSettings, itemIds);
        break;
      case 'manual-sync':
        syncResults = await performFullSync(userId, accessToken, calendarSettings);
        break;
      default:
        throw new Error(`Unknown sync action: ${action}`);
    }

    // Update last sync timestamp
    await supabase
      .from('google_calendar_settings')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', userId);

    return new Response(JSON.stringify({
      success: true,
      message: 'Google Calendar sync completed successfully',
      results: syncResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Enhanced Google Calendar sync error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function refreshGoogleToken(refreshToken: string, userId: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: googleClientId!,
      client_secret: googleClientSecret!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Google token');
  }

  const data = await response.json();
  
  // Update token in database
  await supabase
    .from('google_tokens')
    .update({
      access_token: data.access_token,
      expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  return data.access_token;
}

async function syncScheduleToGoogle(scheduleData: any, accessToken: string, settings: any): Promise<any> {
  const results = { success: true, synced: 0, errors: [], details: { classes: 0, assignments: 0, exams: 0 } };

  try {
    // Sync classes/schedule blocks
    if (settings.sync_schedule_blocks && scheduleData.classes) {
      for (const classItem of scheduleData.classes) {
        try {
          await createGoogleCalendarEvent(accessToken, {
            summary: `${classItem.title} (${classItem.course_code})`,
            description: `Course: ${classItem.course_code}\nLocation: ${classItem.location}`,
            location: classItem.location,
            start: {
              dateTime: calculateNextClassDateTime(classItem),
              timeZone: 'UTC'
            },
            end: {
              dateTime: calculateNextClassEndDateTime(classItem),
              timeZone: 'UTC'
            },
            recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${getDayAbbreviation(classItem.day_of_week)}`],
            colorId: '4' // Blue for classes
          });
          results.details.classes++;
          results.synced++;
        } catch (error) {
          results.errors.push(`Class ${classItem.title}: ${error.message}`);
        }
      }
    }

    // Sync assignments
    if (settings.sync_assignments && scheduleData.assignments) {
      for (const assignment of scheduleData.assignments) {
        try {
          await createGoogleCalendarEvent(accessToken, {
            summary: `📝 ${assignment.title} Due`,
            description: `Assignment: ${assignment.title}\nCourse: ${assignment.course_code}\nType: ${assignment.type}\n\nDescription: ${assignment.description}`,
            start: {
              dateTime: assignment.due_date,
              timeZone: 'UTC'
            },
            end: {
              dateTime: new Date(new Date(assignment.due_date).getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration
              timeZone: 'UTC'
            },
            colorId: '6' // Orange for assignments
          });
          results.details.assignments++;
          results.synced++;
        } catch (error) {
          results.errors.push(`Assignment ${assignment.title}: ${error.message}`);
        }
      }
    }

    // Sync exams
    if (settings.sync_exams && scheduleData.exams) {
      for (const exam of scheduleData.exams) {
        try {
          await createGoogleCalendarEvent(accessToken, {
            summary: `📖 ${exam.title} Exam`,
            description: `Exam: ${exam.title}\nCourse: ${exam.course_code}\nDuration: ${exam.duration_minutes} minutes\nLocation: ${exam.location}\n\nNotes: ${exam.notes}`,
            location: exam.location,
            start: {
              dateTime: exam.date,
              timeZone: 'UTC'
            },
            end: {
              dateTime: new Date(new Date(exam.date).getTime() + exam.duration_minutes * 60 * 1000).toISOString(),
              timeZone: 'UTC'
            },
            colorId: '11' // Red for exams
          });
          results.details.exams++;
          results.synced++;
        } catch (error) {
          results.errors.push(`Exam ${exam.title}: ${error.message}`);
        }
      }
    }

  } catch (error) {
    results.success = false;
    results.errors.push(`General sync error: ${error.message}`);
  }

  return results;
}

async function syncAssignmentsToGoogle(userId: string, accessToken: string, settings: any, itemIds?: string[]): Promise<any> {
  const results = { success: true, synced: 0, errors: [], details: { assignments: 0 } };

  if (!settings.sync_assignments) {
    return results;
  }

  try {
    let query = supabase
      .from('assignments')
      .select('*')
      .eq('user_id', userId);

    if (itemIds && itemIds.length > 0) {
      query = query.in('id', itemIds);
    }

    const { data: assignments, error } = await query;

    if (error) throw error;

    for (const assignment of assignments || []) {
      try {
        await createGoogleCalendarEvent(accessToken, {
          summary: `📝 ${assignment.title} Due`,
          description: `Assignment: ${assignment.title}\nType: ${assignment.assignment_type}\n\nDescription: ${assignment.description}`,
          start: {
            dateTime: assignment.due_date,
            timeZone: 'UTC'
          },
          end: {
            dateTime: new Date(new Date(assignment.due_date).getTime() + 60 * 60 * 1000).toISOString(),
            timeZone: 'UTC'
          },
          colorId: '6'
        });
        results.details.assignments++;
        results.synced++;
      } catch (error) {
        results.errors.push(`Assignment ${assignment.title}: ${error.message}`);
      }
    }
  } catch (error) {
    results.success = false;
    results.errors.push(`Assignments sync error: ${error.message}`);
  }

  return results;
}

async function syncExamsToGoogle(userId: string, accessToken: string, settings: any, itemIds?: string[]): Promise<any> {
  const results = { success: true, synced: 0, errors: [], details: { exams: 0 } };

  if (!settings.sync_exams) {
    return results;
  }

  try {
    let query = supabase
      .from('exams')
      .select('*')
      .eq('user_id', userId);

    if (itemIds && itemIds.length > 0) {
      query = query.in('id', itemIds);
    }

    const { data: exams, error } = await query;

    if (error) throw error;

    for (const exam of exams || []) {
      try {
        await createGoogleCalendarEvent(accessToken, {
          summary: `📖 ${exam.title} Exam`,
          description: `Exam: ${exam.title}\nDuration: ${exam.duration_minutes} minutes\nLocation: ${exam.location}\n\nNotes: ${exam.notes}`,
          location: exam.location,
          start: {
            dateTime: exam.exam_date,
            timeZone: 'UTC'
          },
          end: {
            dateTime: new Date(new Date(exam.exam_date).getTime() + exam.duration_minutes * 60 * 1000).toISOString(),
            timeZone: 'UTC'
          },
          colorId: '11'
        });
        results.details.exams++;
        results.synced++;
      } catch (error) {
        results.errors.push(`Exam ${exam.title}: ${error.message}`);
      }
    }
  } catch (error) {
    results.success = false;
    results.errors.push(`Exams sync error: ${error.message}`);
  }

  return results;
}

async function performFullSync(userId: string, accessToken: string, settings: any): Promise<any> {
  const results = { success: true, synced: 0, errors: [], details: { classes: 0, assignments: 0, exams: 0 } };

  try {
    // Sync schedule blocks
    if (settings.sync_schedule_blocks) {
      const { data: scheduleBlocks } = await supabase
        .from('schedule_blocks')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      for (const block of scheduleBlocks || []) {
        try {
          await createGoogleCalendarEvent(accessToken, {
            summary: block.title,
            description: `Location: ${block.location}`,
            location: block.location,
            start: {
              dateTime: calculateNextClassDateTime(block),
              timeZone: 'UTC'
            },
            end: {
              dateTime: calculateNextClassEndDateTime(block),
              timeZone: 'UTC'
            },
            recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${getDayAbbreviation(block.day_of_week)}`],
            colorId: '4'
          });
          results.details.classes++;
          results.synced++;
        } catch (error) {
          results.errors.push(`Schedule block ${block.title}: ${error.message}`);
        }
      }
    }

    // Sync assignments
    const assignmentResults = await syncAssignmentsToGoogle(userId, accessToken, settings);
    results.details.assignments = assignmentResults.details.assignments;
    results.synced += assignmentResults.synced;
    results.errors.push(...assignmentResults.errors);

    // Sync exams
    const examResults = await syncExamsToGoogle(userId, accessToken, settings);
    results.details.exams = examResults.details.exams;
    results.synced += examResults.synced;
    results.errors.push(...examResults.errors);

  } catch (error) {
    results.success = false;
    results.errors.push(`Full sync error: ${error.message}`);
  }

  return results;
}

async function createGoogleCalendarEvent(accessToken: string, eventData: any): Promise<any> {
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
    throw new Error(`Google Calendar API error: ${response.status} - ${error}`);
  }

  return await response.json();
}

function calculateNextClassDateTime(classItem: any): string {
  const now = new Date();
  const dayOfWeek = classItem.day_of_week;
  const [hours, minutes] = classItem.start_time.split(':').map(Number);
  
  // Find next occurrence of this day
  const currentDay = now.getDay();
  let daysUntilClass = (dayOfWeek - currentDay + 7) % 7;
  
  // If it's today but the time has passed, schedule for next week
  if (daysUntilClass === 0) {
    const classTime = new Date(now);
    classTime.setHours(hours, minutes, 0, 0);
    if (classTime <= now) {
      daysUntilClass = 7;
    }
  }
  
  const classDate = new Date(now);
  classDate.setDate(now.getDate() + daysUntilClass);
  classDate.setHours(hours, minutes, 0, 0);
  
  return classDate.toISOString();
}

function calculateNextClassEndDateTime(classItem: any): string {
  const startDateTime = new Date(calculateNextClassDateTime(classItem));
  const [hours, minutes] = classItem.end_time.split(':').map(Number);
  
  startDateTime.setHours(hours, minutes, 0, 0);
  return startDateTime.toISOString();
}

function getDayAbbreviation(dayOfWeek: number): string {
  const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  return days[dayOfWeek] || 'MO';
}