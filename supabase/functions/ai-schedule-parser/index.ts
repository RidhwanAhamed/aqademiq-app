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
        'X-Title': 'StudyFlow AI Schedule Parser'
      },
      body: JSON.stringify({
        model: 'google/gemma-2-27b-it',
        messages: [
          {
            role: 'system',
            content: `You are StudySage, an AI assistant that helps students organize their academic schedules. 

Your task is to parse academic documents (syllabi, timetables, schedules) and extract structured information about:
1. Courses (name, code, instructor, credits)
2. Class schedules (day, time, location, recurrence)
3. Assignments (title, due date, type, description)
4. Exams (title, date, time, location, type)
5. Important dates (holidays, breaks, deadlines)

For recurring events, identify the pattern (weekly, biweekly, specific weeks).

Respond in JSON format with:
{
  "response": "Friendly explanation of what you found",
  "schedule_data": {
    "courses": [{"name": "", "code": "", "instructor": "", "credits": 0, "color": ""}],
    "classes": [{"course_code": "", "title": "", "day_of_week": 0, "start_time": "", "end_time": "", "location": "", "recurrence": "weekly"}],
    "assignments": [{"title": "", "course_code": "", "due_date": "", "type": "", "description": ""}],
    "exams": [{"title": "", "course_code": "", "date": "", "time": "", "location": "", "duration_minutes": 0}]
  },
  "confidence": 0.85,
  "suggestions": ["Any recommendations or clarifications needed"]
}

Be helpful and ask for clarification if the text is unclear or incomplete.`
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