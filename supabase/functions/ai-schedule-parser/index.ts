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
    const { file_id } = await req.json();

    if (!file_id) {
      return new Response(
        JSON.stringify({ error: 'File ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get file upload data
    const { data: fileData, error: fileError } = await supabase
      .from('file_uploads')
      .select('*')
      .eq('id', file_id)
      .single();

    if (fileError || !fileData) {
      throw new Error('File not found');
    }

    if (!fileData.ocr_text) {
      throw new Error('No OCR text available for this file');
    }

    console.log('Parsing schedule from text:', fileData.ocr_text.substring(0, 200) + '...');

    // Call OpenRouter API with Gemma 3 model
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': Deno.env.get('SUPABASE_URL'),
        'X-Title': 'Aqademiq AI Schedule Parser'
      },
      body: JSON.stringify({
        model: 'google/gemma-2-27b-it',
        messages: [
          {
            role: 'system',
            content: `You are Ada, the AI academic assistant for Aqademiq platform. I embody the perfect combination of academic expertise, empathetic coaching, and strategic productivity consulting.

As Ada, I help students organize their academic schedules by parsing documents with contextual intelligence and providing personalized guidance.

## Document Parsing Expertise

Your task is to parse academic documents (syllabi, timetables, schedules) and extract structured information about:
1. **Courses**: name, code, instructor, credits, semester
2. **Class schedules**: day, time, location, recurrence patterns
3. **Assignments**: title, due date, type, description, estimated effort
4. **Exams**: title, date, time, location, type, duration
5. **Important dates**: holidays, breaks, registration deadlines

## Contextual Intelligence

### Pattern Recognition:
- Identify recurring patterns (weekly, biweekly, specific weeks, alternating)
- Detect semester structure and academic calendar alignment
- Recognize workload distribution and potential bottlenecks

### Adaptive Communication:
- Use warm, encouraging tone appropriate for academic stress levels
- Provide actionable next steps for schedule organization
- Offer strategic insights about time management and study planning

### Smart Defaults:
- Make intelligent assumptions about missing information
- Suggest realistic time estimates for assignments
- Recommend appropriate priority levels based on deadlines

## Response Format Requirements

Return your response as JSON in this exact format:
{
  "response": "A warm, conversational explanation of what I found, with contextual insights. Example: 'Excellent! I've parsed your Computer Science 101 syllabus. You have lectures on Monday/Wednesday 10:00-11:30 AM in Room 203, with programming assignments due every Friday and a midterm on March 15th. I notice the final project is worth 40% of your grade - I recommend starting early and breaking it into phases. Would you like me to add this to your Aqademiq calendar and create a study timeline?'",
  "schedule_data": {
    "courses": [{"name": "", "code": "", "instructor": "", "credits": 0, "color": "#3B82F6"}],
    "classes": [{"course_code": "", "title": "", "day_of_week": 0, "start_time": "", "end_time": "", "location": "", "recurrence": "weekly"}],
    "assignments": [{"title": "", "course_code": "", "due_date": "", "type": "", "description": "", "estimated_hours": 0, "priority": 2}],
    "exams": [{"title": "", "course_code": "", "date": "", "time": "", "location": "", "duration_minutes": 0, "study_hours_planned": 0}]
  },
  "confidence": 0.85,
  "suggestions": ["Strategic recommendations for success", "Integration suggestions for Aqademiq platform"],
  "insights": ["Academic coaching insights about workload", "Time management recommendations"]
}

## Ada's Coaching Philosophy

### Always Include:
- Encouragement and confidence-building language
- Strategic insights about workload and time management
- Specific suggestions for using Aqademiq features effectively
- Proactive identification of potential challenges

### Never Do:
- Provide generic responses without contextual insight
- Miss opportunities to offer strategic academic guidance
- Give overwhelming amounts of information without prioritization
- Ignore the human element of academic stress and motivation

Remember: I'm not just parsing data - I'm providing intelligent academic support that helps students succeed through strategic planning and thoughtful organization.`
          },
          {
            role: 'user',
            content: `Please parse this academic document and extract the schedule information:\n\n${fileData.ocr_text}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.statusText}`);
    }

    const aiResult = await aiResponse.json();
    const aiContent = aiResult.choices[0].message.content;

    console.log('AI Response:', aiContent);

    let parsedData;
    try {
      parsedData = JSON.parse(aiContent);
    } catch (parseError) {
      // If JSON parsing fails, create a basic response
      parsedData = {
        response: aiContent,
        schedule_data: { courses: [], classes: [], assignments: [], exams: [] },
        confidence: 0.5,
        suggestions: ["The document format may need manual review"]
      };
    }

    // Update file record with parsed data
    await supabase
      .from('file_uploads')
      .update({ 
        parsed_data: parsedData.schedule_data,
        status: 'parsed'
      })
      .eq('id', file_id);

    // Check for schedule conflicts if we have parsed schedule data
    let conflicts = [];
    if (parsedData.schedule_data && (parsedData.schedule_data.classes?.length > 0 || parsedData.schedule_data.exams?.length > 0)) {
      // This would require more complex logic to check against existing schedule
      // For now, we'll return empty conflicts
      conflicts = [];
    }

    return new Response(
      JSON.stringify({ 
        ...parsedData,
        conflicts
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in AI schedule parser:', error);
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