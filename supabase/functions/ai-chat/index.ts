/**
 * AI Chat Edge Function with Full Calendar RAG + Agentic Capabilities
 * Purpose: Process user messages with COMPLETE calendar context and return structured actions
 * Backend integration: Lovable AI Gateway (google/gemini-2.5-flash)
 * 
 * CRITICAL FIX: This version fetches ALL calendar data from the database as the
 * Single Source of Truth (SSOT), not just AI-created events.
 */
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =============================================================================
// CALENDAR DATA TYPES
// =============================================================================

interface ScheduleBlock {
  id: string;
  title: string;
  start_time: string; // TIME format (HH:MM:SS)
  end_time: string;
  day_of_week: number | null;
  specific_date: string | null;
  is_recurring: boolean;
  location: string | null;
  description: string | null;
  course_id: string | null;
  courses?: { name: string; color: string } | null;
}

interface Assignment {
  id: string;
  title: string;
  due_date: string;
  is_completed: boolean;
  priority: number | null;
  course_id: string;
  courses?: { name: string } | null;
}

interface Exam {
  id: string;
  title: string;
  exam_date: string;
  duration_minutes: number | null;
  location: string | null;
  course_id: string;
  courses?: { name: string } | null;
}

interface StudySession {
  id: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string | null;
  course_id: string | null;
  courses?: { name: string } | null;
}

interface CalendarEvent {
  type: 'class' | 'assignment' | 'exam' | 'study_session';
  title: string;
  start: Date;
  end: Date;
  location?: string;
  courseName?: string;
  isRecurring?: boolean;
  dayOfWeek?: number;
}

// =============================================================================
// DATE/TIME UTILITIES
// =============================================================================

/**
 * Get current date in user's timezone or UTC
 */
function getCurrentDate(timezone?: string): Date {
  const now = new Date();
  if (timezone) {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const parts = formatter.formatToParts(now);
      const getValue = (type: string) => parts.find(p => p.type === type)?.value || '0';
      return new Date(
        parseInt(getValue('year')),
        parseInt(getValue('month')) - 1,
        parseInt(getValue('day')),
        parseInt(getValue('hour')),
        parseInt(getValue('minute')),
        parseInt(getValue('second'))
      );
    } catch {
      return now;
    }
  }
  return now;
}

/**
 * Parse time string (HH:MM:SS or HH:MM) and combine with date
 */
function parseTimeToDate(date: Date, timeStr: string): Date {
  const parts = timeStr.split(':').map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  const seconds = parts[2] || 0;
  const result = new Date(date);
  result.setHours(hours, minutes, seconds, 0);
  return result;
}

/**
 * Format date for display
 */
function formatDateForDisplay(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  return date.toLocaleString('en-US', options);
}

/**
 * Format time for display
 */
function formatTimeForDisplay(date: Date): string {
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
}

/**
 * Get day name from day of week number
 */
function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek] || 'Unknown';
}

/**
 * Check if a recurring class should occur on a given date
 */
function shouldClassOccurOnDate(block: ScheduleBlock, date: Date): boolean {
  if (!block.is_recurring) {
    // Non-recurring: check specific_date
    if (block.specific_date) {
      const specificDate = new Date(block.specific_date);
      return specificDate.toDateString() === date.toDateString();
    }
    return false;
  }
  
  // Recurring: check day_of_week
  if (block.day_of_week !== null) {
    return date.getDay() === block.day_of_week;
  }
  
  return false;
}

/**
 * Get date range for a query (today, tomorrow, this week, etc.)
 */
function getDateRange(query: string, now: Date): { start: Date; end: Date; label: string } {
  const lowerQuery = query.toLowerCase();
  
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  
  if (lowerQuery.includes('today') || lowerQuery.includes('today\'s')) {
    return { start: startOfDay, end: endOfDay, label: 'today' };
  }
  
  if (lowerQuery.includes('tomorrow')) {
    const tomorrow = new Date(startOfDay);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);
    return { start: tomorrow, end: tomorrowEnd, label: 'tomorrow' };
  }
  
  if (lowerQuery.includes('this week') || lowerQuery.includes('week')) {
    const weekStart = new Date(startOfDay);
    const dayOfWeek = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - dayOfWeek); // Go to Sunday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return { start: weekStart, end: weekEnd, label: 'this week' };
  }
  
  if (lowerQuery.includes('next week')) {
    const nextWeekStart = new Date(startOfDay);
    const dayOfWeek = nextWeekStart.getDay();
    nextWeekStart.setDate(nextWeekStart.getDate() - dayOfWeek + 7); // Next Sunday
    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);
    nextWeekEnd.setHours(23, 59, 59, 999);
    return { start: nextWeekStart, end: nextWeekEnd, label: 'next week' };
  }
  
  // Default to today
  return { start: startOfDay, end: endOfDay, label: 'today' };
}

