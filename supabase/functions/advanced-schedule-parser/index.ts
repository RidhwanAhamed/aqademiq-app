import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedScheduleData {
  courses: Course[];
  classes: ScheduleBlock[];
  assignments: Assignment[];
  exams: Exam[];
  important_dates: ImportantDate[];
  metadata: ParseMetadata;
}

interface Course {
  name: string;
  code: string;
  instructor?: string;
  credits?: number;
  color?: string;
  semester?: string;
}

interface ScheduleBlock {
  course_code: string;
  title: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location?: string;
  recurrence: string;
  week_type?: string;
  rotation_weeks?: number[];
}

interface Assignment {
  title: string;
  course_code?: string;
  due_date: string;
  type: string;
  description?: string;
  estimated_hours?: number;
  priority?: number;
}

interface Exam {
  title: string;
  course_code?: string;
  date: string;
  time?: string;
  location?: string;
  duration_minutes?: number;
  exam_type?: string;
}

interface ImportantDate {
  title: string;
  date: string;
  type: string;
  description?: string;
}

interface ParseMetadata {
  document_type: string;
  confidence_score: number;
  processing_time_ms: number;
  ai_model_used: string;
  extraction_method: string;
  quality_indicators: any;
  merged?: boolean;
  chunks_processed?: number;
  context_awareness?: boolean;
}

interface ConflictResult {
  conflict_type: string;
  conflict_id: string;
  conflict_title: string;
  conflict_start: string;
  conflict_end: string;
  severity: 'minor' | 'major' | 'critical';
  suggestions: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    // OpenRouter is optional - used as fallback if OpenAI fails
    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { 
      file_id, 
      user_id, 
      auto_add_to_calendar = true, 
      sync_to_google = false,
      parsing_options = {} 
    } = await req.json();

