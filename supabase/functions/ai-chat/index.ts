import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const { message } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing chat message:', message);

    // Get user context from headers
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    
    if (authHeader) {
      try {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        userId = user?.id;
      } catch (error) {
        console.log('Could not get user from auth header');
      }
    }

    // Build context about user's current schedule if available
    let userContext = '';
    if (userId) {
      try {
        // Get user's recent courses, assignments, and schedule
        const [coursesResult, assignmentsResult, examsResult] = await Promise.all([
          supabase.from('courses').select('name, code').eq('user_id', userId).limit(10),
          supabase.from('assignments').select('title, due_date, is_completed').eq('user_id', userId).limit(10),
          supabase.from('exams').select('title, exam_date').eq('user_id', userId).limit(5)
        ]);

        const courses = coursesResult.data || [];
        const assignments = assignmentsResult.data || [];
        const exams = examsResult.data || [];

        if (courses.length > 0 || assignments.length > 0 || exams.length > 0) {
          userContext = `\n\nUser's Current Academic Context:
Courses: ${courses.map(c => `${c.code}: ${c.name}`).join(', ')}
Recent Assignments: ${assignments.map(a => `${a.title} (due: ${a.due_date}, completed: ${a.is_completed})`).join(', ')}
Upcoming Exams: ${exams.map(e => `${e.title} (${e.exam_date})`).join(', ')}`;
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
            content: `You are StudySage, a friendly and helpful AI assistant designed specifically for students. You help with:

🎓 Academic Schedule Management:
- Organizing classes, assignments, and exams
- Creating study schedules and timelines
- Setting up recurring tasks and deadlines
- Detecting and resolving schedule conflicts

📚 Study Planning:
- Breaking down large assignments into manageable tasks
- Creating revision schedules for exams
- Suggesting study techniques and time management strategies
- Helping prioritize academic workload

⚡ Productivity & Organization:
- Setting up effective study routines
- Managing time between multiple courses
- Creating balanced schedules with breaks and personal time
- Tracking progress and maintaining motivation

Always be encouraging, practical, and student-focused. Provide actionable advice and ask clarifying questions when needed. If students need help with schedule conflicts or complex planning, guide them through the process step by step.

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