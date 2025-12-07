import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedEvent {
  title: string;
  date: string; // ISO date string YYYY-MM-DD
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  location?: string;
  description?: string;
  event_type?: 'class' | 'meeting' | 'study' | 'appointment' | 'reminder' | 'other';
  is_recurring?: boolean;
  recurrence_pattern?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  day_of_week?: number; // 0-6 for recurring events
  course_code?: string;
}

interface ParsedEventsResult {
  events: ParsedEvent[];
  metadata: {
    total_events: number;
    recurring_events: number;
    one_time_events: number;
    confidence_score: number;
    processing_time_ms: number;
  };
}

interface CreatedEvent {
  id: string;
  title: string;
  type: 'schedule_block' | 'study_session';
  success: boolean;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      user_id, 
      text_input,
      auto_add_to_calendar = true,
      detect_conflicts = true
    } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!text_input || text_input.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Text input is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Event parsing request:', { user_id, text_length: text_input.length });

    // Get user context for smart parsing
    const userContext = await getUserContext(supabase, user_id);

    // Parse events using AI
    const parsedResult = await parseEventsWithAI(text_input, userContext);

    // Detect conflicts if requested
    let conflicts: any[] = [];
    if (detect_conflicts && parsedResult.events.length > 0) {
      conflicts = await detectEventConflicts(supabase, user_id, parsedResult.events);
    }

    // Add events to calendar if requested
    let createdEvents: CreatedEvent[] = [];
    if (auto_add_to_calendar && parsedResult.events.length > 0) {
      createdEvents = await addEventsToCalendar(supabase, user_id, parsedResult.events, userContext);
    }

    const processingTime = Date.now() - startTime;

    // Generate response message
    const responseMessage = generateResponseMessage(parsedResult, conflicts, createdEvents);

    return new Response(
      JSON.stringify({
        success: true,
        response: responseMessage,
        parsed_events: parsedResult.events,
        conflicts,
        created_events: createdEvents,
        metadata: {
          ...parsedResult.metadata,
          processing_time_ms: processingTime,
          conflicts_detected: conflicts.length,
          events_created: createdEvents.filter(e => e.success).length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Event parsing error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Event parsing failed',
        processing_time_ms: Date.now() - startTime
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getUserContext(supabase: any, userId: string) {
  const [coursesResult, scheduleResult] = await Promise.all([
    supabase.from('courses').select('id, name, code, color').eq('user_id', userId).eq('is_active', true),
    supabase.from('schedule_blocks').select('*').eq('user_id', userId).eq('is_active', true)
  ]);

  return {
    courses: coursesResult.data || [],
    scheduleBlocks: scheduleResult.data || []
  };
}

async function parseEventsWithAI(textInput: string, userContext: any): Promise<ParsedEventsResult> {
  const currentDate = new Date().toISOString().split('T')[0];
  
  const systemPrompt = `You are an intelligent event parser that extracts calendar events from natural language text.

CURRENT DATE: ${currentDate}

USER CONTEXT:
- Existing courses: ${userContext.courses.map((c: any) => `${c.code || c.name}`).join(', ') || 'None'}

PARSING RULES:
1. Extract ALL events mentioned in the text
2. Use the current date as reference for relative dates (today, tomorrow, next Monday, etc.)
3. Convert 12-hour time to 24-hour format (e.g., 3pm → 15:00)
4. If end time is not specified, default to 1 hour after start time
5. Identify recurring patterns (every Monday, weekly, daily, etc.)
6. Match events to existing courses if course names/codes are mentioned
7. Infer event types based on keywords (meeting, study, class, appointment, etc.)

EVENT TYPES:
- class: Academic classes/lectures
- meeting: Work/personal meetings
- study: Study sessions
- appointment: Medical, business appointments
- reminder: Simple reminders/deadlines
- other: Anything else

OUTPUT FORMAT (JSON):
{
  "events": [
    {
      "title": "Event Title",
      "date": "YYYY-MM-DD",
      "start_time": "HH:MM",
      "end_time": "HH:MM",
      "location": "Optional location",
      "description": "Optional description",
      "event_type": "class|meeting|study|appointment|reminder|other",
      "is_recurring": false,
      "recurrence_pattern": null,
      "day_of_week": null,
      "course_code": "COURSE123 if applicable"
    }
  ],
  "metadata": {
    "total_events": 1,
    "recurring_events": 0,
    "one_time_events": 1,
    "confidence_score": 0.95
  }
}

Be accurate with dates and times. If something is ambiguous, make reasonable assumptions.`;

  const userPrompt = `Parse the following text and extract all calendar events:

"${textInput}"

Return valid JSON with all extracted events.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    const aiContent = result.choices[0].message.content;

    // Parse JSON from response
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    const parsedData = JSON.parse(jsonMatch[0]);
    
    // Validate and normalize events
    const normalizedEvents = (parsedData.events || []).map((event: any) => ({
      title: event.title || 'Untitled Event',
      date: event.date || new Date().toISOString().split('T')[0],
      start_time: normalizeTime(event.start_time) || '09:00',
      end_time: normalizeTime(event.end_time) || '10:00',
      location: event.location || null,
      description: event.description || null,
      event_type: event.event_type || 'other',
      is_recurring: event.is_recurring || false,
      recurrence_pattern: event.recurrence_pattern || null,
      day_of_week: event.day_of_week ?? getDayOfWeek(event.date),
      course_code: event.course_code || null
    }));

    return {
      events: normalizedEvents,
      metadata: {
        total_events: normalizedEvents.length,
        recurring_events: normalizedEvents.filter((e: ParsedEvent) => e.is_recurring).length,
        one_time_events: normalizedEvents.filter((e: ParsedEvent) => !e.is_recurring).length,
        confidence_score: parsedData.metadata?.confidence_score || 0.8,
        processing_time_ms: 0
      }
    };

  } catch (error) {
    console.error('AI parsing error:', error);
    throw new Error(`Failed to parse events: ${error.message}`);
  }
}

function normalizeTime(time: string): string {
  if (!time) return '';
  
  // Already in HH:MM format
  if (/^\d{2}:\d{2}$/.test(time)) return time;
  
  // Convert H:MM to HH:MM
  if (/^\d{1}:\d{2}$/.test(time)) return `0${time}`;
  
  // Handle HH:MM:SS
  if (/^\d{2}:\d{2}:\d{2}$/.test(time)) return time.substring(0, 5);
  
  return time;
}

function getDayOfWeek(dateStr: string): number {
  if (!dateStr) return new Date().getDay();
  const date = new Date(dateStr);
  return date.getDay();
}

async function detectEventConflicts(
  supabase: any, 
  userId: string, 
  events: ParsedEvent[]
): Promise<any[]> {
  const conflicts: any[] = [];

  // Get existing schedule blocks
  const { data: existingBlocks } = await supabase
    .from('schedule_blocks')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  for (const event of events) {
    const eventStart = timeToMinutes(event.start_time);
    const eventEnd = timeToMinutes(event.end_time);
    const eventDayOfWeek = event.day_of_week ?? getDayOfWeek(event.date);

    for (const block of (existingBlocks || [])) {
      // Check if same day of week
      if (block.day_of_week !== eventDayOfWeek) continue;

      const blockStart = timeToMinutes(block.start_time);
      const blockEnd = timeToMinutes(block.end_time);

      // Check for overlap
      if (eventStart < blockEnd && eventEnd > blockStart) {
        conflicts.push({
          new_event: event.title,
          existing_event: block.title,
          conflict_type: 'time_overlap',
          day_of_week: eventDayOfWeek,
          new_time: `${event.start_time} - ${event.end_time}`,
          existing_time: `${block.start_time} - ${block.end_time}`,
          severity: 'major'
        });
      }
    }

    // Check conflicts between new events
    for (const otherEvent of events) {
      if (event === otherEvent) continue;
      if (event.date !== otherEvent.date) continue;

      const otherStart = timeToMinutes(otherEvent.start_time);
      const otherEnd = timeToMinutes(otherEvent.end_time);

      if (eventStart < otherEnd && eventEnd > otherStart) {
        // Avoid duplicate conflict entries
        const existingConflict = conflicts.find(c => 
          (c.new_event === event.title && c.existing_event === otherEvent.title) ||
          (c.new_event === otherEvent.title && c.existing_event === event.title)
        );
        
        if (!existingConflict) {
          conflicts.push({
            new_event: event.title,
            existing_event: otherEvent.title,
            conflict_type: 'new_events_overlap',
            date: event.date,
            severity: 'minor'
          });
        }
      }
    }
  }

  return conflicts;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

async function addEventsToCalendar(
  supabase: any, 
  userId: string, 
  events: ParsedEvent[],
  userContext: any
): Promise<CreatedEvent[]> {
  const results: CreatedEvent[] = [];

  for (const event of events) {
    try {
      // Find matching course if course_code is provided
      let courseId = null;
      if (event.course_code) {
        const matchingCourse = userContext.courses.find((c: any) => 
          c.code?.toLowerCase() === event.course_code?.toLowerCase() ||
          c.name?.toLowerCase().includes(event.course_code?.toLowerCase())
        );
        courseId = matchingCourse?.id || null;
      }

      // Determine if this should be a schedule_block or study_session
      const isStudySession = event.event_type === 'study';

      if (isStudySession) {
        // Create study session
        const startDateTime = `${event.date}T${event.start_time}:00`;
        const endDateTime = `${event.date}T${event.end_time}:00`;

        const { data, error } = await supabase
          .from('study_sessions')
          .insert({
            user_id: userId,
            title: event.title,
            scheduled_start: startDateTime,
            scheduled_end: endDateTime,
            course_id: courseId,
            notes: event.description,
            status: 'scheduled'
          })
          .select()
          .single();

        if (error) throw error;

        results.push({
          id: data.id,
          title: event.title,
          type: 'study_session',
          success: true
        });
      } else {
        // Create schedule block
        const { data, error } = await supabase
          .from('schedule_blocks')
          .insert({
            user_id: userId,
            title: event.title,
            course_id: courseId,
            day_of_week: event.day_of_week ?? getDayOfWeek(event.date),
            start_time: event.start_time,
            end_time: event.end_time,
            location: event.location,
            description: event.description,
            specific_date: event.is_recurring ? null : event.date,
            is_recurring: event.is_recurring || false,
            recurrence_pattern: event.recurrence_pattern || 'weekly',
            is_active: true
          })
          .select()
          .single();

        if (error) throw error;

        results.push({
          id: data.id,
          title: event.title,
          type: 'schedule_block',
          success: true
        });
      }

    } catch (error: any) {
      console.error(`Failed to create event ${event.title}:`, error);
      results.push({
        id: '',
        title: event.title,
        type: 'schedule_block',
        success: false,
        error: error.message
      });
    }
  }

  return results;
}

function generateResponseMessage(
  parsedResult: ParsedEventsResult,
  conflicts: any[],
  createdEvents: CreatedEvent[]
): string {
  const parts: string[] = [];
  
  parts.push(`📅 **Event Parsing Complete!**\n`);
  
  // Summary
  parts.push(`📊 **Found ${parsedResult.metadata.total_events} event(s):**`);
  parts.push(`• ${parsedResult.metadata.one_time_events} one-time event(s)`);
  parts.push(`• ${parsedResult.metadata.recurring_events} recurring event(s)\n`);
  
  // Events added
  if (createdEvents.length > 0) {
    const successful = createdEvents.filter(e => e.success);
    const failed = createdEvents.filter(e => !e.success);
    
    if (successful.length > 0) {
      parts.push(`✅ **Added to Calendar (${successful.length}):**`);
      successful.forEach(e => {
        parts.push(`• ${e.title} (${e.type === 'study_session' ? 'Study Session' : 'Event'})`);
      });
      parts.push('');
    }
    
    if (failed.length > 0) {
      parts.push(`❌ **Failed to Add (${failed.length}):**`);
      failed.forEach(e => {
        parts.push(`• ${e.title}: ${e.error}`);
      });
      parts.push('');
    }
  }
  
  // Conflicts
  if (conflicts.length > 0) {
    parts.push(`⚠️ **Conflicts Detected (${conflicts.length}):**`);
    conflicts.slice(0, 5).forEach(c => {
      parts.push(`• "${c.new_event}" conflicts with "${c.existing_event}"`);
    });
    if (conflicts.length > 5) {
      parts.push(`• ... and ${conflicts.length - 5} more`);
    }
    parts.push('');
  }
  
  parts.push(`✨ Your events are now organized!`);
  
  return parts.join('\n');
}