    if (!file_id) {
      return new Response(
        JSON.stringify({ error: 'File ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Advanced schedule parsing:', { file_id, user_id, parsing_options });

    // Get file upload data with enhanced metadata
    const { data: fileData, error: fileError } = await supabase
      .from('file_uploads')
      .select('*')
      .eq('id', file_id)
      .single();

    if (fileError || !fileData) {
      throw new Error('File not found or inaccessible');
    }

    if (!fileData.ocr_text) {
      throw new Error('No OCR text available - please process file with OCR first');
    }

    // Get user's existing courses and schedule for context
    const userContext = await getUserContext(supabase, user_id);

    // Advanced AI parsing with chunking for large documents
    const textToParse = fileData.ocr_text || '';
    console.log(`Processing OCR text: ${textToParse.length} characters`);
    
    const parsedData = textToParse.length > 10000
      ? await parseInChunks(textToParse, userContext, openRouterApiKey)
      : await advancedAIParsing(
          extractRelevantLines(textToParse), 
          fileData.parsed_data, 
          userContext,
          openRouterApiKey
        );

    // Intelligent conflict detection with existing schedule
    const conflicts = await detectAdvancedConflicts(supabase, user_id, parsedData);

    // Generate intelligent suggestions for optimization
    const suggestions = await generateScheduleSuggestions(parsedData, userContext, conflicts);

    // Update file record with comprehensive parsed data
    await supabase
      .from('file_uploads')
      .update({ 
        parsed_data: {
          ...parsedData,
          conflicts,
          suggestions,
          user_context: {
            existing_courses: userContext.courses.length,
            existing_schedule_blocks: userContext.scheduleBlocks.length,
            processing_timestamp: new Date().toISOString()
          }
        },
        status: 'advanced_parsed'
      })
      .eq('id', file_id);

    // IMPORTANT: Trigger embedding generation so files don't get stuck
    // This ensures the file content becomes searchable in RAG
    console.log(`Triggering embedding generation for file ${file_id}...`);
    try {
      const embeddingResult = await supabase.functions.invoke('generate-embeddings', {
        body: {
          file_upload_id: file_id,
          course_id: fileData.course_id,
          source_type: fileData.source_type || 'other',
          metadata: {
            file_name: fileData.file_name,
            display_name: fileData.display_name || fileData.file_name,
            parsed_by: 'advanced-schedule-parser',
          },
        },
      });
      
      if (embeddingResult.error) {
        console.error('Embedding generation failed (non-blocking):', embeddingResult.error);
        // Don't fail the entire operation - embeddings can be retried later
      } else {
        console.log(`Embeddings generated: ${embeddingResult.data?.embeddings_stored || 0} chunks`);
        // Update status to indexed
        await supabase
          .from('file_uploads')
          .update({ status: 'indexed' })
          .eq('id', file_id);
      }
    } catch (embError) {
      console.error('Embedding error (non-blocking):', embError);
    }

    // Auto-add to calendar if requested
    let calendarResults = null;
    if (auto_add_to_calendar && user_id) {
      calendarResults = await autoAddToCalendar(supabase, user_id, parsedData, conflicts);
    }

    // Google Calendar sync if requested
    let googleSyncResults = null;
    if (sync_to_google && user_id) {
      googleSyncResults = await syncToGoogleCalendar(supabase, user_id, parsedData);
    }

    const processingTime = Date.now() - startTime;

    // Generate comprehensive response message
    const responseMessage = generateResponseMessage(parsedData, conflicts, suggestions, calendarResults);

    return new Response(
      JSON.stringify({ 
        success: true,
        response: responseMessage,
        schedule_data: parsedData,
        conflicts,
        suggestions,
        calendar_results: calendarResults,
        google_sync_results: googleSyncResults,
        metadata: {
          ...parsedData.metadata,
          processing_time_ms: processingTime,
          conflicts_detected: conflicts.length,
          suggestions_generated: suggestions.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Advanced schedule parsing error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Advanced parsing failed',
        processing_time_ms: Date.now() - startTime
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function getUserContext(supabase: any, userId: string) {
  if (!userId) return { courses: [], scheduleBlocks: [], assignments: [], exams: [] };

  // Get user's existing data for context
  const [coursesResult, scheduleResult, assignmentsResult, examsResult] = await Promise.all([
    supabase.from('courses').select('*').eq('user_id', userId).eq('is_active', true),
    supabase.from('schedule_blocks').select('*').eq('user_id', userId).eq('is_active', true),
    supabase.from('assignments').select('*').eq('user_id', userId).eq('is_completed', false),
    supabase.from('exams').select('*').eq('user_id', userId)
  ]);

  return {
    courses: coursesResult.data || [],
    scheduleBlocks: scheduleResult.data || [],
    assignments: assignmentsResult.data || [],
    exams: examsResult.data || []
  };
}

// Helper: Extract only OCR lines containing dates/times/course codes
function extractRelevantLines(ocr: string): string {
  const relevantPattern = /(mon|tue|wed|thu|fri|sat|sun|am|pm|\b\d{1,2}:\d{2}\b|\b[A-Z]{2,4}\s?\d{3,4}\b|\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b)/i;
  const lines = ocr.split('\n').filter(line => relevantPattern.test(line));
  return lines.length > 100 ? lines.join('\n') : ocr; // Fallback to full text if filtered is too small
}

// Helper: Chunk large text to avoid token overflows
function chunkText(text: string, chunkSize = 8000): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

// Helper: Parse text in chunks and merge results
async function parseInChunks(
  ocrText: string, 
  userContext: any, 
  apiKey?: string
): Promise<ParsedScheduleData> {
  console.log('Chunking large document for processing...');
  const chunks = chunkText(ocrText, 8000);
  const partials: ParsedScheduleData[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Processing chunk ${i + 1}/${chunks.length}`);
    const partial = await advancedAIParsing(
      extractRelevantLines(chunks[i]), 
      undefined, 
      userContext, 
      apiKey
    );
    partials.push(partial);
  }
  
  return mergeParsedPartials(partials);
}

// Helper: Merge multiple parsed chunks into one result
function mergeParsedPartials(parts: ParsedScheduleData[]): ParsedScheduleData {
  const merged: ParsedScheduleData = {
    courses: [],
    classes: [],
    assignments: [],
    exams: [],
    important_dates: [],
    metadata: {
      ...parts[0]?.metadata,
      merged: true,
      chunks_processed: parts.length
    }
  };
  
  const pushUnique = (arr: any[], item: any, keyFn: (x: any) => string) => {
    if (!arr.some(a => keyFn(a) === keyFn(item))) {
      arr.push(item);
    }
  };
  
  for (const part of parts) {
    (part.courses || []).forEach(c => 
      pushUnique(merged.courses, c, x => `${x.code}|${x.name}`)
    );
    (part.classes || []).forEach(c => 
      pushUnique(merged.classes, c, x => `${x.course_code}|${x.day_of_week}|${x.start_time}|${x.end_time}`)
    );
    (part.assignments || []).forEach(a => 
      pushUnique(merged.assignments, a, x => `${x.title}|${x.due_date}`)
    );
    (part.exams || []).forEach(e => 
      pushUnique(merged.exams, e, x => `${x.title}|${x.date}`)
    );
    (part.important_dates || []).forEach(d => 
      pushUnique(merged.important_dates, d, x => `${x.title}|${x.date}`)
    );
  }
  
  return merged;
}

async function advancedAIParsing(
  ocrText: string, 
  existingParsedData: any, 
  userContext: any,
  apiKey?: string
): Promise<ParsedScheduleData> {
  
  console.log('Starting advanced AI parsing with enhanced context...');

  // Enhanced system prompt with context awareness
  const systemPrompt = `You are an advanced academic schedule AI parser with expertise in educational document analysis.

CONTEXT AWARENESS:
- User has ${userContext.courses.length} existing courses
- User has ${userContext.scheduleBlocks.length} existing schedule blocks
- User has ${userContext.assignments.length} pending assignments
- User has ${userContext.exams.length} upcoming exams

ADVANCED PARSING REQUIREMENTS:
1. Extract ALL academic information with high precision
2. Identify recurring patterns (weekly, biweekly, specific weeks)
3. Detect course prerequisites and relationships
4. Calculate realistic time estimates for assignments
5. Identify potential scheduling conflicts
6. Extract instructor office hours and contact information
7. Parse complex time formats and date ranges
8. Understand academic calendar terms (semester, quarter, term)
9. Extract grading rubrics and weight distributions
10. Identify study recommendations and resource links

DOCUMENT TYPES TO HANDLE:
- University syllabi with complex formatting
- Multi-course timetables with overlapping schedules
- Academic calendars with holiday and break periods
- Assignment sheets with detailed requirements
- Exam schedules with multiple time slots
- Course registration documents
- Academic policy documents

OUTPUT REQUIREMENTS:
Return valid JSON with comprehensive structured data including confidence scores for each extracted element.

INTELLIGENT DEFAULTS:
- Estimate assignment duration based on type and course level
- Assign appropriate priorities based on due dates and weight
- Suggest optimal study schedules based on workload
- Generate realistic time buffers for transitions
- Account for academic holidays and break periods

Be thorough, accurate, and provide actionable insights for academic success.`;

  const userPrompt = `Parse this academic document with advanced analysis:

DOCUMENT TEXT:
${ocrText}

EXISTING USER DATA FOR CONTEXT:
${JSON.stringify(userContext, null, 2)}

REQUIRED OUTPUT FORMAT:
{
  "courses": [
    {
      "name": "Course Title",
      "code": "DEPT123",
      "instructor": "Prof. Name",
      "credits": 3,
      "color": "#3B82F6",
      "semester": "Fall 2024",
      "prerequisites": ["DEPT101"],
      "description": "Course description if available"
    }
  ],
  "classes": [
    {
      "course_code": "DEPT123",
      "title": "Lecture/Lab/Seminar",
      "day_of_week": 1,
      "start_time": "09:00:00",
      "end_time": "10:30:00",
      "location": "Room 101",
      "recurrence": "weekly",
      "week_type": null,
      "rotation_weeks": null,
      "instructor": "Prof. Name"
    }
  ],
  "assignments": [
    {
      "title": "Assignment Title",
      "course_code": "DEPT123",
      "due_date": "2024-09-15T23:59:00",
      "type": "homework",
      "description": "Assignment description",
      "estimated_hours": 4,
      "priority": 2,
      "weight_percentage": 15
    }
  ],
  "exams": [
    {
      "title": "Midterm Exam",
      "course_code": "DEPT123", 
      "date": "2024-10-15T14:00:00",
      "time": "14:00:00",
      "location": "Exam Hall A",
      "duration_minutes": 120,
      "exam_type": "midterm",
      "weight_percentage": 25,
      "study_hours_recommended": 15
    }
  ],
  "important_dates": [
    {
      "title": "Registration Deadline",
      "date": "2024-08-30",
      "type": "deadline",
      "description": "Last day to register for courses"
    }
  ],
  "metadata": {
    "document_type": "syllabus",
    "confidence_score": 0.92,
    "processing_time_ms": 0,
    "ai_model_used": "gpt-4o-mini",
    "extraction_method": "advanced_contextual",
    "quality_indicators": {
      "dates_extracted": 15,
      "times_extracted": 8,
      "courses_identified": 3,
      "structure_clarity": "high"
    }
  }
}

Provide comprehensive analysis with high accuracy and detailed metadata.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1, // Low temperature for consistent parsing
        max_tokens: 2500 // Reduced to avoid token overflow
      })
    });

    if (!response.ok) {
      // Fallback to OpenRouter if configured
      console.log('OpenAI failed, trying OpenRouter fallback if available...');
      if (!apiKey) {
        throw new Error('Parsing failed with OpenAI and no OpenRouter API key is configured for fallback');
      }
      return await fallbackAIParsing(ocrText, userContext, apiKey);
    }

    const result = await response.json();
    const aiContent = result.choices[0].message.content;

    console.log('Advanced AI parsing response received');

    let parsedData: ParsedScheduleData;
    try {
      parsedData = JSON.parse(aiContent);
      
      // Enhance metadata
      parsedData.metadata = {
        ...parsedData.metadata,
        processing_time_ms: Date.now(),
        ai_model_used: 'gpt-4o-mini',
        extraction_method: 'advanced_contextual',
        context_awareness: true
      };
      
    } catch (parseError) {
      console.error('JSON parsing failed, using fallback parsing...');
      if (!apiKey) throw new Error('No fallback API key available');
      return await fallbackAIParsing(ocrText, userContext, apiKey);
    }

    return parsedData;

  } catch (error) {
    console.error('Advanced AI parsing failed:', error);
    if (!apiKey) throw new Error('No fallback API key available');
    return await fallbackAIParsing(ocrText, userContext, apiKey);
  }
}

async function fallbackAIParsing(ocrText: string, userContext: any, apiKey: string): Promise<ParsedScheduleData> {
  console.log('Using OpenRouter fallback for parsing...');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': Deno.env.get('SUPABASE_URL') || '',
      'X-Title': 'Advanced Schedule Parser'
    },
    body: JSON.stringify({
      model: 'google/gemma-2-27b-it',
      messages: [
        {
          role: 'system',
          content: `You are an advanced academic schedule parser. Extract structured data from academic documents with high precision. Focus on dates, times, courses, assignments, and exams.`
        },
        {
          role: 'user',
          content: `Parse this academic document: ${ocrText}`
        }
      ],
      temperature: 0.2,
      max_tokens: 3000
    })
  });

  if (!response.ok) {
    throw new Error(`Fallback AI API error: ${response.statusText}`);
  }

  const result = await response.json();
  const content = result.choices[0].message.content;

  // Basic parsing with fallback structure
  return {
    courses: [],
    classes: [],
    assignments: [],
    exams: [],
    important_dates: [],
    metadata: {
      document_type: 'unknown',
      confidence_score: 0.6,
      processing_time_ms: Date.now(),
      ai_model_used: 'gemma-2-27b-it',
      extraction_method: 'fallback_basic',
      quality_indicators: {
        fallback_used: true,
        raw_response: content
      }
    }
  };
}

async function detectAdvancedConflicts(supabase: any, userId: string, parsedData: ParsedScheduleData): Promise<ConflictResult[]> {
  const conflicts: ConflictResult[] = [];

  if (!userId) return conflicts;

  console.log('Detecting advanced scheduling conflicts...');

  // Check for class time conflicts
  for (const newClass of parsedData.classes) {
    const { data: existingClasses } = await supabase
      .from('schedule_blocks')
      .select('*')
      .eq('user_id', userId)
      .eq('day_of_week', newClass.day_of_week)
      .eq('is_active', true);

    if (existingClasses) {
      for (const existing of existingClasses) {
        const conflict = detectTimeOverlap(newClass, existing);
        if (conflict) {
          conflicts.push({
            conflict_type: 'class_overlap',
            conflict_id: existing.id,
            conflict_title: existing.title,
            conflict_start: existing.start_time,
            conflict_end: existing.end_time,
            severity: calculateConflictSeverity(newClass, existing),
            suggestions: generateConflictSuggestions(newClass, existing)
          });
        }
      }
    }
  }

  // Check for assignment deadline clustering
  const assignmentDates = parsedData.assignments.map(a => new Date(a.due_date));
  const clusteredDates = findDateClusters(assignmentDates);
  
  for (const cluster of clusteredDates) {
    if (cluster.length > 2) { // More than 2 assignments due within 3 days
      conflicts.push({
        conflict_type: 'deadline_cluster',
        conflict_id: 'cluster-' + cluster.map(d => d.getTime()).join('-'),
        conflict_title: `${cluster.length} assignments due within 3 days`,
        conflict_start: cluster[0].toISOString(),
        conflict_end: cluster[cluster.length - 1].toISOString(),
        severity: cluster.length > 3 ? 'critical' : 'major',
        suggestions: [
          'Consider starting assignments early',
          'Discuss deadline extensions with instructors',
          'Prioritize assignments by weight and difficulty'
        ]
      });
    }
  }

  return conflicts;
}

function detectTimeOverlap(class1: any, class2: any): boolean {
  const start1 = new Date(`2024-01-01T${class1.start_time}`);
  const end1 = new Date(`2024-01-01T${class1.end_time}`);
  const start2 = new Date(`2024-01-01T${class2.start_time}`);
  const end2 = new Date(`2024-01-01T${class2.end_time}`);

  return start1 < end2 && start2 < end1;
}

function calculateConflictSeverity(class1: any, class2: any): 'minor' | 'major' | 'critical' {
  // Calculate overlap duration
  const start1 = new Date(`2024-01-01T${class1.start_time}`);
  const end1 = new Date(`2024-01-01T${class1.end_time}`);
  const start2 = new Date(`2024-01-01T${class2.start_time}`);
  const end2 = new Date(`2024-01-01T${class2.end_time}`);

  const overlapStart = new Date(Math.max(start1.getTime(), start2.getTime()));
  const overlapEnd = new Date(Math.min(end1.getTime(), end2.getTime()));
  const overlapMinutes = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60);

