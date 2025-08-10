import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIInsightRequest {
  type: 'assignment' | 'exam' | 'planning';
  title: string;
  dueDate?: string;
  estimatedHours?: number;
  availableSlots?: string[];
  description?: string;
  courseInfo?: string;
}

interface AIInsightResponse {
  suggestedSessions: Array<{
    date: string;
    time: string;
    duration: string;
    focus: string;
    description: string;
  }>;
  productivityTips: string[];
  planningRecommendations: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const requestData: AIInsightRequest = await req.json();

    // Check rate limit (max 10 requests per day per user)
    const today = new Date().toISOString().split('T')[0];
    const { data: todaysRequests, error: countError } = await supabase
      .from('ai_insights_history')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', `${today}T00:00:00Z`)
      .lt('created_at', `${today}T23:59:59Z`);

    if (countError) {
      console.error('Error checking rate limit:', countError);
    }

    if (todaysRequests && todaysRequests.length >= 10) {
      return new Response(
        JSON.stringify({ 
          error: 'Daily AI insights limit reached (10/day). Try again tomorrow.' 
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Construct prompt based on request
    const constructPrompt = (request: AIInsightRequest): string => {
      let contextInfo = `Task: ${request.title}\n`;
      
      if (request.dueDate) {
        contextInfo += `Due date: ${new Date(request.dueDate).toLocaleDateString()}\n`;
      }
      
      if (request.estimatedHours) {
        contextInfo += `Estimated time needed: ${request.estimatedHours} hours\n`;
      }
      
      if (request.availableSlots && request.availableSlots.length > 0) {
        contextInfo += `Available time slots: ${request.availableSlots.join(', ')}\n`;
      }
      
      if (request.description) {
        contextInfo += `Details: ${request.description}\n`;
      }
      
      if (request.courseInfo) {
        contextInfo += `Course: ${request.courseInfo}\n`;
      }

      return `${contextInfo}\n` +
        `Please provide:\n` +
        `1. SUGGESTED SESSIONS: Break this task into specific study sessions with dates, times, and focus areas\n` +
        `2. PRODUCTIVITY TIPS: 3-4 concrete tips for this specific task (not generic advice)\n` +
        `3. PLANNING RECOMMENDATIONS: Strategic advice about timing, preparation, and optimization\n\n` +
        `Format your response as JSON with these exact keys: suggestedSessions, productivityTips, planningRecommendations\n` +
        `Each suggestedSession should have: date, time, duration, focus, description\n` +
        `Keep all advice specific to this task and situation.`;
    };

    // Call OpenRouter API
    const prompt = constructPrompt(requestData);
    
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "google/gemma-2-9b-it:free",
        messages: [
          {
            role: "system",
            content: "You are an expert academic coach. Provide actionable, context-aware study breakdowns, scheduling suggestions, and productivity tips. Always respond in valid JSON format. Be specific and practical, never generic."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`OpenRouter API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;

    // Parse AI response - handle both plain JSON and markdown-wrapped JSON
    let parsedResponse: AIInsightResponse;
    try {
      let jsonContent = aiContent;
      
      // Check if the response is wrapped in markdown code blocks
      const markdownJsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/);
      if (markdownJsonMatch) {
        jsonContent = markdownJsonMatch[1].trim();
        console.log('Extracted JSON from markdown:', jsonContent);
      }
      
      parsedResponse = JSON.parse(jsonContent);
      console.log('Successfully parsed AI response');
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Original AI content:', aiContent);
      
      // Create a more dynamic fallback response based on the request
      const fallbackDate = new Date();
      const todayStr = fallbackDate.toISOString().split('T')[0];
      const tomorrowStr = new Date(fallbackDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      parsedResponse = {
        suggestedSessions: [
          {
            date: todayStr,
            time: "2:00 PM",
            duration: requestData.estimatedHours ? `${Math.ceil(requestData.estimatedHours / 2)} hours` : "2 hours",
            focus: `Initial work on ${requestData.title}`,
            description: `Begin working on your ${requestData.type} systematically. Focus on understanding the requirements and creating an outline.`
          },
          {
            date: tomorrowStr,
            time: "10:00 AM",
            duration: requestData.estimatedHours ? `${Math.floor(requestData.estimatedHours / 2)} hours` : "1.5 hours",
            focus: `Continue ${requestData.title}`,
            description: `Build upon yesterday's work. Review your progress and tackle the main content or problem-solving phase.`
          }
        ],
        productivityTips: [
          `Break "${requestData.title}" into smaller, manageable sections`,
          "Use the Pomodoro technique (25-min focused sessions) for optimal concentration",
          `Set specific goals for each study session related to ${requestData.type}`,
          "Take regular breaks to maintain focus and avoid burnout"
        ],
        planningRecommendations: [
          requestData.dueDate ? `Start early - you have until ${new Date(requestData.dueDate).toLocaleDateString()}` : "Start as early as possible to avoid last-minute stress",
          "Create a dedicated workspace free from distractions",
          `Gather all materials and resources needed for your ${requestData.type} before starting`,
          "Track your progress after each session to stay motivated"
        ]
      };
    }

    // Save to history
    const { error: saveError } = await supabase
      .from('ai_insights_history')
      .insert({
        user_id: user.id,
        request_payload: requestData,
        ai_response: parsedResponse
      });

    if (saveError) {
      console.error('Error saving to history:', saveError);
    }

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-insights function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});