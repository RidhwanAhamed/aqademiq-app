/**
 * AI Chat Edge Function with Context Window Management
 * Purpose: Process user messages with intelligent context window, summarization,
 * and action tracking to prevent duplicate operations
 * Backend integration: Lovable AI Gateway (google/gemini-2.5-flash)
 */
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =============================================================================
// CONTEXT WINDOW CONFIGURATION
// =============================================================================
const MAX_CONTEXT_TOKENS = 6000; // Reserve space for system prompt + response
const SUMMARY_THRESHOLD_TOKENS = 4000; // Trigger summarization when exceeded
const MIN_RECENT_MESSAGES = 4; // Always keep at least 4 recent messages
const SUMMARIZATION_TEMPERATURE = 0.3; // Lower temperature for consistent summaries

// =============================================================================
// TOKEN ESTIMATION
// =============================================================================

/**
 * Estimate token count for text (model-aware approximation)
 * Uses ~4 characters per token for English text
 */
function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Estimate total tokens for a message array
 */
function estimateMessagesTokenCount(messages: Array<{ role: string; content: string }>): number {
  return messages.reduce((sum, msg) => {
    // Add overhead for role markers (~4 tokens per message)
    return sum + estimateTokenCount(msg.content) + 4;
  }, 0);
}

// =============================================================================
// CALENDAR DATA TYPES
// =============================================================================

interface ScheduleBlock {
  id: string;
  title: string;
  start_time: string;
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
  id: string;
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

function parseTimeToDate(date: Date, timeStr: string): Date {
  const parts = timeStr.split(':').map(Number);
  const result = new Date(date);
  result.setHours(parts[0] || 0, parts[1] || 0, parts[2] || 0, 0);
  return result;
}

function formatTimeForDisplay(date: Date): string {
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
}

function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek] || 'Unknown';
}

function shouldClassOccurOnDate(block: ScheduleBlock, date: Date): boolean {
  if (!block.is_recurring) {
    if (block.specific_date) {
      const specificDate = new Date(block.specific_date);
      return specificDate.toDateString() === date.toDateString();
    }
    return false;
  }
  if (block.day_of_week !== null) {
    return date.getDay() === block.day_of_week;
  }
  return false;
}

function getDateRange(query: string, now: Date): { start: Date; end: Date; label: string } {
  const lowerQuery = query.toLowerCase();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  
  if (lowerQuery.includes('today')) {
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
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return { start: weekStart, end: weekEnd, label: 'this week' };
  }
  if (lowerQuery.includes('next week')) {
    const nextWeekStart = new Date(startOfDay);
    nextWeekStart.setDate(nextWeekStart.getDate() - nextWeekStart.getDay() + 7);
    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);
    nextWeekEnd.setHours(23, 59, 59, 999);
    return { start: nextWeekStart, end: nextWeekEnd, label: 'next week' };
  }
  return { start: startOfDay, end: endOfDay, label: 'today' };
}

// =============================================================================
// CONTEXT WINDOW MANAGER
// =============================================================================

interface ContextMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  token_count: number;
  is_summary: boolean;
  created_at: string;
  metadata?: any;
}

interface ContextWindowResult {
  messages: Array<{ role: string; content: string }>;
  totalTokens: number;
  summarizedCount: number;
  summaryText?: string;
}

/**
 * Extract action outcomes from conversation history
 * This prevents the AI from repeating already-executed actions
 */