  if (overlapMinutes >= 60) return 'critical';
  if (overlapMinutes >= 30) return 'major';
  return 'minor';
}

function generateConflictSuggestions(class1: any, class2: any): string[] {
  return [
    'Check if either class offers alternative time slots',
    'Contact instructors about scheduling flexibility',
    'Consider online or hybrid options if available',
    'Look for equivalent courses in different semesters'
  ];
}

function findDateClusters(dates: Date[], thresholdDays = 3): Date[][] {
  const clusters: Date[][] = [];
  const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());

  let currentCluster: Date[] = [];
  
  for (const date of sortedDates) {
    if (currentCluster.length === 0) {
      currentCluster = [date];
    } else {
      const lastDate = currentCluster[currentCluster.length - 1];
      const diffDays = (date.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (diffDays <= thresholdDays) {
        currentCluster.push(date);
      } else {
        if (currentCluster.length > 1) {
          clusters.push(currentCluster);
        }
        currentCluster = [date];
      }
    }
  }
  
  if (currentCluster.length > 1) {
    clusters.push(currentCluster);
  }

  return clusters;
}

async function generateScheduleSuggestions(parsedData: ParsedScheduleData, userContext: any, conflicts: ConflictResult[]): Promise<string[]> {
  const suggestions: string[] = [];

  // Workload analysis
  const totalCredits = parsedData.courses.reduce((sum, course) => sum + (course.credits || 3), 0);
  const totalAssignments = parsedData.assignments.length;
  const totalExams = parsedData.exams.length;

  if (totalCredits > 18) {
    suggestions.push('📚 High credit load detected - consider dropping a course or planning study time carefully');
  }

  if (totalAssignments > 20) {
    suggestions.push('📝 Many assignments detected - create a detailed schedule to avoid deadline rushes');
  }

  // Study time recommendations
  const estimatedStudyHours = parsedData.assignments.reduce((sum, assignment) => 
    sum + (assignment.estimated_hours || 2), 0
  );

  if (estimatedStudyHours > 40) {
    suggestions.push('⏰ High study time commitment - consider time blocking and productivity techniques');
  }

  // Conflict-based suggestions
  if (conflicts.length > 0) {
    suggestions.push(`⚠️ ${conflicts.length} scheduling conflicts detected - review and resolve before finalizing`);
  }

  // Balance suggestions
  const classDays = new Set(parsedData.classes.map(c => c.day_of_week));
  if (classDays.size <= 2) {
    suggestions.push('📅 Classes concentrated in few days - consider spreading workload throughout the week');
  }

  return suggestions;
}

