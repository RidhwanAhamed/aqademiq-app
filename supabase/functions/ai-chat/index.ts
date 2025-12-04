/**
 * AI Chat Edge Function with Agentic Capabilities
 * Purpose: Process user messages and return structured actions for calendar/scheduling
 * Backend integration: Lovable AI Gateway (google/gemini-2.5-flash)
 */
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting store (in-memory, resets on function restart)
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

// Action schema specification for agentic responses
// IMPORTANT: The AI must use LOCAL time without "Z" suffix so frontend treats times correctly
const ACTION_SPEC = `
## AGENTIC RESPONSE FORMAT
When the user asks to schedule, create, or add something to their calendar, respond with structured JSON:

{
  "reply_markdown": "Your conversational response in markdown",
  "actions": [
    {
      "type": "CREATE_EVENT",
      "title": "Event title",
      "start_iso": "2025-12-01T19:00:00",
      "end_iso": "2025-12-01T20:30:00",
      "location": "optional location",
      "notes": "optional notes"
    }
  ]
}

## CRITICAL TIME FORMAT RULES:
- **DO NOT** use "Z" suffix or timezone offsets in start_iso/end_iso
- Times should be in LOCAL format: "YYYY-MM-DDTHH:MM:SS" (no Z at the end!)
- When user says "10 AM", use "T10:00:00" NOT "T10:00:00Z"
- Example: "tomorrow at 2pm" → "2025-12-05T14:00:00" (assuming tomorrow is Dec 5)

## ACTION TYPES:
- CREATE_EVENT: Schedule a new calendar event
  - title (required): Clear, descriptive event name
  - start_iso (required): ISO 8601 datetime in LOCAL time (no Z suffix!)
  - end_iso (required): ISO 8601 datetime in LOCAL time (no Z suffix!)
  - location (optional): Where the event takes place
  - notes (optional): Additional details

## WHEN TO USE ACTIONS:
- User says "schedule X at Y time"
- User says "add X to my calendar"
- User says "create a study session for X"
- User says "book time for X"
- User says "remind me to X at Y"

## WHEN NOT TO USE ACTIONS:
- User is asking questions
- User wants information or advice
- User is chatting casually

Always include reply_markdown even when returning actions. If no actions are needed, omit the actions array entirely and just respond normally.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    // Try Lovable AI first, fallback to OpenAI
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
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data } = await supabase.auth.getUser(token);
        if (data?.user) {
          user = data.user;
          userId = data.user.id;
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

    const { message, conversation_id } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing message:', message.substring(0, 100));

    // Fetch conversation history
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

    // Build user context
    let userContext = '';
    if (userId) {
      try {
        const [coursesResult, assignmentsResult, examsResult, userStatsResult] = await Promise.all([
          supabase.from('courses').select('id, name, code, credits').eq('user_id', userId).eq('is_active', true).limit(10),
          supabase.from('assignments').select('id, title, due_date, is_completed, priority').eq('user_id', userId).eq('is_completed', false).order('due_date', { ascending: true }).limit(10),
          supabase.from('exams').select('id, title, exam_date').eq('user_id', userId).gte('exam_date', new Date().toISOString()).limit(5),
          supabase.from('user_stats').select('current_streak, total_study_hours').eq('user_id', userId).single()
        ]);

        const courses = coursesResult.data || [];
        const assignments = assignmentsResult.data || [];
        const exams = examsResult.data || [];
        const userStats = userStatsResult.data;
        const currentDate = new Date().toISOString();

        if (courses.length > 0 || assignments.length > 0 || exams.length > 0) {
          userContext = `
## User Context (${currentDate.split('T')[0]}):
- Courses: ${courses.map(c => c.name).join(', ') || 'None'}
- Pending assignments: ${assignments.length} (${assignments.slice(0, 3).map(a => a.title).join(', ')})
- Upcoming exams: ${exams.length} (${exams.slice(0, 2).map(e => `${e.title} on ${e.exam_date.split('T')[0]}`).join(', ')})
- Study streak: ${userStats?.current_streak || 0} days
`;
        }
      } catch (error) {
        console.log('Could not fetch user context:', error);
      }
    }

    // System prompt with action spec
    const systemPrompt = `You are Ada, the intelligent academic assistant for Aqademiq.

## Your Role:
- Help students manage their academic schedules
- Create calendar events when requested
- Provide study tips and academic advice
- Be warm, concise, and action-oriented

${ACTION_SPEC}

${userContext ? userContext : ''}

## Response Guidelines:
1. Start with a **bolded summary** when helpful
2. Use markdown formatting (headers, bullets, bold)
3. For scheduling requests, ALWAYS return the JSON format with actions
4. Include start_iso and end_iso in ISO 8601 format with timezone
5. Be conversational but efficient
6. Current datetime for reference: ${new Date().toISOString()}
`;

    // Prepare API request
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
      
      // Handle specific error codes
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

    // Try to extract JSON from response
    try {
      // Look for JSON block in response
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
        // Check if entire response is JSON
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
      // Not JSON, use raw content as markdown
      console.log('Response is plain markdown (no actions)');
    }

    // Validate actions
    const validatedActions = parsedResponse.actions.filter(action => {
      if (action.type === 'CREATE_EVENT') {
        return action.title && action.start_iso && action.end_iso;
      }
      return false;
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
        error: error.message,
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