// =============================================================================
// CALENDAR RETRIEVAL (RAG FOR CALENDAR DATA)
// =============================================================================

interface CalendarContext {
  events: CalendarEvent[];
  freeSlots: Array<{ start: Date; end: Date }>;
  summary: string;
  dateRange: { start: Date; end: Date; label: string };
}

/**
 * Fetch all calendar data for a user and compute context
 */
async function fetchCalendarContext(
  supabase: any,
  userId: string,
  query: string,
  timezone?: string
): Promise<CalendarContext> {
  const now = getCurrentDate(timezone);
  const dateRange = getDateRange(query, now);
  
  console.log(`Calendar RAG: Fetching events for ${dateRange.label} (${dateRange.start.toISOString()} to ${dateRange.end.toISOString()})`);
  
  // Fetch ALL calendar data types in parallel
  const [
    scheduleBlocksResult,
    assignmentsResult,
    examsResult,
    studySessionsResult
  ] = await Promise.all([
    // Schedule blocks (classes)
    supabase
      .from('schedule_blocks')
      .select('*, courses(name, color)')
      .eq('user_id', userId)
      .eq('is_active', true),
    
    // Assignments
    supabase
      .from('assignments')
      .select('*, courses(name)')
      .eq('user_id', userId)
      .gte('due_date', dateRange.start.toISOString())
      .lte('due_date', dateRange.end.toISOString()),
    
    // Exams
    supabase
      .from('exams')
      .select('*, courses(name)')
      .eq('user_id', userId)
      .gte('exam_date', dateRange.start.toISOString())
      .lte('exam_date', dateRange.end.toISOString()),
    
    // Study sessions
    supabase
      .from('study_sessions')
      .select('*, courses(name)')
      .eq('user_id', userId)
      .gte('scheduled_start', dateRange.start.toISOString())
      .lte('scheduled_end', dateRange.end.toISOString())
  ]);
  
  const scheduleBlocks: ScheduleBlock[] = scheduleBlocksResult.data || [];
  const assignments: Assignment[] = assignmentsResult.data || [];
  const exams: Exam[] = examsResult.data || [];
  const studySessions: StudySession[] = studySessionsResult.data || [];
  
  console.log(`Calendar RAG: Found ${scheduleBlocks.length} schedule blocks, ${assignments.length} assignments, ${exams.length} exams, ${studySessions.length} study sessions`);
  
  // Convert all to unified CalendarEvent format
  const events: CalendarEvent[] = [];
  
  // Process schedule blocks - expand recurring events for the date range
  for (const block of scheduleBlocks) {
    // For each day in the range, check if this block should occur
    const currentDate = new Date(dateRange.start);
    while (currentDate <= dateRange.end) {
      if (shouldClassOccurOnDate(block, currentDate)) {
        const startTime = parseTimeToDate(currentDate, block.start_time);
        const endTime = parseTimeToDate(currentDate, block.end_time);
        
        events.push({
          type: 'class',
          title: block.title,
          start: startTime,
          end: endTime,
          location: block.location || undefined,
          courseName: block.courses?.name,
          isRecurring: block.is_recurring,
          dayOfWeek: block.day_of_week ?? undefined
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  // Process assignments (treat due date as a point event with 1 hour window)
  for (const assignment of assignments) {
    const dueDate = new Date(assignment.due_date);
    const endDate = new Date(dueDate);
    endDate.setHours(endDate.getHours() + 1);
    
    events.push({
      type: 'assignment',
      title: `📝 ${assignment.title} (Due)`,
      start: dueDate,
      end: endDate,
      courseName: assignment.courses?.name
    });
  }
  
  // Process exams
  for (const exam of exams) {
    const examDate = new Date(exam.exam_date);
    const endDate = new Date(examDate);
    endDate.setMinutes(endDate.getMinutes() + (exam.duration_minutes || 60));
    
    events.push({
      type: 'exam',
      title: `📚 ${exam.title} (Exam)`,
      start: examDate,
      end: endDate,
      location: exam.location || undefined,
      courseName: exam.courses?.name
    });
  }
  
  // Process study sessions
  for (const session of studySessions) {
    events.push({
      type: 'study_session',
      title: `📖 ${session.title}`,
      start: new Date(session.scheduled_start),
      end: new Date(session.scheduled_end),
      courseName: session.courses?.name
    });
  }
  
  // Sort events chronologically
  events.sort((a, b) => a.start.getTime() - b.start.getTime());
  
  // Compute free time slots
  const freeSlots = computeFreeTimeSlots(events, dateRange.start, dateRange.end);
  
  // Generate summary
  const summary = generateCalendarSummary(events, freeSlots, dateRange, now);
  
  return { events, freeSlots, summary, dateRange };
}

/**
 * Compute free time slots between events
 * Working hours: 8 AM to 10 PM
 */
function computeFreeTimeSlots(
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date
): Array<{ start: Date; end: Date }> {
  const WORKING_START_HOUR = 8;
  const WORKING_END_HOUR = 22;
  const MIN_SLOT_MINUTES = 30;
  
  const freeSlots: Array<{ start: Date; end: Date }> = [];
  
  // Process each day in the range
  const currentDay = new Date(rangeStart);
  while (currentDay <= rangeEnd) {
    const dayStart = new Date(currentDay);
    dayStart.setHours(WORKING_START_HOUR, 0, 0, 0);
    
    const dayEnd = new Date(currentDay);
    dayEnd.setHours(WORKING_END_HOUR, 0, 0, 0);
    
    // Get events for this day
    const dayEvents = events.filter(e => 
      e.start.toDateString() === currentDay.toDateString()
    ).sort((a, b) => a.start.getTime() - b.start.getTime());
    
    // Find gaps
    let cursor = dayStart;
    
    for (const event of dayEvents) {
      const eventStart = event.start < dayStart ? dayStart : event.start;
      const eventEnd = event.end > dayEnd ? dayEnd : event.end;
      
      // Gap before this event
      if (eventStart > cursor) {
        const gapMinutes = (eventStart.getTime() - cursor.getTime()) / (1000 * 60);
        if (gapMinutes >= MIN_SLOT_MINUTES) {
          freeSlots.push({ start: new Date(cursor), end: new Date(eventStart) });
        }
      }
      
      // Move cursor past this event
      if (eventEnd > cursor) {
        cursor = new Date(eventEnd);
      }
    }
    
    // Gap after last event until end of working hours
    if (cursor < dayEnd) {
      const gapMinutes = (dayEnd.getTime() - cursor.getTime()) / (1000 * 60);
      if (gapMinutes >= MIN_SLOT_MINUTES) {
        freeSlots.push({ start: new Date(cursor), end: new Date(dayEnd) });
      }
    }
    
    currentDay.setDate(currentDay.getDate() + 1);
  }
  
  return freeSlots;
}

/**
 * Generate a human-readable calendar summary
 */
function generateCalendarSummary(
  events: CalendarEvent[],
  freeSlots: Array<{ start: Date; end: Date }>,
  dateRange: { start: Date; end: Date; label: string },
  now: Date
): string {
  const lines: string[] = [];
  
  lines.push(`## 📅 Calendar for ${dateRange.label.charAt(0).toUpperCase() + dateRange.label.slice(1)}`);
  lines.push(`*Generated at ${formatTimeForDisplay(now)}*\n`);
  
  if (events.length === 0) {
    lines.push(`🎉 **No scheduled events ${dateRange.label}!** Your calendar is completely free.`);
  } else {
    lines.push(`### Scheduled Events (${events.length} total)\n`);
    
    // Group events by day
    const eventsByDay = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const dayKey = event.start.toDateString();
      if (!eventsByDay.has(dayKey)) {
        eventsByDay.set(dayKey, []);
      }
      eventsByDay.get(dayKey)!.push(event);
    }
    
    for (const [dayKey, dayEvents] of eventsByDay) {
      const dayDate = new Date(dayKey);
      const isToday = dayDate.toDateString() === now.toDateString();
      lines.push(`**${isToday ? '📍 Today' : getDayName(dayDate.getDay())}, ${dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}:**`);
      
      for (const event of dayEvents) {
        const timeRange = `${formatTimeForDisplay(event.start)} - ${formatTimeForDisplay(event.end)}`;
        const course = event.courseName ? ` (${event.courseName})` : '';
        const location = event.location ? ` @ ${event.location}` : '';
        lines.push(`- ${timeRange}: ${event.title}${course}${location}`);
      }
      lines.push('');
    }
  }
  
  // Free time summary
  if (freeSlots.length > 0) {
    lines.push(`### ⏰ Available Time Slots\n`);
    
    // Group by day
    const slotsByDay = new Map<string, Array<{ start: Date; end: Date }>>();
    for (const slot of freeSlots) {
      const dayKey = slot.start.toDateString();
      if (!slotsByDay.has(dayKey)) {
        slotsByDay.set(dayKey, []);
      }
      slotsByDay.get(dayKey)!.push(slot);
    }
    
    for (const [dayKey, daySlots] of slotsByDay) {
      const dayDate = new Date(dayKey);
      const isToday = dayDate.toDateString() === now.toDateString();
      lines.push(`**${isToday ? 'Today' : getDayName(dayDate.getDay())}:**`);
      
      for (const slot of daySlots) {
        const duration = Math.round((slot.end.getTime() - slot.start.getTime()) / (1000 * 60));
        const hours = Math.floor(duration / 60);
        const mins = duration % 60;
        const durationStr = hours > 0 
          ? (mins > 0 ? `${hours}h ${mins}m` : `${hours}h`)
          : `${mins}m`;
        lines.push(`- ${formatTimeForDisplay(slot.start)} - ${formatTimeForDisplay(slot.end)} (${durationStr} free)`);
      }
      lines.push('');
    }
  } else if (events.length > 0) {
    lines.push(`\n⚠️ **No free time slots available ${dateRange.label}** (fully booked)`);
  }
  
  return lines.join('\n');
}

// =============================================================================
// DOCUMENT RAG (Existing functionality)
// =============================================================================

/**
 * Generate embedding for RAG query
 */
async function generateQueryEmbedding(query: string, apiKey: string): Promise<number[] | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query.slice(0, 8000),
      }),
    });
    
    if (!response.ok) {
      console.log('Embedding API not available, skipping document RAG');
      return null;
    }
    
    const result = await response.json();
    return result.data[0].embedding;
  } catch (error) {
    console.log('Document RAG embedding generation failed:', error);
    return null;
  }
}