async function autoAddToCalendar(supabase: any, userId: string, parsedData: ParsedScheduleData, conflicts: ConflictResult[]): Promise<any> {
  console.log('Auto-adding schedule to calendar...');

  try {
    const results: {
      courses_added: number;
      classes_added: number;
      assignments_added: number;
      exams_added: number;
      conflicts_skipped: number;
      errors: string[];
    } = {
      courses_added: 0,
      classes_added: 0,
      assignments_added: 0,
      exams_added: 0,
      conflicts_skipped: 0,
      errors: []
    };

    // Add courses first
    for (const course of parsedData.courses) {
      try {
        // Check if course already exists
        const { data: existing } = await supabase
          .from('courses')
          .select('id')
          .eq('user_id', userId)
          .eq('code', course.code)
          .single();

        if (!existing) {
          await supabase.from('courses').insert({
            user_id: userId,
            name: course.name,
            code: course.code,
            instructor: course.instructor,
            credits: course.credits || 3,
            color: course.color || '#3B82F6'
          });
          results.courses_added++;
        }
      } catch (error) {
        results.errors.push(`Course ${course.code}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Add schedule blocks
    for (const scheduleBlock of parsedData.classes) {
      try {
        const hasConflict = conflicts.some(c => c.conflict_type === 'class_overlap');
        
        if (hasConflict) {
          results.conflicts_skipped++;
          continue;
        }

        await supabase.from('schedule_blocks').insert({
          user_id: userId,
          title: scheduleBlock.title,
          day_of_week: scheduleBlock.day_of_week,
          start_time: scheduleBlock.start_time,
          end_time: scheduleBlock.end_time,
          location: scheduleBlock.location,
          recurrence_pattern: scheduleBlock.recurrence
        });
        results.classes_added++;
      } catch (error) {
        results.errors.push(`Schedule block ${scheduleBlock.title}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Add assignments
    for (const assignment of parsedData.assignments) {
      try {
        await supabase.from('assignments').insert({
          user_id: userId,
          title: assignment.title,
          due_date: assignment.due_date,
          assignment_type: assignment.type,
          description: assignment.description,
          estimated_hours: assignment.estimated_hours || 2,
          priority: assignment.priority || 2
        });
        results.assignments_added++;
      } catch (error) {
        results.errors.push(`Assignment ${assignment.title}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Add exams
    for (const exam of parsedData.exams) {
      try {
        await supabase.from('exams').insert({
          user_id: userId,
          title: exam.title,
          exam_date: exam.date,
          location: exam.location,
          duration_minutes: exam.duration_minutes || 120,
          exam_type: exam.exam_type || 'exam'
        });
        results.exams_added++;
      } catch (error) {
        results.errors.push(`Exam ${exam.title}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  } catch (error) {
    console.error('Auto-add to calendar failed:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function syncToGoogleCalendar(supabase: any, userId: string, parsedData: ParsedScheduleData): Promise<any> {
  // Google Calendar sync implementation would go here
  console.log('Google Calendar sync not implemented yet');
  return { status: 'not_implemented' };
}

function generateResponseMessage(parsedData: ParsedScheduleData, conflicts: ConflictResult[], suggestions: string[], calendarResults: any): string {
  let message = `🎓 **Schedule Analysis Complete!**\n\n`;

  // Summary statistics
  message += `**📊 What I Found:**\n`;
  message += `• ${parsedData.courses.length} courses\n`;
  message += `• ${parsedData.classes.length} class sessions\n`;
  message += `• ${parsedData.assignments.length} assignments\n`;
  message += `• ${parsedData.exams.length} exams\n\n`;

  // Conflicts section
  if (conflicts.length > 0) {
    message += `**⚠️ Scheduling Conflicts (${conflicts.length}):**\n`;
    conflicts.forEach(conflict => {
      message += `• ${conflict.conflict_title} (${conflict.severity})\n`;
    });
    message += `\n`;
  }

  // Calendar integration results
  if (calendarResults && !calendarResults.error) {
    message += `**📅 Added to Your Calendar:**\n`;
    if (calendarResults.courses_added > 0) message += `• ${calendarResults.courses_added} courses\n`;
    if (calendarResults.classes_added > 0) message += `• ${calendarResults.classes_added} class schedules\n`;
    if (calendarResults.assignments_added > 0) message += `• ${calendarResults.assignments_added} assignments\n`;
    if (calendarResults.exams_added > 0) message += `• ${calendarResults.exams_added} exams\n`;
    message += `\n`;
  }

  // Suggestions
  if (suggestions.length > 0) {
    message += `**💡 Smart Recommendations:**\n`;
    suggestions.forEach(suggestion => {
      message += `${suggestion}\n`;
    });
    message += `\n`;
  }

  message += `✨ **Your academic schedule is now organized and optimized!**`;

  return message;
}