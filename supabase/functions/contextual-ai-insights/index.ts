import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
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
  "mainInsight": "brief summary",
  "recommendations": ["action1", "action2", "action3"],
  "quickWins": ["immediate action1", "immediate action2"]
}`,

      critical_alerts: `You are an academic intervention specialist. The student has ${data.alertsCount || 0} critical alerts requiring immediate attention.

Analyze their situation and provide:
1. Priority ranking of issues to address first
2. Specific action plan with deadlines
3. Recovery strategies
4. When to seek additional help

Be direct but supportive. Format as JSON:
{
  "urgentActions": ["priority1", "priority2"],
  "recoveryPlan": "step by step approach",
  "timeframe": "realistic timeline"
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
  "emergencyActions": ["action1", "action2"],
  "studyAdjustments": ["method1", "method2"],
  "resources": ["resource1", "resource2"]
}`,

      study_consistency: `You are a habit-building coach. Student's current streak: ${data.currentStreak || 0} days.

Help them build sustainable study habits:
1. Streak recovery/building strategies
2. Habit stacking techniques
3. Motivation maintenance
4. Environment optimization

Be practical and psychology-informed. Format as JSON:
{
  "habitStrategy": "core approach",
  "dailyActions": ["habit1", "habit2"],
  "streakTips": ["tip1", "tip2"]
}`
    };

    const systemPrompt = prompts[context as keyof typeof prompts] || 
      "You are an academic advisor. Provide helpful, specific advice based on the student's situation.";

    const userMessage = customQuery || `Help me with ${context} based on this data: ${JSON.stringify(data)}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_completion_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    let generatedText = aiResponse.choices[0].message.content;

    // Try to parse as JSON, fallback to plain text
    let structuredInsight;
    try {
      structuredInsight = JSON.parse(generatedText);
    } catch (e) {
      structuredInsight = {
        mainInsight: generatedText,
        recommendations: [],
        quickWins: []
      };
    }

    console.log('Generated AI insight:', { context, structuredInsight });

    return new Response(JSON.stringify({
      success: true,
      context,
      insight: structuredInsight,
      rawText: generatedText
    }), {
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