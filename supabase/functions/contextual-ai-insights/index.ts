import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { context, data, customQuery } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error('Lovable AI key not configured');
    }

    // Generate contextual prompts based on the context type
    const prompts = {
      gpa_improvement: `You are an academic advisor helping a student improve their GPA. Current GPA: ${data.currentGPA || 'N/A'}. 

Provide 3-4 specific, actionable recommendations focusing on:
1. Study strategies that work best for their current performance level
2. Time management improvements 
3. Course-specific tactics
4. Quick wins they can implement this week

Keep advice practical and encouraging. Format as a JSON object with:
{
  "suggestedSessions": ["session1", "session2", "session3"],
  "productivityTips": ["tip1", "tip2", "tip3"],
  "planningRecommendations": ["rec1", "rec2"],
  "generatedText": "brief summary paragraph"
}`,

      critical_alerts: `You are an academic intervention specialist. The student has ${data.alertsCount || 0} critical alerts requiring immediate attention.

Analyze their situation and provide:
1. Priority ranking of issues to address first
2. Specific action plan with deadlines
3. Recovery strategies
4. When to seek additional help

Be direct but supportive. Format as JSON:
{
  "suggestedSessions": ["urgent session1", "urgent session2"],
  "productivityTips": ["priority tip1", "priority tip2"],
  "planningRecommendations": ["recovery step1", "recovery step2"],
  "generatedText": "step by step recovery approach"
}`,

      declining_course: `You are a course recovery specialist. Student is struggling with: ${data.course_name || 'a course'}.
Current trend: ${data.trend_direction || 'declining'} with ${data.confidence_level || 'medium'} confidence.

Provide targeted help:
1. Immediate damage control actions
2. Study method adjustments for this specific subject
3. Resource recommendations
4. Progress tracking methods

Format as JSON:
{
  "suggestedSessions": ["emergency session1", "emergency session2"],
  "productivityTips": ["study adjustment1", "study adjustment2"],
  "planningRecommendations": ["resource1", "resource2"],
  "generatedText": "detailed recovery plan"
}`,

      study_consistency: `You are a habit-building coach. Student's current streak: ${data.currentStreak || 0} days.

Help them build sustainable study habits:
1. Streak recovery/building strategies
2. Habit stacking techniques
3. Motivation maintenance
4. Environment optimization

Be practical and psychology-informed. Format as JSON:
{
  "suggestedSessions": ["habit-building session1", "habit-building session2"],
  "productivityTips": ["daily action1", "daily action2"],
  "planningRecommendations": ["streak tip1", "streak tip2"],
  "generatedText": "core habit-building approach"
}`,

      course_improvement: `You are an academic advisor specializing in course recovery. The student needs help with a specific course.
Course performance: ${data.course?.progress_percentage || 0}% progress, Current GPA: ${data.course?.current_gpa || 'N/A'}

Analyze and provide:
1. Specific study sessions to schedule this week
2. Productivity strategies for this course
3. Planning recommendations to get back on track
4. Detailed action plan

Format as JSON:
{
  "suggestedSessions": ["targeted session1", "targeted session2", "targeted session3"],
  "productivityTips": ["course-specific tip1", "course-specific tip2", "course-specific tip3"],
  "planningRecommendations": ["planning step1", "planning step2"],
  "generatedText": "comprehensive improvement strategy for this course"
}`,

      course_overview: `You are an academic strategy consultant. Reviewing overall course portfolio.
Total courses: ${data.totalCourses || 0}, Courses needing attention: ${data.coursesNeedingHelp || 0}

Provide strategic overview:
1. Recommended study sessions across courses
2. Time management and prioritization tips
3. Strategic planning for balancing multiple courses
4. Overall strategy summary

Format as JSON:
{
  "suggestedSessions": ["cross-course session1", "cross-course session2", "cross-course session3"],
  "productivityTips": ["balance tip1", "balance tip2", "balance tip3"],
  "planningRecommendations": ["strategy1", "strategy2"],
  "generatedText": "holistic academic strategy across all courses"
}`,

      dashboard_overview: `You are a personal academic coach reviewing the student's complete academic dashboard.
Courses: ${data.courses?.length || 0}, Assignments: ${data.assignments?.length || 0}, Upcoming deadlines: ${data.upcoming?.length || 0}
Current streak: ${data.stats?.current_streak || 0} days

Provide comprehensive dashboard insights:
1. Priority study sessions for today/this week
2. Productivity and time management recommendations
3. Strategic planning based on upcoming deadlines
4. Motivational summary and action plan

Format as JSON:
{
  "suggestedSessions": ["priority session1", "priority session2", "priority session3"],
  "productivityTips": ["dashboard tip1", "dashboard tip2", "dashboard tip3"],
  "planningRecommendations": ["strategic plan1", "strategic plan2"],
  "generatedText": "personalized academic action plan based on complete dashboard analysis"
}`
    };

    const systemPrompt = prompts[context as keyof typeof prompts] || 
      "You are an academic advisor. Provide helpful, specific advice based on the student's situation.";

    const userMessage = customQuery || `Help me with ${context} based on this data: ${JSON.stringify(data)}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to your Lovable AI workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('Lovable AI Gateway error:', response.status, errorText);
      throw new Error(`Lovable AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    let generatedText = aiResponse.choices[0].message.content;

    // Try to parse as JSON, fallback to structured format
    let structuredInsight;
    try {
      structuredInsight = JSON.parse(generatedText);
    } catch (e) {
      // If parsing fails, create structured format from text
      structuredInsight = {
        suggestedSessions: [],
        productivityTips: [],
        planningRecommendations: [],
        generatedText: generatedText
      };
    }

    // Ensure all required fields exist
    const result = {
      suggestedSessions: structuredInsight.suggestedSessions || [],
      productivityTips: structuredInsight.productivityTips || [],
      planningRecommendations: structuredInsight.planningRecommendations || [],
      generatedText: structuredInsight.generatedText || generatedText
    };

    console.log('Generated AI insight:', { context, result });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in contextual-ai-insights function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});