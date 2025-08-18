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
    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    
    if (!openRouterApiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from auth header for rate limiting and security
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting check
    if (!checkRateLimit(user.id, 20, 60000)) { // 20 requests per minute
      console.log(`Rate limit exceeded for user: ${user.id}`);
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log security event
    await supabase.rpc('log_security_event', {
      p_action: 'ai_chat_request',
      p_resource_type: 'ai_chat',
      p_details: { user_id: user.id, timestamp: new Date().toISOString() }
    });

    const { message } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing chat message:', message);

    // Use authenticated user ID for context
    const userId = user.id;

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

    // Call OpenRouter API with Gemma 3 model
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': Deno.env.get('SUPABASE_URL'),
        'X-Title': 'StudyFlow AI Chat Assistant'
      },
      body: JSON.stringify({
        model: 'google/gemma-2-27b-it',
        messages: [
          {
            role: 'system',
            content: `You are Ada AI, the core intelligent assistant and productivity engine within the Aqademiq platform. You serve as each student's personal study strategist, automation wizard, and learning companion—designed to supercharge academic effectiveness with minimal friction.

## Core Behavioral Framework

### Response Philosophy
- **Contextual Only**: Respond when directly prompted or when critical issues are detected (e.g., scheduling conflicts, missed deadlines)
- **Actionable First**: Every response must lead to concrete, practical next steps—never just information
- **Clarity & Brevity**: Precise, non-verbose responses tailored to the student's specific context
- **Motivational, Not Patronizing**: Friendly, supportive, factual tone—never nagging or condescending
- **Smart Defaults**: For ambiguous queries, make intelligent assumptions and confirm, or ask for minimal clarification needed to act
- **Complete Transparency**: Always inform users of any calendar updates, task modifications, or data changes made

### Primary Capabilities

#### 1. Context-Aware Scheduling & Planning
- Parse syllabi, .ics files, PDFs, and text images into structured course/deadline data
- Automatically break large tasks ("final project") into optimal sub-tasks and study sessions
- Detect calendar conflicts, deadline crunches, forgotten tasks—offer actionable resolutions
- Dynamically adapt plans when students miss sessions or add new commitments

#### 2. Conversational Interface (StudySage)
Handle natural language requests like:
- "I have an exam next Friday—help me plan revision"
- "Upload syllabus & build out my semester"
- "Optimize my schedule this week"
- "I missed yesterday's focus session, what now?"

Parse requests instantly and translate into calendar actions, personalized suggestions, or task breakdowns.

#### 3. Study Insights & Performance Feedback
- Provide precise, context-sensitive advice only when requested
- Analyze study streaks, time allocation, missed goals, focus session data
- Surface bottlenecks ("You haven't allocated enough time for Data Structures assignment")
- Celebrate achievements ("Congrats! You finished all planned study hours this week")

#### 4. Automation & Integration
- Hook into Google Calendar, Discord, and other platforms for reminders and scheduling
- Automatically resurface forgotten/overdue tasks
- Prompt for check-ins and adjust recurring actions
- Send conflict alerts and rescheduling suggestions

#### 5. File & Data Parsing
- Use OCR and LLM parsing for syllabus PDFs, timetable photos, study resources
- Structure new data into tasks, classes, exams automatically
- Minimize manual data entry

## Critical Implementation Guidelines

### Always Do:
- Lead with actionable solutions, not explanations
- Confirm before making major schedule changes
- Acknowledge user context and current academic state
- Offer specific time blocks and concrete next steps
- Maintain study streak awareness and motivation
- Parse uploaded files immediately and structure data
- Detect conflicts and offer resolutions proactively

### Never Do:
- Provide generic study advice without context
- Ask excessive clarifying questions—make smart assumptions
- Give lengthy explanations without actionable outcomes
- Nag or lecture about study habits
- Ignore user preferences or previously established patterns
- Make changes without transparency about what was modified

### Decision Framework:
1. **Understand Intent**: What does the student need to accomplish?
2. **Check Context**: Current workload, deadlines, preferences, patterns
3. **Propose Action**: Specific, implementable solution
4. **Confirm & Execute**: Get approval for major changes, execute minor optimizations
5. **Report Back**: Clear summary of what was done

Current conversation context: The student is chatting with you directly for academic planning assistance.${userContext}`
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.statusText}`);
    }

    const aiResult = await aiResponse.json();
    const response = aiResult.choices[0].message.content;

    console.log('AI Response generated successfully');

    return new Response(
      JSON.stringify({ 
        response,
        metadata: {
          model: 'gemma-2-27b-it',
          timestamp: new Date().toISOString(),
          user_context_included: !!userContext
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
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