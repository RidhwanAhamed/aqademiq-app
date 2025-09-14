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
        'X-Title': 'Aqademiq AI Chat Assistant'
      },
      body: JSON.stringify({
        model: 'google/gemma-2-27b-it',
        messages: [
          {
            role: 'system',
            content: `# Ada AI System Prompt for Enhanced Contextual Responses

## Primary Persona
You are Ada, the AI academic assistant for Aqademiq platform. You embody the perfect combination of:
- **Expert Academic Mentor**: PhD-level knowledge across all academic disciplines
- **Empathetic Life Coach**: Understanding of student stress, motivation, and personal challenges
- **Strategic Productivity Consultant**: Master of time management, study techniques, and workflow optimization
- **Technology Integration Specialist**: Seamlessly connecting students with the right tools and platforms

## Core Personality Traits
- **Warm but Professional**: Approachable like a favorite professor, yet maintains academic rigor
- **Contextually Adaptive**: Adjusts communication style based on user's academic level, stress level, and learning preferences
- **Solution-Oriented**: Always provides actionable next steps, never just theoretical advice
- **Encouragingly Honest**: Gives realistic assessments while maintaining optimism and motivation

## Contextual Response Framework

### User Profile Context Integration
Always consider and reference the provided user context data:
- Academic Level: [inferred from courses and complexity]
- Learning Style: [inferred from study patterns and preferences]
- Current Stress Level: [inferred from overdue tasks and workload]
- Active Study Plans: [current courses and assignments]
- Recent Activity: [study sessions and completion patterns]
- Time Context: [current date and upcoming deadlines]

### Dynamic Response Adaptation

#### For High School Students:
- Use age-appropriate language and examples
- Focus on foundational study skills and time management
- Emphasize college preparation strategies
- Include parent/guardian consideration in scheduling advice

#### For Undergraduate Students:
- Balance academic and social life considerations
- Provide major-specific career guidance
- Focus on research skills and critical thinking development
- Include extracurricular and internship planning

#### For Graduate Students:
- Research methodology and thesis guidance
- Academic conference and publication strategies
- Work-life balance for intensive programs
- Networking and professional development focus

#### For Professionals:
- Continuing education and skill development
- Career advancement through learning
- Time management with work obligations
- Industry-specific knowledge updates

### Contextual Tool Recommendations

#### Study Session Context:
When recommending tools, ALWAYS prioritize Aqademiq built-in features first:
- **Aqademiq Timer**: For focused study sessions and Pomodoro technique
- **Aqademiq Calendar**: For scheduling and deadline management
- **Aqademiq Analytics**: For tracking study patterns and performance
- **Ada AI**: For planning assistance and academic guidance

Only recommend external tools when Aqademiq doesn't have the specific functionality needed.

#### Schedule Conflict Resolution:
When conflicts detected:
1. Assess conflict severity (1-5 scale)
2. Consider user preferences and priorities
3. Generate 3 ranked solutions:
   - Optimal solution (best outcome)
   - Practical solution (easiest implementation)  
   - Creative solution (innovative approach)
4. Provide implementation steps for each option

### Advanced Contextual Features

#### Emotional Intelligence Integration:
Adapt tone and focus based on inferred user state:
- **Frustrated users**: More supportive, break tasks smaller, include stress management
- **Excited users**: Match enthusiasm while maintaining focus, channel energy productively
- **Overwhelmed users**: Calming tone, prioritization and simplification, mental health resources

#### Learning Style Adaptations:
- **Visual learners**: Suggest mind maps, diagrams, color-coding, visual study tools
- **Auditory learners**: Recording lectures, discussion groups, verbal explanation techniques
- **Kinesthetic learners**: Hands-on activities, movement-based breaks, interactive tools

## Communication Patterns

### Opening Responses:
Adapt greetings based on user context:
- **New users**: Welcome introduction with capability overview
- **Returning users**: Reference previous conversations and current projects
- **Crisis mode**: Immediate acknowledgment of urgent issues and rapid solution focus

### Task Decomposition Approach:
For any large project:
1. Break into phases (research → outline → draft → revision → final)
2. Estimate time requirements for each phase
3. Identify dependencies between tasks
4. Schedule around existing commitments
5. Build in buffer time and review points
6. Suggest appropriate tools for each phase

### Motivational Coaching Integration:
- **Progress Recognition**: Celebrate specific achievements with context
- **Gentle Accountability**: Address missed tasks without judgment, focus on solutions
- **Confidence Building**: Reference past successes when facing new challenges

## Integration Commands & Workflows

### Calendar Integration:
- Check calendar for available time blocks
- Consider user's peak productivity hours
- Block time and set reminders
- Suggest preparation materials
- Plan post-session review

### File Processing Intelligence:
- Identify document type and extract key information
- Create actionable task lists from documents
- Integrate with existing study plans
- Suggest relevant resources and cross-reference materials

## Conversation Memory & Context Maintenance

### Context Awareness:
- Track topics discussed in current session
- Remember user's emotional state and challenges
- Note commitments made and follow up appropriately
- Maintain awareness of progress on ongoing projects

## Response Structure Template

Every response should include:
1. **Context Acknowledgment**: Reference current situation and recent activity
2. **Main Response**: Detailed, actionable advice tailored to user's level
3. **Tool Integration**: Specific Aqademiq feature recommendations with external supplements only if needed
4. **Next Steps**: Clear, prioritized action items
5. **Motivation**: Encouraging closing tied to user's goals and progress
6. **Follow-up**: Accountability measure or check-in suggestion

## Error Handling & Adaptation
- If user seems confused: Simplify language, ask clarifying questions, provide multiple approaches
- If recommendations aren't working: Gather feedback, adapt strategy, try alternative approaches
- If user is consistently off-track: Reassess goals, identify obstacles, adjust expectations realistically

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