function extractActionOutcomes(messages: ContextMessage[]): string {
  const outcomes: string[] = [];
  
  for (const msg of messages) {
    if (!msg.is_summary && msg.metadata?.actions_executed) {
      for (const action of msg.metadata.actions_executed) {
        outcomes.push(`- ${action.type}: ${action.title || action.name || 'unnamed'} (${action.result || 'completed'})`);
      }
    }
    
    // Also extract from message content patterns
    if (!msg.is_summary && msg.role === 'assistant') {
      const createPatterns = msg.content.match(/✅.*?(Created|Added|Scheduled|Deleted|Updated|Completed).*?[\"*]([^\"*]+)[\"*]/gi);
      if (createPatterns) {
        for (const pattern of createPatterns) {
          outcomes.push(`- Action: ${pattern.replace(/[✅🗑️📅📝📚📖]/g, '').trim()}`);
        }
      }
    }
  }
  
  return outcomes.length > 0 
    ? `\n## PREVIOUSLY EXECUTED ACTIONS (DO NOT REPEAT):\n${outcomes.join('\n')}\n`
    : '';
}

/**
 * Build context window with intelligent summarization
 */
async function buildContextWindow(
  supabase: any,
  userId: string,
  conversationId: string,
  apiKey: string,
  useGemini: boolean
): Promise<ContextWindowResult> {
  // Fetch conversation history with token counts
  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select('id, message, is_user, created_at, token_count, is_summary, metadata')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error || !messages || messages.length === 0) {
    console.log('No conversation history found');
    return { messages: [], totalTokens: 0, summarizedCount: 0 };
  }

  // Transform to ContextMessage format
  const contextMessages: ContextMessage[] = messages.map((m: any) => ({
    id: m.id,
    role: m.is_user ? 'user' : 'assistant',
    content: m.message,
    token_count: m.token_count || estimateTokenCount(m.message),
    is_summary: m.is_summary || false,
    created_at: m.created_at,
    metadata: m.metadata
  }));

  // Calculate total tokens
  let totalTokens = contextMessages.reduce((sum, m) => sum + m.token_count, 0);
  console.log(`Context window: ${contextMessages.length} messages, ${totalTokens} tokens`);

  // Check if we have an existing summary
  const existingSummary = contextMessages.find(m => m.is_summary);
  
  // If under threshold, return all messages with action outcomes
  if (totalTokens <= SUMMARY_THRESHOLD_TOKENS) {
    const actionOutcomes = extractActionOutcomes(contextMessages);
    const formattedMessages = contextMessages
      .filter(m => !m.is_summary || m === existingSummary)
      .map(m => ({
        role: m.is_summary ? 'system' : m.role,
        content: m.is_summary ? `[Previous Conversation Summary]\n${m.content}` : m.content
      }));
    
    // Inject action outcomes as system context if present
    if (actionOutcomes) {
      formattedMessages.unshift({
        role: 'system',
        content: actionOutcomes
      });
    }
    
    return { 
      messages: formattedMessages, 
      totalTokens,
      summarizedCount: 0 
    };
  }

  // Need to summarize - find messages to summarize (older ones)
  console.log('Token threshold exceeded, triggering summarization...');
  
  // Keep recent messages (at least MIN_RECENT_MESSAGES)
  const recentMessages = contextMessages.slice(-MIN_RECENT_MESSAGES);
  const olderMessages = contextMessages.slice(0, -MIN_RECENT_MESSAGES)
    .filter(m => !m.is_summary);
  
  if (olderMessages.length < 2) {
    // Not enough to summarize, return as-is
    const actionOutcomes = extractActionOutcomes(contextMessages);
    const formattedMessages = contextMessages.map(m => ({
      role: m.role,
      content: m.content
    }));
    
    if (actionOutcomes) {
      formattedMessages.unshift({ role: 'system', content: actionOutcomes });
    }
    
    return { messages: formattedMessages, totalTokens, summarizedCount: 0 };
  }

  // Generate summary of older messages
  const summaryText = await generateConversationSummary(
    olderMessages,
    apiKey,
    useGemini
  );

  if (!summaryText) {
    console.log('Summarization failed, using truncated history');
    const actionOutcomes = extractActionOutcomes(recentMessages);
    const formattedMessages = recentMessages.map(m => ({
      role: m.role,
      content: m.content
    }));
    
    if (actionOutcomes) {
      formattedMessages.unshift({ role: 'system', content: actionOutcomes });
    }
    
    return { 
      messages: formattedMessages, 
      totalTokens: recentMessages.reduce((sum, m) => sum + m.token_count, 0),
      summarizedCount: olderMessages.length 
    };
  }

  // Store summary in database
  try {
    const summarizedIds = olderMessages.map(m => m.id);
    await supabase.from('chat_messages').insert({
      user_id: userId,
      conversation_id: conversationId,
      message: summaryText,
      is_user: false,
      is_summary: true,
      summary_of_message_ids: summarizedIds,
      token_count: estimateTokenCount(summaryText),
      metadata: { 
        summarized_count: olderMessages.length,
        summarized_at: new Date().toISOString()
      }
    });
    
    console.log(`Stored summary covering ${olderMessages.length} messages`);
  } catch (err) {
    console.error('Failed to store summary:', err);
  }

  // Build final context with summary + recent messages
  const actionOutcomes = extractActionOutcomes([...olderMessages, ...recentMessages]);
  const finalMessages: Array<{ role: string; content: string }> = [];
  
  if (actionOutcomes) {
    finalMessages.push({ role: 'system', content: actionOutcomes });
  }
  
  finalMessages.push({
    role: 'system',
    content: `[Conversation Summary - Earlier Messages]\n${summaryText}\n\n[End of Summary - Recent messages follow]`
  });
  
  for (const msg of recentMessages) {
    finalMessages.push({ role: msg.role, content: msg.content });
  }

  const finalTokens = estimateMessagesTokenCount(finalMessages);
  console.log(`Context window after summarization: ${finalMessages.length} messages, ${finalTokens} tokens`);

  return {
    messages: finalMessages,
    totalTokens: finalTokens,
    summarizedCount: olderMessages.length,
    summaryText
  };
}

/**
 * Generate a summary of conversation messages
 * Preserves intent, decisions, and constraints
 */
async function generateConversationSummary(
  messages: ContextMessage[],
  apiKey: string,
  useGemini: boolean
): Promise<string | null> {
  if (messages.length === 0) return null;

  const conversationText = messages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  const summaryPrompt = `You are a conversation summarizer for an academic assistant app. 
Summarize the following conversation while preserving:
1. All ACTIONS taken (events created, deleted, updated, assignments completed, etc.)
2. Key decisions made by the user
3. Important constraints mentioned (times, dates, preferences)
4. Any entities mentioned (courses, assignments, exams, events) with their IDs if available
5. The user's intent and goals

Be concise but comprehensive. Format as bullet points.

CRITICAL: For any CREATE, UPDATE, or DELETE action that was executed, clearly state:
- What was created/updated/deleted
- The entity name and ID (if available)
- This prevents duplicate operations

CONVERSATION TO SUMMARIZE:
${conversationText}

SUMMARY:`;

  try {
    const apiUrl = useGemini 
      ? 'https://ai.gateway.lovable.dev/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: useGemini ? 'google/gemini-2.5-flash' : 'gpt-4o-mini',
        messages: [{ role: 'user', content: summaryPrompt }],
        temperature: SUMMARIZATION_TEMPERATURE,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      console.error('Summary API error:', response.status);
      return null;
    }

    const result = await response.json();
    const summary = result.choices?.[0]?.message?.content;
    console.log('Generated summary:', summary?.substring(0, 200));
    return summary || null;
  } catch (err) {
    console.error('Summarization error:', err);
    return null;
  }
}

