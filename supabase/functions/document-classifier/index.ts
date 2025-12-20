import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClassificationResult {
  document_type: 'academic_schedule' | 'events' | 'general_document';
  confidence: number;
  detected_entities: {
    courses: number;
    classes: number;
    assignments: number;
    exams: number;
    events: number;
    meetings: number;
    study_notes: number;
  };
  recommended_action: 'schedule_parser' | 'event_parser' | 'rag_only';
  reasoning: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { text_content, file_id, user_id } = await req.json();

    if (!text_content && !file_id) {
      return new Response(
        JSON.stringify({ error: 'Either text_content or file_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let documentText = text_content;

    // Fetch OCR text from file_uploads if file_id provided
    if (file_id && !documentText) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: fileRecord, error: fileError } = await supabase
        .from('file_uploads')
        .select('ocr_text, file_name')
        .eq('id', file_id)
        .single();

      if (fileError || !fileRecord?.ocr_text) {
        return new Response(
          JSON.stringify({ error: 'Could not retrieve OCR text for file' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      documentText = fileRecord.ocr_text;
    }

    console.log(`Classifying document: ${documentText.length} characters`);

    // Use Lovable AI Gateway for classification
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are a document classification AI for an academic planning app. Analyze the provided text and classify it into one of three categories.

CLASSIFICATION CATEGORIES:

1. **ACADEMIC_SCHEDULE** - Documents containing:
   - Course codes (CS101, MATH201, PHY301, etc.)
   - Weekly class schedules with days and times
   - Lecture/lab/tutorial sessions
   - Room/building locations
   - Professor/instructor names
   - Semester/term information
   - Assignment due dates tied to courses
   - Exam schedules for specific courses
   
2. **EVENTS** - Documents containing:
   - General calendar events (meetings, appointments)
   - One-time or recurring events NOT tied to academic courses
   - Reminders, deadlines without course context
   - Personal appointments (doctor, advisor meeting)
   - Club meetings, social events
   - Work shifts or general scheduling
   
3. **GENERAL_DOCUMENT** - Documents containing:
   - Study notes, lecture notes
   - Textbook excerpts or reading materials
   - Reference content without calendar items
   - Essays, papers, or written content
   - Lists or outlines without time components

ANALYSIS RULES:
1. Count specific entities: courses, classes, assignments, exams, events, meetings, study notes
2. Look for time-based patterns (days of week, times, dates)
3. Look for academic identifiers (course codes, professor names, room numbers)
4. Consider overall document structure and purpose

OUTPUT JSON FORMAT:
{
  "document_type": "academic_schedule" | "events" | "general_document",
  "confidence": 0.0-1.0,
  "detected_entities": {
    "courses": <number>,
    "classes": <number>,
    "assignments": <number>,
    "exams": <number>,
    "events": <number>,
    "meetings": <number>,
    "study_notes": <number>
  },
  "recommended_action": "schedule_parser" | "event_parser" | "rag_only",
  "reasoning": "<brief explanation of classification decision>"
}

DECISION MATRIX:
- courses >= 1 OR (classes >= 2 AND has_course_codes) → academic_schedule → schedule_parser
- events >= 1 OR meetings >= 1 (without course context) → events → event_parser
- No calendar-worthy items detected → general_document → rag_only`;

    const userPrompt = `Analyze and classify this document:

---
${documentText.substring(0, 4000)}
${documentText.length > 4000 ? '\n... [truncated]' : ''}
---

Return ONLY valid JSON with the classification result.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const result = await response.json();
    const aiContent = result.choices[0].message.content;

    console.log('AI Classification Response:', aiContent);

    // Parse JSON from response
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    const classification: ClassificationResult = JSON.parse(jsonMatch[0]);

    // Validate and normalize
    const validTypes = ['academic_schedule', 'events', 'general_document'];
    const validActions = ['schedule_parser', 'event_parser', 'rag_only'];

    if (!validTypes.includes(classification.document_type)) {
      classification.document_type = 'general_document';
    }
    if (!validActions.includes(classification.recommended_action)) {
      classification.recommended_action = 'rag_only';
    }
    if (typeof classification.confidence !== 'number' || classification.confidence < 0 || classification.confidence > 1) {
      classification.confidence = 0.7;
    }

    const processingTime = Date.now() - startTime;

    console.log('Classification result:', {
      type: classification.document_type,
      action: classification.recommended_action,
      confidence: classification.confidence,
      processing_time_ms: processingTime
    });

    return new Response(
      JSON.stringify({
        success: true,
        classification,
        metadata: {
          processing_time_ms: processingTime,
          text_length: documentText.length,
          model: 'google/gemini-2.5-flash'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Document classification error:', error);
    
    // Return fallback classification on error
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        classification: {
          document_type: 'general_document',
          confidence: 0.5,
          detected_entities: {
            courses: 0, classes: 0, assignments: 0, exams: 0,
            events: 0, meetings: 0, study_notes: 0
          },
          recommended_action: 'rag_only',
          reasoning: 'Classification failed, defaulting to RAG-only indexing'
        },
        metadata: {
          processing_time_ms: Date.now() - startTime,
          fallback: true
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