/**
 * Search for relevant documents using vector similarity
 */
async function searchDocuments(
  supabase: any, 
  userId: string, 
  queryEmbedding: number[],
  courseId?: string
): Promise<Array<{ content: string; source_type: string; file_name?: string; similarity: number }>> {
  try {
    const embeddingString = `[${queryEmbedding.join(',')}]`;
    
    const { data, error } = await supabase.rpc('search_documents', {
      p_user_id: userId,
      p_query_embedding: embeddingString,
      p_match_threshold: 0.5,
      p_match_count: 5,
      p_course_id: courseId || null,
    });
    
    if (error) {
      console.log('Document search failed:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.log('Document RAG search failed:', error);
    return [];
  }
}

// =============================================================================
// CALENDAR QUERY DETECTION
// =============================================================================

/**
 * Detect if a query is asking about calendar/schedule
 */
function isCalendarQuery(query: string): boolean {
  const calendarKeywords = [
    'calendar', 'schedule', 'event', 'events',
    'today', 'tomorrow', 'this week', 'next week',
    'free', 'free time', 'available', 'availability',
    'busy', 'occupied', 'when am i',
    'what do i have', 'what\'s on my', 'what is on my',
    'class', 'classes', 'meeting', 'meetings',
    'appointment', 'appointments',
    'exam', 'exams', 'assignment', 'assignments',
    'due', 'deadline', 'deadlines',
    'study session', 'study sessions'
  ];
  
  const lowerQuery = query.toLowerCase();
  return calendarKeywords.some(keyword => lowerQuery.includes(keyword));
}

// =============================================================================
// RATE LIMITING
// =============================================================================

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const key = identifier;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// =============================================================================
// ACTION SPECIFICATION - Full CRUD for all entity types
// =============================================================================

const ACTION_SPEC = `
## AGENTIC RESPONSE FORMAT
When the user asks to create, update, delete, or manage their calendar, assignments, exams, study sessions, or courses, respond with structured JSON:

{
  "reply_markdown": "Your conversational response in markdown",
  "actions": [
    {
      "type": "ACTION_TYPE",
      ...action_specific_fields
    }
  ]
}

## CRITICAL TIME FORMAT RULES:
- **DO NOT** use "Z" suffix or timezone offsets in datetime fields
- Times should be in LOCAL format: "YYYY-MM-DDTHH:MM:SS" (no Z at the end!)
- When user says "10 AM", use "T10:00:00" NOT "T10:00:00Z"

## EVENT ACTIONS (Calendar Events/Classes):

### CREATE_EVENT - Create a new calendar event
{
  "type": "CREATE_EVENT",
  "title": "Event title",
  "start_iso": "2025-12-01T19:00:00",
  "end_iso": "2025-12-01T20:30:00",
  "location": "optional location",
  "notes": "optional notes",
  "course_id": "optional course UUID"
}

### UPDATE_EVENT - Modify an existing event
{
  "type": "UPDATE_EVENT",
  "id": "event UUID (required)",
  "title": "new title (optional)",
  "start_iso": "new start time (optional)",
  "end_iso": "new end time (optional)",
  "location": "new location (optional)"
}

### DELETE_EVENT - Remove an event
{
  "type": "DELETE_EVENT",
  "id": "event UUID (required)",
  "title": "event title for confirmation message"
}

## ASSIGNMENT ACTIONS:

### CREATE_ASSIGNMENT - Create a new assignment
{
  "type": "CREATE_ASSIGNMENT",
  "title": "Assignment title",
  "course_id": "course UUID (required)",
  "due_date": "2025-12-15T23:59:00",
  "description": "optional description",
  "priority": 1-3 (1=high, 2=medium, 3=low),
  "estimated_hours": number,
  "assignment_type": "homework|project|essay|quiz|exam|presentation|lab|test|report"
}

### UPDATE_ASSIGNMENT - Modify an assignment
{
  "type": "UPDATE_ASSIGNMENT",
  "id": "assignment UUID (required)",
  "title": "new title (optional)",
  "due_date": "new due date (optional)",
  "priority": "new priority (optional)",
  "is_completed": true/false (optional)
}

### DELETE_ASSIGNMENT - Remove an assignment
{
  "type": "DELETE_ASSIGNMENT",
  "id": "assignment UUID (required)",
  "title": "assignment title for confirmation"
}

### COMPLETE_ASSIGNMENT - Mark assignment as complete
{
  "type": "COMPLETE_ASSIGNMENT",
  "id": "assignment UUID (required)",
  "title": "assignment title"
}

## EXAM ACTIONS:

### CREATE_EXAM - Create a new exam
{
  "type": "CREATE_EXAM",
  "title": "Exam title",
  "course_id": "course UUID (required)",
  "exam_date": "2025-12-20T09:00:00",
  "duration_minutes": 120,
  "location": "optional location",
  "exam_type": "midterm|final|quiz|test",
  "notes": "optional notes"
}

### UPDATE_EXAM - Modify an exam
{
  "type": "UPDATE_EXAM",
  "id": "exam UUID (required)",
  "title": "new title (optional)",
  "exam_date": "new date (optional)",
  "location": "new location (optional)"
}

### DELETE_EXAM - Remove an exam
{
  "type": "DELETE_EXAM",
  "id": "exam UUID (required)",
  "title": "exam title for confirmation"
}

## STUDY SESSION ACTIONS:

### CREATE_STUDY_SESSION - Schedule a study session
{
  "type": "CREATE_STUDY_SESSION",
  "title": "Study session title",
  "scheduled_start": "2025-12-01T14:00:00",
  "scheduled_end": "2025-12-01T16:00:00",
  "course_id": "optional course UUID",
  "exam_id": "optional exam UUID to study for",
  "assignment_id": "optional assignment UUID to work on",
  "notes": "optional notes"
}

### UPDATE_STUDY_SESSION - Modify a study session
{
  "type": "UPDATE_STUDY_SESSION",
  "id": "study session UUID (required)",
  "title": "new title (optional)",
  "scheduled_start": "new start (optional)",
  "scheduled_end": "new end (optional)",
  "status": "scheduled|in_progress|completed|cancelled"
}

### DELETE_STUDY_SESSION - Cancel a study session
{
  "type": "DELETE_STUDY_SESSION",
  "id": "study session UUID (required)",
  "title": "session title for confirmation"
}

## COURSE ACTIONS:

### CREATE_COURSE - Add a new course
{
  "type": "CREATE_COURSE",
  "name": "Course name",
  "code": "optional course code (e.g., CS101)",
  "credits": 3,
  "instructor": "optional instructor name",
  "color": "blue|green|red|purple|orange|yellow|pink",
  "target_grade": "optional target grade (A, B, etc.)"
}

### UPDATE_COURSE - Modify a course
{
  "type": "UPDATE_COURSE",
  "id": "course UUID (required)",
  "name": "new name (optional)",
  "instructor": "new instructor (optional)",
  "color": "new color (optional)"
}

### DELETE_COURSE - Remove a course
{
  "type": "DELETE_COURSE",
  "id": "course UUID (required)",
  "name": "course name for confirmation"
}

## CORNELL NOTES ACTIONS:

### CREATE_CORNELL_NOTES - Generate Cornell Notes from a topic
{
  "type": "CREATE_CORNELL_NOTES",
  "topic": "Topic or subject for notes (required)",
  "depthLevel": "brief | standard | comprehensive (default: standard)"
}

## WHEN TO USE CORNELL NOTES ACTIONS:
- User says "create/generate/make notes for X" → CREATE_CORNELL_NOTES
- User says "study notes for X" or "Cornell notes about X" → CREATE_CORNELL_NOTES
- User wants "quick notes" or "summary" → depthLevel: "brief"
- User wants "detailed" or "comprehensive" or "thorough" → depthLevel: "comprehensive"
- Default request → depthLevel: "standard"

## WHEN TO USE ACTIONS:
- User says "schedule/add/create X" → CREATE action
- User says "move/change/reschedule/update X" → UPDATE action
- User says "delete/remove/cancel X" → DELETE action
- User says "complete/finish/done with X" → COMPLETE action (for assignments)

## WHEN NOT TO USE ACTIONS:
- User is asking questions about their calendar/schedule
- User wants information or advice
- User is chatting casually

## FINDING ENTITY IDs:
When user refers to an entity by name (e.g., "delete my Physics exam"), you MUST:
1. Look in the calendar context provided to find the matching entity
2. Use the exact UUID/ID from the calendar data
3. If you cannot find the exact entity, ask the user to clarify which one they mean

Always include reply_markdown even when returning actions. If no actions are needed, omit the actions array entirely and just respond normally.
`;

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    const apiKey = lovableApiKey || openaiApiKey;
    const useGemini = !!lovableApiKey;
    
    if (!apiKey) {
      throw new Error('No AI API key configured (LOVABLE_API_KEY or OPENAI_API_KEY)');
    }

    console.log(`Starting AI chat with ${useGemini ? 'Lovable AI (Gemini)' : 'OpenAI'}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    let user: any = null;
    let userId: string | null = null;
    let userTimezone: string | undefined;
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data } = await supabase.auth.getUser(token);
        if (data?.user) {
          user = data.user;
          userId = data.user.id;
          
          // Fetch user's timezone from profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('timezone')
            .eq('user_id', userId)
            .single();
          
          userTimezone = profile?.timezone || undefined;
        }
      } catch (e) {
        console.log('Auth header present but user could not be resolved.');
      }
    }

    // Rate limiting
    const rlKey = userId ? `user:${userId}` : `ip:${ip}`;
    if (!checkRateLimit(rlKey, 20, 60000)) {
      console.log(`Rate limit exceeded for ${rlKey}`);
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { message, conversation_id, course_id, just_indexed_file_id } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing message:', message.substring(0, 100));
    if (just_indexed_file_id) {
      console.log('Recently indexed file ID:', just_indexed_file_id);
    }

    // ==========================================================================
    // CALENDAR RAG - Fetch real calendar data if this is a calendar query
    // ==========================================================================
    let calendarContext = '';
    if (userId && isCalendarQuery(message)) {
      console.log('Calendar query detected, fetching calendar data...');
      try {
        const calendarData = await fetchCalendarContext(supabase, userId, message, userTimezone);
        calendarContext = `
## 📅 USER'S ACTUAL CALENDAR DATA (Single Source of Truth)
This is the user's REAL calendar from the database. Use this information to answer their questions accurately.

${calendarData.summary}

---
**IMPORTANT**: Base your answer on the calendar data above. Do not say "no events" if events are listed. Do not make up events that aren't listed.
`;
        console.log(`Calendar RAG: Generated context with ${calendarData.events.length} events and ${calendarData.freeSlots.length} free slots`);
      } catch (calendarError) {
        console.error('Calendar RAG failed:', calendarError);
      }
    }

    // ==========================================================================
    // DOCUMENT RAG - Search uploaded documents
    // ==========================================================================
    let documentContext = '';
    const openaiApiKeyForRAG = Deno.env.get('OPENAI_API_KEY');
    
    if (userId && openaiApiKeyForRAG && !isCalendarQuery(message)) {
      try {
        const queryEmbedding = await generateQueryEmbedding(message, openaiApiKeyForRAG);
        
        if (queryEmbedding) {
          const relevantDocs = await searchDocuments(supabase, userId, queryEmbedding, course_id);
          
          if (relevantDocs.length > 0) {
            console.log(`Document RAG: Found ${relevantDocs.length} relevant documents`);
            
            const docContextParts = relevantDocs.map((doc, i) => {
              const source = doc.file_name || doc.source_type || 'Uploaded Document';
              return `[Source ${i + 1}: ${source} (${(doc.similarity * 100).toFixed(0)}% match)]\n${doc.content}`;
            });
            
            documentContext = `
## IMPORTANT: User's Uploaded Documents (Use This Information!)
The following content was extracted from documents the user has uploaded. Use this information to answer their questions accurately.

${docContextParts.join('\n\n---\n\n')}

When answering, cite the source (e.g., "According to your uploaded document...") if using this information.
`;
          }
        }
      } catch (ragError) {
        console.log('Document RAG retrieval failed:', ragError);
      }
    }

    // ==========================================================================
    // CONVERSATION HISTORY
    // ==========================================================================
    let conversationHistory: Array<{ role: string; content: string }> = [];
    if (conversation_id && userId) {
      try {
        const { data: historyRows } = await supabase
          .from('chat_messages')
          .select('message, is_user, created_at')
          .eq('conversation_id', conversation_id)
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .limit(20);

        if (historyRows && historyRows.length > 0) {
          conversationHistory = historyRows.map(row => ({
            role: row.is_user ? 'user' : 'assistant',
            content: row.message
          }));
          console.log(`Loaded ${conversationHistory.length} previous messages`);
        }
      } catch (error) {
        console.error('Failed to load conversation history:', error);
      }
    }

    // ==========================================================================
    // USER CONTEXT (Courses, pending assignments, etc.)
    // ==========================================================================
    let userContext = '';
    if (userId) {
      try {
        const [coursesResult, pendingAssignmentsResult, upcomingExamsResult, userStatsResult] = await Promise.all([
          supabase.from('courses').select('id, name, code, credits').eq('user_id', userId).eq('is_active', true).limit(10),
          supabase.from('assignments').select('id, title, due_date, priority').eq('user_id', userId).eq('is_completed', false).order('due_date', { ascending: true }).limit(10),
          supabase.from('exams').select('id, title, exam_date').eq('user_id', userId).gte('exam_date', new Date().toISOString()).order('exam_date', { ascending: true }).limit(5),
          supabase.from('user_stats').select('current_streak, total_study_hours').eq('user_id', userId).single()
        ]);

        const courses = coursesResult.data || [];
        const pendingAssignments = pendingAssignmentsResult.data || [];
        const upcomingExams = upcomingExamsResult.data || [];
        const userStats = userStatsResult.data;
        const currentDate = new Date().toISOString();

        // Build course list with IDs for AI to use
        const coursesList = courses.length > 0 
          ? courses.map(c => `  - "${c.name}" (ID: ${c.id}${c.code ? `, Code: ${c.code}` : ''})`).join('\n')
          : '  - No active courses';

        userContext = `
## User Context (${currentDate.split('T')[0]}):

### AVAILABLE COURSES (Use these exact IDs for course_id field!):
${coursesList}

### IMPORTANT - Course ID Instructions:
When creating assignments, exams, or study sessions that reference a course:
1. Look at the courses list above to find the matching course
2. Use the EXACT UUID from that list (e.g., "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
3. Do NOT generate placeholder text like "course_id_placeholder"
4. If user mentions a course by name, match it to the list and use its UUID
5. Also include "course_name" field with the human-readable name for display

### Academic Status:
- Pending assignments: ${pendingAssignments.length} (${pendingAssignments.slice(0, 3).map(a => `"${a.title}" due ${a.due_date.split('T')[0]}`).join(', ') || 'None'})
- Upcoming exams: ${upcomingExams.length} (${upcomingExams.slice(0, 2).map(e => `"${e.title}" on ${e.exam_date.split('T')[0]}`).join(', ') || 'None'})
- Study streak: ${userStats?.current_streak || 0} days
- User timezone: ${userTimezone || 'UTC'}
`;
      } catch (error) {
        console.log('Could not fetch user context:', error);
      }
    }

    // ==========================================================================
    // SYSTEM PROMPT
    // ==========================================================================
    const systemPrompt = `You are Ada, the intelligent academic assistant for Aqademiq.

## Your Role:
- Help students manage their academic schedules
- Create calendar events when requested
- Provide study tips and academic advice
- Answer questions using the user's uploaded documents and course materials
- Answer questions about the user's calendar using REAL calendar data from the database
- Be warm, concise, and action-oriented

${ACTION_SPEC}

${userContext ? userContext : ''}

${calendarContext ? calendarContext : ''}

${documentContext ? documentContext : ''}

## Response Guidelines:
1. Start with a **bolded summary** when helpful
2. Use markdown formatting (headers, bullets, bold)
3. For scheduling requests, ALWAYS return the JSON format with actions
4. For calendar questions, use the calendar data provided above - do NOT make up events
5. Be conversational but efficient
6. When using information from user documents, reference the source
7. Current datetime for reference: ${new Date().toISOString()}
8. If asked about calendar/schedule/events, ALWAYS check the "USER'S ACTUAL CALENDAR DATA" section first
`;

    // ==========================================================================
    // CALL AI API
    // ==========================================================================
    const apiUrl = useGemini 
      ? 'https://ai.gateway.lovable.dev/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';
    
    const model = useGemini ? 'google/gemini-2.5-flash' : 'gpt-4o-mini';

    const requestBody = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 2000
    };

    console.log('Calling AI API:', apiUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const aiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!aiResponse.ok) {
      const errorBody = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorBody);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again shortly.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const rawContent = aiResult.choices?.[0]?.message?.content ?? '';

    console.log('Raw AI response length:', rawContent.length);

    // Parse response for actions
    let parsedResponse = {
      reply_markdown: rawContent,
      actions: [] as any[]
    };

    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*"reply_markdown"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.reply_markdown) {
          parsedResponse = {
            reply_markdown: parsed.reply_markdown,
            actions: parsed.actions || []
          };
          console.log('Extracted structured response with', parsedResponse.actions.length, 'actions');
        }
      } else {
        if (rawContent.trim().startsWith('{')) {
          const parsed = JSON.parse(rawContent);
          if (parsed.reply_markdown) {
            parsedResponse = {
              reply_markdown: parsed.reply_markdown,
              actions: parsed.actions || []
            };
          }
        }
      }
    } catch (parseError) {
      console.log('Response is plain markdown (no actions)');
    }

    // Validate actions - support all CRUD action types
    const validatedActions = parsedResponse.actions.filter(action => {
      switch (action.type) {
        // Event actions
        case 'CREATE_EVENT':
          return action.title && action.start_iso && action.end_iso;
        case 'UPDATE_EVENT':
          return action.id && (action.title || action.start_iso || action.end_iso || action.location !== undefined);
        case 'DELETE_EVENT':
          return action.id;
        
        // Assignment actions
        case 'CREATE_ASSIGNMENT':
          return action.title && action.course_id && action.due_date;
        case 'UPDATE_ASSIGNMENT':
          return action.id;
        case 'DELETE_ASSIGNMENT':
          return action.id;
        case 'COMPLETE_ASSIGNMENT':
          return action.id;
        
        // Exam actions
        case 'CREATE_EXAM':
          return action.title && action.course_id && action.exam_date;
        case 'UPDATE_EXAM':
          return action.id;
        case 'DELETE_EXAM':
          return action.id;
        
        // Study session actions
        case 'CREATE_STUDY_SESSION':
          return action.title && action.scheduled_start && action.scheduled_end;
        case 'UPDATE_STUDY_SESSION':
          return action.id;
        case 'DELETE_STUDY_SESSION':
          return action.id;
        
        // Course actions
        case 'CREATE_COURSE':
          return action.name;
        case 'UPDATE_COURSE':
          return action.id;
        case 'DELETE_COURSE':
          return action.id;
        
        // Cornell Notes actions
        case 'CREATE_CORNELL_NOTES':
          return action.topic;
        
        default:
          console.log('Unknown action type:', action.type);
          return false;
      }
    });

    console.log('Validated actions:', validatedActions.length);

    return new Response(
      JSON.stringify({ 
        response: parsedResponse.reply_markdown,
        metadata: {
          model,
          provider: useGemini ? 'lovable-ai' : 'openai',
          timestamp: new Date().toISOString(),
          user_context_included: !!userContext,
          calendar_context_included: !!calendarContext,
          document_context_included: !!documentContext,
          actions: validatedActions,
          has_actions: validatedActions.length > 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in AI chat:', error);
    return new Response(
      JSON.stringify({ 
        response: "I'm sorry, I encountered an error. Please try again.",
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          actions: [],
          has_actions: false
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