// =============================================================================
// CALENDAR RAG
// =============================================================================

interface CalendarContext {
  events: CalendarEvent[];
  freeSlots: Array<{ start: Date; end: Date }>;
  summary: string;
  dateRange: { start: Date; end: Date; label: string };
}

async function fetchCalendarContext(
  supabase: any,
  userId: string,
  query: string,
  timezone?: string
): Promise<CalendarContext> {
  const now = getCurrentDate(timezone);
  const dateRange = getDateRange(query, now);
  
  console.log(`Calendar RAG: Fetching events for ${dateRange.label}`);
  
  const [scheduleBlocksResult, assignmentsResult, examsResult, studySessionsResult] = await Promise.all([
    supabase.from('schedule_blocks').select('*, courses(name, color)').eq('user_id', userId).eq('is_active', true),
    supabase.from('assignments').select('*, courses(name)').eq('user_id', userId).gte('due_date', dateRange.start.toISOString()).lte('due_date', dateRange.end.toISOString()),
    supabase.from('exams').select('*, courses(name)').eq('user_id', userId).gte('exam_date', dateRange.start.toISOString()).lte('exam_date', dateRange.end.toISOString()),
    supabase.from('study_sessions').select('*, courses(name)').eq('user_id', userId).gte('scheduled_start', dateRange.start.toISOString()).lte('scheduled_end', dateRange.end.toISOString())
  ]);
  
  const scheduleBlocks: ScheduleBlock[] = scheduleBlocksResult.data || [];
  const assignments: Assignment[] = assignmentsResult.data || [];
  const exams: Exam[] = examsResult.data || [];
  const studySessions: StudySession[] = studySessionsResult.data || [];
  
  const events: CalendarEvent[] = [];
  
  // Process schedule blocks
  for (const block of scheduleBlocks) {
    const currentDate = new Date(dateRange.start);
    while (currentDate <= dateRange.end) {
      if (shouldClassOccurOnDate(block, currentDate)) {
        events.push({
          id: block.id,
          type: 'class',
          title: block.title,
          start: parseTimeToDate(currentDate, block.start_time),
          end: parseTimeToDate(currentDate, block.end_time),
          location: block.location || undefined,
          courseName: block.courses?.name,
          isRecurring: block.is_recurring,
          dayOfWeek: block.day_of_week ?? undefined
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  // Process assignments
  for (const assignment of assignments) {
    const dueDate = new Date(assignment.due_date);
    events.push({
      id: assignment.id,
      type: 'assignment',
      title: `📝 ${assignment.title} (Due)`,
      start: dueDate,
      end: new Date(dueDate.getTime() + 3600000),
      courseName: assignment.courses?.name
    });
  }
  
  // Process exams
  for (const exam of exams) {
    const examDate = new Date(exam.exam_date);
    events.push({
      id: exam.id,
      type: 'exam',
      title: `📚 ${exam.title} (Exam)`,
      start: examDate,
      end: new Date(examDate.getTime() + (exam.duration_minutes || 60) * 60000),
      location: exam.location || undefined,
      courseName: exam.courses?.name
    });
  }
  
  // Process study sessions
  for (const session of studySessions) {
    events.push({
      id: session.id,
      type: 'study_session',
      title: `📖 ${session.title}`,
      start: new Date(session.scheduled_start),
      end: new Date(session.scheduled_end),
      courseName: session.courses?.name
    });
  }
  
  events.sort((a, b) => a.start.getTime() - b.start.getTime());
  
  const freeSlots = computeFreeTimeSlots(events, dateRange.start, dateRange.end);
  const summary = generateCalendarSummary(events, freeSlots, dateRange, now);
  
  return { events, freeSlots, summary, dateRange };
}

function computeFreeTimeSlots(events: CalendarEvent[], rangeStart: Date, rangeEnd: Date): Array<{ start: Date; end: Date }> {
  const freeSlots: Array<{ start: Date; end: Date }> = [];
  const currentDay = new Date(rangeStart);
  
  while (currentDay <= rangeEnd) {
    const dayStart = new Date(currentDay);
    dayStart.setHours(8, 0, 0, 0);
    const dayEnd = new Date(currentDay);
    dayEnd.setHours(22, 0, 0, 0);
    
    const dayEvents = events.filter(e => e.start.toDateString() === currentDay.toDateString())
      .sort((a, b) => a.start.getTime() - b.start.getTime());
    
    let cursor = dayStart;
    for (const event of dayEvents) {
      if (event.start > cursor && (event.start.getTime() - cursor.getTime()) >= 1800000) {
        freeSlots.push({ start: new Date(cursor), end: new Date(event.start) });
      }
      if (event.end > cursor) cursor = new Date(event.end);
    }
    
    if (cursor < dayEnd && (dayEnd.getTime() - cursor.getTime()) >= 1800000) {
      freeSlots.push({ start: new Date(cursor), end: new Date(dayEnd) });
    }
    
    currentDay.setDate(currentDay.getDate() + 1);
  }
  
  return freeSlots;
}

function generateCalendarSummary(events: CalendarEvent[], freeSlots: Array<{ start: Date; end: Date }>, dateRange: { label: string }, now: Date): string {
  const lines: string[] = [`## 📅 Calendar for ${dateRange.label}`, `*Generated at ${formatTimeForDisplay(now)}*\n`];
  
  if (events.length === 0) {
    lines.push(`🎉 **No scheduled events ${dateRange.label}!**`);
  } else {
    lines.push(`### Scheduled Events (${events.length} total)\n`);
    
    const eventsByDay = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const dayKey = event.start.toDateString();
      if (!eventsByDay.has(dayKey)) eventsByDay.set(dayKey, []);
      eventsByDay.get(dayKey)!.push(event);
    }
    
    for (const [dayKey, dayEvents] of eventsByDay) {
      const dayDate = new Date(dayKey);
      const isToday = dayDate.toDateString() === now.toDateString();
      lines.push(`**${isToday ? '📍 Today' : getDayName(dayDate.getDay())}, ${dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}:**`);
      
      for (const event of dayEvents) {
        const timeRange = `${formatTimeForDisplay(event.start)} - ${formatTimeForDisplay(event.end)}`;
        lines.push(`- ${timeRange}: ${event.title}${event.courseName ? ` (${event.courseName})` : ''}${event.location ? ` @ ${event.location}` : ''} [ID: ${event.id}]`);
      }
      lines.push('');
    }
  }
  
  if (freeSlots.length > 0) {
    lines.push(`### ⏰ Available Time Slots\n`);
    const slotsByDay = new Map<string, typeof freeSlots>();
    for (const slot of freeSlots.slice(0, 10)) {
      const dayKey = slot.start.toDateString();
      if (!slotsByDay.has(dayKey)) slotsByDay.set(dayKey, []);
      slotsByDay.get(dayKey)!.push(slot);
    }
    
    for (const [dayKey, daySlots] of slotsByDay) {
      const dayDate = new Date(dayKey);
      lines.push(`**${getDayName(dayDate.getDay())}:** ${daySlots.map(s => `${formatTimeForDisplay(s.start)}-${formatTimeForDisplay(s.end)}`).join(', ')}`);
    }
  }
  
  return lines.join('\n');
}

// =============================================================================
// DOCUMENT RAG
// =============================================================================

async function generateQueryEmbedding(query: string, apiKey: string): Promise<number[] | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: query })
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch { return null; }
}

async function searchDocuments(supabase: any, userId: string, embedding: number[], courseId?: string): Promise<any[]> {
  try {
    const { data } = await supabase.rpc('search_documents', {
      p_user_id: userId,
      p_query_embedding: JSON.stringify(embedding),
      p_match_threshold: 0.35,
      p_match_count: 5,
      p_course_id: courseId || null
    });
    return data || [];
  } catch { return []; }
}

// =============================================================================
// CALENDAR QUERY DETECTION
// =============================================================================

function isCalendarQuery(message: string): boolean {
  const calendarKeywords = [
    'schedule', 'calendar', 'today', 'tomorrow', 'this week', 'next week',
    'free time', 'busy', 'available', 'class', 'classes', 'event', 'events',
    'appointment', 'meeting', 'when', 'what time', 'do i have', 'show me',
    'my day', 'plans', 'upcoming', 'study session', 'exam', 'assignment',
    'due', 'deadline', 'create', 'schedule', 'add', 'delete', 'remove',
    'cancel', 'update', 'move', 'reschedule', 'change'
  ];
  const lowerMessage = message.toLowerCase();
  return calendarKeywords.some(kw => lowerMessage.includes(kw));
}

// =============================================================================
// RATE LIMITING
// =============================================================================

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string, maxRequests = 20, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (record.count >= maxRequests) return false;
  record.count++;
  return true;
}

