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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Starting AI chat function with OpenAI API');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from auth header for rate limiting and security (optional)
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
        console.log('Auth header present but user could not be resolved. Proceeding anonymous.');
      }
    }

    // Rate limiting check
    const rlKey = userId ? `user:${userId}` : `ip:${ip}`;
    if (!checkRateLimit(rlKey, 20, 60000)) { // 20 requests per minute
      console.log(`Rate limit exceeded for ${rlKey}`);
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log security event for authenticated users only
    if (userId) {
      await supabase.rpc('log_security_event', {
        p_action: 'ai_chat_request',
        p_resource_type: 'ai_chat',
        p_details: { user_id: userId, timestamp: new Date().toISOString() }
      });
    }

    const { message } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing chat message:', message);

    // Use resolved userId (may be null for anonymous)

    // Build context about user's current schedule if available
    let userContext = '';
    if (userId) {
      try {
        // Get comprehensive user context for Ada AI
        const [coursesResult, assignmentsResult, examsResult, studySessionsResult, userStatsResult] = await Promise.all([
          supabase.from('courses').select('id, name, code, credits, progress_percentage, current_gpa').eq('user_id', userId).eq('is_active', true).limit(15),
          supabase.from('assignments').select('id, title, due_date, is_completed, is_recurring, priority, estimated_hours').eq('user_id', userId).order('due_date', { ascending: true }).limit(20),
          supabase.from('exams').select('id, title, exam_date, duration_minutes, study_hours_planned').eq('user_id', userId).gte('exam_date', new Date().toISOString()).limit(10),
          supabase.from('study_sessions').select('total_time_minutes, session_date').eq('user_id', userId).gte('session_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).limit(20),
          supabase.from('user_stats').select('current_streak, longest_streak, total_study_hours, last_study_date').eq('user_id', userId).single()
        ]);

        const courses = coursesResult.data || [];
        const assignments = assignmentsResult.data || [];
        const exams = examsResult.data || [];
        const studySessions = studySessionsResult.data || [];
        const userStats = userStatsResult.data;

        if (courses.length > 0 || assignments.length > 0 || exams.length > 0) {
          const overdueTasks = assignments.filter(a => !a.is_completed && new Date(a.due_date) < new Date());
          const upcomingDeadlines = assignments.filter(a => !a.is_completed && new Date(a.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
          const totalWeeklyStudyHours = studySessions.reduce((sum, session) => sum + (session.total_time_minutes / 60), 0);
          const currentDate = new Date().toISOString().split('T')[0];
          
          userContext = `\n\n## User's Current Academic Context:

### Active Courses (${courses.length}):
${courses.map(c => `- ${c.code}: ${c.name} (${c.credits} credits, ${c.progress_percentage || 0}% complete, GPA: ${c.current_gpa || 'N/A'})`).join('\n')}

### Assignment Status:
- Total Active: ${assignments.filter(a => !a.is_completed).length}
- Overdue: ${overdueTasks.length} ${overdueTasks.length > 0 ? `(${overdueTasks.map(a => a.title).join(', ')})` : ''}
- Due This Week: ${upcomingDeadlines.length} ${upcomingDeadlines.length > 0 ? `(${upcomingDeadlines.map(a => `${a.title} - ${a.due_date}`).join(', ')})` : ''}
- High Priority: ${assignments.filter(a => !a.is_completed && a.priority === 1).length}

### Upcoming Exams:
${exams.length > 0 ? exams.map(e => `- ${e.title}: ${e.exam_date} (${e.duration_minutes}min, ${e.study_hours_planned || 'TBD'} study hours planned)`).join('\n') : '- No upcoming exams'}

### Study Performance:
- Current Streak: ${userStats?.current_streak || 0} days
- Longest Streak: ${userStats?.longest_streak || 0} days
- Total Study Hours: ${userStats?.total_study_hours || 0}
- Last Study Date: ${userStats?.last_study_date || 'Never'}
- This Week's Study Time: ${totalWeeklyStudyHours.toFixed(1)} hours

### Context Notes:
- Current Date: ${currentDate}
- User has ${overdueTasks.length > 0 ? 'OVERDUE TASKS that need immediate attention' : 'no overdue tasks'}
- Study momentum: ${userStats?.current_streak > 3 ? 'Strong' : userStats?.current_streak > 0 ? 'Building' : 'Needs restart'}`;
        }
      } catch (error) {
        console.log('Could not fetch user context:', error);
      }
    }
    // Cap userContext length to avoid oversized prompts
    if (userContext && userContext.length > 1800) {
      userContext = userContext.slice(0, 1800) + '…';
    }

    // Prepare prompts
    const systemPrompt = [
      'You are Ada, the academic assistant for Aqademiq.',
      '- Be warm, concise, and action-oriented.',
      '- Tailor advice to the user\'s level and upcoming deadlines.',
      '- Prefer Aqademiq features before external tools.',
      '',
      'FORMAT ALL RESPONSES USING MARKDOWN:',
      '1. Begin with a **bolded summary sentence**.',
      '2. Use headings (##) to break sections (e.g., "## Key Takeaways", "## Next Steps").',
      '3. Use bullet lists for steps or tips.',
      '4. Highlight key terms in **bold** and *italics* for emphasis.',
      '5. Use numbered lists for sequences (e.g., study plans, workflows).',
      '6. Wrap code or commands in triple backticks for code blocks.',
      '7. Include emojis sparingly to draw attention (✔️ 📚 🕒).',
      '8. Keep lines under 80 characters so UI wraps cleanly.',
      '9. Conclude with a one-line encouragement in *italics*.'
    ].join('\n');
    const minimalSystemPrompt = 'You are Ada, a concise academic assistant. Provide clear, actionable guidance with bullet-point next steps.';

    const systemWithContext = userContext
      ? `${systemPrompt}\n\nUser context:\n${userContext}`
      : systemPrompt;

    // Log sizes
    console.log('Prompt sizes', {
      systemPromptLength: systemWithContext.length,
      userContextLength: userContext.length,
    });

    const makeBody = (sysPrompt: string) => ({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    let retried = false;
    let usedFallback = false;

    let aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(makeBody(systemWithContext)),
      signal: controller.signal
    }).catch((e) => {
      console.error('AI fetch error (initial):', e);
      return null as any;
    });
    clearTimeout(timeoutId);

    if (!aiResponse || !aiResponse.ok) {
      retried = true;
      usedFallback = true;
      const errorBody = aiResponse ? await aiResponse.text().catch(()=>'') : 'no response';
      console.error('OpenAI API error (initial):', {
        status: aiResponse?.status,
        statusText: aiResponse?.statusText,
        body: errorBody
      });

      // Retry with minimal prompt and no context
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 20000);
      aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(makeBody(minimalSystemPrompt)),
        signal: controller2.signal
      }).catch((e)=> {
        console.error('AI fetch error (retry):', e);
        return null as any;
      });
      clearTimeout(timeoutId2);

      if (!aiResponse || !aiResponse.ok) {
        const retryBody = aiResponse ? await aiResponse.text().catch(()=> '') : 'no response';
        console.error('OpenAI API error (retry):', {
          status: aiResponse?.status,
          statusText: aiResponse?.statusText,
          body: retryBody
        });

        const status = aiResponse?.status || 500;
        let friendly = 'AI service error. Please try again later.';
        if (status === 429) friendly = 'Rate limit exceeded. Please try again shortly.';
        if (status === 400) friendly = 'Invalid request to AI service. Try rephrasing your message.';
        return new Response(JSON.stringify({ error: friendly, retried, used_fallback: usedFallback }), {
          status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const aiResult = await aiResponse.json();
    const response = aiResult.choices?.[0]?.message?.content ?? 'Sorry, I could not generate a response.';

    console.log('AI Response generated successfully', { retried, usedFallback });

    return new Response(
      JSON.stringify({ 
        response,
        metadata: {
          model: 'gpt-4o-mini',
          provider: 'openai',
          timestamp: new Date().toISOString(),
          user_context_included: !!userContext,
          retried,
          used_fallback: usedFallback
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in AI chat:', error);
    return new Response(
      JSON.stringify({ 
        response: "I'm sorry, I encountered an error processing your message. Please try again or contact support if the issue persists.",
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});