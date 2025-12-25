import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface CalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: string;
  colorId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { action, userId, data } = await req.json();

    console.log('Google Calendar sync action:', action, 'for user:', userId);

    // Get user's Google tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('google_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (tokenError || !tokenData) {
      throw new Error('No Google tokens found for user');
    }

    // Check if token is expired and refresh if needed
    let accessToken = tokenData.access_token;
    const expiresAt = new Date(tokenData.expires_at);
    const now = new Date();
    
    if (now >= expiresAt && tokenData.refresh_token) {
      console.log('Token expired, refreshing...');
      
      const refreshResponse = await supabase.functions.invoke('google-oauth', {
        body: { action: 'refresh', userId }
      });
      
      if (refreshResponse.error) {
        throw new Error('Failed to refresh token');
      }
      
      accessToken = refreshResponse.data.access_token;
    }

    const googleApiHeaders = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    switch (action) {
      case 'sync-schedule-blocks': {
        // Get user's schedule blocks
        const { data: scheduleBlocks, error: scheduleError } = await supabase
          .from('schedule_blocks')
          .select(`
            *,
            course:courses(name, color)
          `)
          .eq('user_id', userId)
          .eq('is_active', true);

        if (scheduleError) {
          throw scheduleError;
        }

        const events: CalendarEvent[] = [];
        const timezone = 'America/New_York'; // TODO: Get from user preferences

        // Convert schedule blocks to calendar events for the next 30 days
        const today = new Date();
        const endDate = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));

        for (const block of scheduleBlocks || []) {
          // Generate recurring events based on the schedule
          const startDate = new Date(today);
          startDate.setDate(startDate.getDate() - startDate.getDay() + block.day_of_week); // Get to the right day of the week
          
          while (startDate <= endDate) {
            const eventStart = new Date(startDate);
            const [startHour, startMinute] = block.start_time.split(':').map(Number);
            eventStart.setHours(startHour, startMinute, 0, 0);

            const eventEnd = new Date(startDate);
            const [endHour, endMinute] = block.end_time.split(':').map(Number);
            eventEnd.setHours(endHour, endMinute, 0, 0);

            const event: CalendarEvent = {
              summary: `${block.course?.name || 'Class'} - ${block.title}`,
              description: block.description || '',
              start: {
                dateTime: eventStart.toISOString(),
                timeZone: timezone,
              },
              end: {
                dateTime: eventEnd.toISOString(),
                timeZone: timezone,
              },
              location: block.location || '',
              colorId: getColorId(block.course?.color),
            };

            events.push(event);
            startDate.setDate(startDate.getDate() + 7); // Next week
          }
        }

        // Create events in Google Calendar
        let successCount = 0;
        for (const event of events) {
          try {
            const response = await fetch(
              'https://www.googleapis.com/calendar/v3/calendars/primary/events',
              {
                method: 'POST',
                headers: googleApiHeaders,
                body: JSON.stringify(event),
              }
            );

            if (response.ok) {
              successCount++;
            } else {
              console.error('Failed to create event:', await response.text());
            }
          } catch (error) {
            console.error('Error creating event:', error);
          }
        }

        return new Response(JSON.stringify({ 
          success: true, 
          eventsCreated: successCount,
          totalEvents: events.length 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'sync-assignments': {
        // Get upcoming assignments
        const { data: assignments, error: assignmentError } = await supabase
          .from('assignments')
          .select(`
            *,
            course:courses(name, color)
          `)
          .eq('user_id', userId)
          .eq('is_completed', false)
          .gte('due_date', new Date().toISOString());

        if (assignmentError) {
          throw assignmentError;
        }

        const events: CalendarEvent[] = [];
        const timezone = 'America/New_York'; // TODO: Get from user preferences

        for (const assignment of assignments || []) {
          const dueDate = new Date(assignment.due_date);
          const startTime = new Date(dueDate.getTime() - (assignment.estimated_hours * 60 * 60 * 1000));

          const event: CalendarEvent = {
            summary: `📚 ${assignment.title}`,
            description: `Assignment: ${assignment.description || ''}\nCourse: ${assignment.course?.name || ''}\nEstimated Hours: ${assignment.estimated_hours}`,
            start: {
              dateTime: startTime.toISOString(),
              timeZone: timezone,
            },
            end: {
              dateTime: dueDate.toISOString(),
              timeZone: timezone,
            },
            colorId: '4', // Blue for assignments
          };

          events.push(event);
        }

        // Create events in Google Calendar
        let successCount = 0;
        for (const event of events) {
          try {
            const response = await fetch(
              'https://www.googleapis.com/calendar/v3/calendars/primary/events',
              {
                method: 'POST',
                headers: googleApiHeaders,
                body: JSON.stringify(event),
              }
            );

            if (response.ok) {
              successCount++;
            } else {
              console.error('Failed to create assignment event:', await response.text());
            }
          } catch (error) {
            console.error('Error creating assignment event:', error);
          }
        }

        return new Response(JSON.stringify({ 
          success: true, 
          eventsCreated: successCount,
          totalEvents: events.length 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'sync-exams': {
        // Get upcoming exams
        const { data: exams, error: examError } = await supabase
          .from('exams')
          .select(`
            *,
            course:courses(name, color)
          `)
          .eq('user_id', userId)
          .gte('exam_date', new Date().toISOString());

        if (examError) {
          throw examError;
        }

        const events: CalendarEvent[] = [];
        const timezone = 'America/New_York'; // TODO: Get from user preferences

        for (const exam of exams || []) {
          const examDate = new Date(exam.exam_date);
          const endDate = new Date(examDate.getTime() + (exam.duration_minutes * 60 * 1000));

          const event: CalendarEvent = {
            summary: `🎯 ${exam.title} (${exam.exam_type})`,
            description: `Exam: ${exam.course?.name || ''}\nLocation: ${exam.location || ''}\nDuration: ${exam.duration_minutes} minutes`,
            start: {
              dateTime: examDate.toISOString(),
              timeZone: timezone,
            },
            end: {
              dateTime: endDate.toISOString(),
              timeZone: timezone,
            },
            location: exam.location || '',
            colorId: '11', // Red for exams
          };

          events.push(event);
        }

        // Create events in Google Calendar
        let successCount = 0;
        for (const event of events) {
          try {
            const response = await fetch(
              'https://www.googleapis.com/calendar/v3/calendars/primary/events',
              {
                method: 'POST',
                headers: googleApiHeaders,
                body: JSON.stringify(event),
              }
            );

            if (response.ok) {
              successCount++;
            } else {
              console.error('Failed to create exam event:', await response.text());
            }
          } catch (error) {
            console.error('Error creating exam event:', error);
          }
        }

        return new Response(JSON.stringify({ 
          success: true, 
          eventsCreated: successCount,
          totalEvents: events.length 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'full-sync': {
        // Perform a full sync of all data
        const scheduleResult = await supabase.functions.invoke('google-calendar-sync', {
          body: { action: 'sync-schedule-blocks', userId }
        });

        const assignmentResult = await supabase.functions.invoke('google-calendar-sync', {
          body: { action: 'sync-assignments', userId }
        });

        const examResult = await supabase.functions.invoke('google-calendar-sync', {
          body: { action: 'sync-exams', userId }
        });

        // Update last sync time
        await supabase
          .from('google_calendar_settings')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('user_id', userId);

        return new Response(JSON.stringify({ 
          success: true,
          results: {
            scheduleBlocks: scheduleResult.data,
            assignments: assignmentResult.data,
            exams: examResult.data,
          }
        }), {
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
    console.error('Error in google-calendar-sync function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to map course colors to Google Calendar color IDs
function getColorId(courseColor: string | undefined): string {
  const colorMap: { [key: string]: string } = {
    'red': '11',
    'blue': '1',
    'green': '10',
    'yellow': '5',
    'orange': '6',
    'purple': '3',
    'pink': '4',
    'cyan': '7',
    'gray': '8',
  };
  
  return colorMap[courseColor || 'blue'] || '1';
}