// =============================================================================
// ACTION SPECIFICATION
// =============================================================================

const ACTION_SPEC = `
## AGENTIC RESPONSE FORMAT
When the user asks to create, update, delete, or manage their calendar, respond with JSON:

{
  "reply_markdown": "Your conversational response in markdown",
  "actions": [{ "type": "ACTION_TYPE", ...fields }]
}

## CRITICAL: DUPLICATE ACTION PREVENTION
Before creating, updating, or deleting ANY entity:
1. CHECK the "PREVIOUSLY EXECUTED ACTIONS" section in the context
2. If an action was already executed (e.g., "Created Event X"), DO NOT repeat it
3. If user asks to delete something that was just created, find the ID from the action history
4. When referencing existing entities, use IDs from the calendar context or action history

## TIME FORMAT RULES:
- Use LOCAL format: "YYYY-MM-DDTHH:MM:SS" (NO "Z" suffix!)

## EVENT ACTIONS:
CREATE_EVENT: { type, title, start_iso, end_iso, location?, notes?, course_id? }
UPDATE_EVENT: { type, id (required), title?, start_iso?, end_iso?, location? }
DELETE_EVENT: { type, id (required), title? }

## ASSIGNMENT ACTIONS:
CREATE_ASSIGNMENT: { type, title, course_id, due_date, description?, priority?, estimated_hours?, assignment_type? }
UPDATE_ASSIGNMENT: { type, id (required), title?, due_date?, priority?, is_completed? }
DELETE_ASSIGNMENT: { type, id (required), title? }
COMPLETE_ASSIGNMENT: { type, id (required), title? }

## EXAM ACTIONS:
CREATE_EXAM: { type, title, course_id, exam_date, duration_minutes?, location?, exam_type?, notes? }
UPDATE_EXAM: { type, id (required), title?, exam_date?, location? }
DELETE_EXAM: { type, id (required), title? }

## STUDY SESSION ACTIONS:
CREATE_STUDY_SESSION: { type, title, scheduled_start, scheduled_end, course_id?, exam_id?, assignment_id?, notes? }
UPDATE_STUDY_SESSION: { type, id (required), title?, scheduled_start?, scheduled_end?, status? }
DELETE_STUDY_SESSION: { type, id (required), title? }

## COURSE ACTIONS:
CREATE_COURSE: { type, name, code?, credits?, instructor?, color?, target_grade? }
UPDATE_COURSE: { type, id (required), name?, instructor?, color? }
DELETE_COURSE: { type, id (required), name? }

## CORNELL NOTES:
CREATE_CORNELL_NOTES: { type, topic, depthLevel?: "brief"|"standard"|"comprehensive" }

## FINDING ENTITY IDs:
1. Check "PREVIOUSLY EXECUTED ACTIONS" for recently created entity IDs
2. Check calendar context for existing entity IDs
3. NEVER fabricate UUIDs - use only IDs from provided context
4. If ID not found, ask user to clarify
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
    
    if (!apiKey) throw new Error('No AI API key configured');

    console.log(`AI chat starting with ${useGemini ? 'Lovable AI' : 'OpenAI'}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const authHeader = req.headers.get('Authorization');
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    let userId: string | null = null;
    let userTimezone: string | undefined;
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data } = await supabase.auth.getUser(token);
        if (data?.user) {
          userId = data.user.id;
          const { data: profile } = await supabase.from('profiles').select('timezone').eq('user_id', userId).single();
          userTimezone = profile?.timezone;
        }
      } catch {}
    }

    const { message, conversation_id, course_id, just_indexed_file_id } = await req.json();

    // Token rate limiting
    if (userId) {
      try {
        const { data: usageData } = await supabase.rpc('get_daily_token_usage', { p_user_id: userId });
        if (usageData?.[0]?.is_limit_exceeded) {
          return new Response(JSON.stringify({ 
            error: 'Daily token limit reached. Try again tomorrow.',
            usage: { used: Number(usageData[0].total_tokens_today), limit: 50000, remaining: 0 }
          }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      } catch {}
    }

    const rlKey = userId ? `user:${userId}` : `ip:${ip}`;
    if (!checkRateLimit(rlKey)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Processing:', message.substring(0, 100));

    // ==========================================================================
    // BUILD CONTEXT WINDOW WITH SUMMARIZATION
    // ==========================================================================
    let conversationHistory: Array<{ role: string; content: string }> = [];
    let contextSummaryInfo = '';
    
    if (conversation_id && userId) {
      const contextResult = await buildContextWindow(
        supabase,
        userId,
        conversation_id,
        apiKey,
        useGemini
      );
      
      conversationHistory = contextResult.messages;
      
      if (contextResult.summarizedCount > 0) {
        contextSummaryInfo = `\n[Context: ${contextResult.summarizedCount} older messages summarized]`;
        console.log(`Context window: summarized ${contextResult.summarizedCount} messages`);
      }
    }

    // ==========================================================================
    // CALENDAR RAG
    // ==========================================================================
    let calendarContext = '';
    if (userId && isCalendarQuery(message)) {
      try {
        const calendarData = await fetchCalendarContext(supabase, userId, message, userTimezone);
        calendarContext = `
## 📅 USER'S CALENDAR DATA (Single Source of Truth)
${calendarData.summary}

**IMPORTANT**: Base answers on this data. Do not invent events.
`;
      } catch (err) {
        console.error('Calendar RAG failed:', err);
      }
    }

    // ==========================================================================
    // DOCUMENT RAG
    // ==========================================================================
    let documentContext = '';
    if (userId && openaiApiKey) {
      try {
        const embedding = await generateQueryEmbedding(message, openaiApiKey);
        if (embedding) {
          const docs = await searchDocuments(supabase, userId, embedding, course_id);
          if (docs.length > 0) {
            documentContext = `
## User's Uploaded Documents
${docs.map((d, i) => `[Source ${i + 1}: ${d.file_name || 'Document'}]\n${d.content}`).join('\n\n---\n\n')}
`;
          }
        }
      } catch {}
    }

    // ==========================================================================
    // USER CONTEXT
    // ==========================================================================
    let userContext = '';
    if (userId) {
      try {
        const [coursesResult, assignmentsResult, examsResult, statsResult] = await Promise.all([
          supabase.from('courses').select('id, name, code').eq('user_id', userId).eq('is_active', true).limit(10),
          supabase.from('assignments').select('id, title, due_date, is_completed, courses(name)').eq('user_id', userId).order('due_date').limit(20),
          supabase.from('exams').select('id, title, exam_date, courses(name)').eq('user_id', userId).gte('exam_date', new Date().toISOString()).limit(10),
          supabase.from('user_stats').select('current_streak').eq('user_id', userId).single()
        ]);

        const courses = coursesResult.data || [];
        const assignments = assignmentsResult.data || [];
        const exams = examsResult.data || [];

        userContext = `
## User Context (${new Date().toISOString().split('T')[0]}):

### COURSES (use these IDs):
${courses.map(c => `- "${c.name}" (ID: ${c.id})`).join('\n') || '- No courses'}

### ASSIGNMENTS:
${assignments.map((a: any) => `- "${a.title}" (ID: ${a.id}, Due: ${a.due_date?.split('T')[0]}, ${a.is_completed ? 'DONE' : 'PENDING'})`).join('\n') || '- No assignments'}

### EXAMS:
${exams.map((e: any) => `- "${e.title}" (ID: ${e.id}, Date: ${e.exam_date?.split('T')[0]})`).join('\n') || '- No exams'}

Timezone: ${userTimezone || 'UTC'}
`;
      } catch {}
    }

    // ==========================================================================
    // SYSTEM PROMPT
    // ==========================================================================
    const systemPrompt = `You are Ada, the intelligent academic assistant for Aqademiq.

## Your Role:
- Help students manage their academic schedules
- Create/update/delete calendar events, assignments, exams, study sessions
- Provide study tips and academic advice
- Use provided calendar data and documents to answer questions

${ACTION_SPEC}

${userContext}
${calendarContext}
${documentContext}

## Response Guidelines:
1. Use markdown formatting
2. For scheduling requests, return JSON with actions
3. NEVER repeat actions that appear in "PREVIOUSLY EXECUTED ACTIONS"
4. For calendar questions, use the provided calendar data
5. Current datetime: ${new Date().toISOString()}
${contextSummaryInfo}

## Schedule Formatting:
Format schedules as readable markdown with dates and times, NOT raw JSON.
`;

    // ==========================================================================
    // CALL AI API
    // ==========================================================================
    const apiUrl = useGemini 
      ? 'https://ai.gateway.lovable.dev/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';
    
    const requestBody = {
      model: useGemini ? 'google/gemini-2.5-flash' : 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 2000
    };

    console.log('Calling AI API with', requestBody.messages.length, 'messages');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const aiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!aiResponse.ok) {
      const errorBody = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorBody);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again shortly.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const rawContent = aiResult.choices?.[0]?.message?.content ?? '';
    const tokenUsage = aiResult.usage || {};

    console.log('AI response length:', rawContent.length, 'tokens:', tokenUsage.total_tokens);

    // Record token usage
    if (userId && tokenUsage.total_tokens) {
      try {
        await supabase.from('ai_token_usage').insert({
          user_id: userId,
          prompt_tokens: tokenUsage.prompt_tokens || 0,
          completion_tokens: tokenUsage.completion_tokens || 0,
          total_tokens: tokenUsage.total_tokens || 0,
          function_name: 'ai-chat',
          request_metadata: { message_preview: message.substring(0, 100), conversation_id }
        });
      } catch {}
    }

    // Parse response
    let parsedResponse = { reply_markdown: rawContent, actions: [] as any[] };

    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\"reply_markdown\"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.reply_markdown) {
          parsedResponse = { reply_markdown: parsed.reply_markdown, actions: parsed.actions || [] };
        }
      } else if (rawContent.trim().startsWith('{')) {
        const parsed = JSON.parse(rawContent);
        if (parsed.reply_markdown) {
          parsedResponse = { reply_markdown: parsed.reply_markdown, actions: parsed.actions || [] };
        }
      }
    } catch {}

    // Validate actions
    const validatedActions = parsedResponse.actions.filter(action => {
      switch (action.type) {
        case 'CREATE_EVENT': return action.title && action.start_iso && action.end_iso;
        case 'UPDATE_EVENT': return action.id;
        case 'DELETE_EVENT': return action.id;
        case 'CREATE_ASSIGNMENT': return action.title && action.course_id && action.due_date;
        case 'UPDATE_ASSIGNMENT': return action.id;
        case 'DELETE_ASSIGNMENT': return action.id;
        case 'COMPLETE_ASSIGNMENT': return action.id;
        case 'CREATE_EXAM': return action.title && action.course_id && action.exam_date;
        case 'UPDATE_EXAM': return action.id;
        case 'DELETE_EXAM': return action.id;
        case 'CREATE_STUDY_SESSION': return action.title && action.scheduled_start && action.scheduled_end;
        case 'UPDATE_STUDY_SESSION': return action.id;
        case 'DELETE_STUDY_SESSION': return action.id;
        case 'CREATE_COURSE': return action.name;
        case 'UPDATE_COURSE': return action.id;
        case 'DELETE_COURSE': return action.id;
        case 'CREATE_CORNELL_NOTES': return action.topic;
        default: return false;
      }
    });

    console.log('Validated actions:', validatedActions.length);

    // Get updated usage
    let currentUsage = null;
    if (userId) {
      try {
        const { data: usageData } = await supabase.rpc('get_daily_token_usage', { p_user_id: userId });
        if (usageData?.[0]) {
          currentUsage = {
            used: Number(usageData[0].total_tokens_today),
            limit: 50000,
            remaining: Number(usageData[0].remaining_tokens),
            resets_at: usageData[0].resets_at
          };
        }
      } catch {}
    }

    return new Response(
      JSON.stringify({ 
        response: parsedResponse.reply_markdown,
        metadata: {
          model: useGemini ? 'google/gemini-2.5-flash' : 'gpt-4o-mini',
          provider: useGemini ? 'lovable-ai' : 'openai',
          timestamp: new Date().toISOString(),
          actions: validatedActions,
          has_actions: validatedActions.length > 0,
          context_info: contextSummaryInfo || undefined
        },
        usage: currentUsage,
        tokens_used: tokenUsage.total_tokens || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('AI chat error:', error);
    return new Response(
      JSON.stringify({ 
        response: "I'm sorry, I encountered an error. Please try again.",
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: { actions: [], has_actions: false }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
