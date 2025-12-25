import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

interface ScheduleParseRequest {
  file_id?: string;
  text_content?: string;
  user_id?: string;
  auto_add_to_calendar?: boolean;
  sync_to_google?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      file_id, 
      text_content, 
      user_id, 
      auto_add_to_calendar = false,
      sync_to_google = false 
    }: ScheduleParseRequest = await req.json();

    console.log('Enhanced schedule parser invoked:', { file_id, auto_add_to_calendar, sync_to_google });

    let extractedText = text_content;

    // If file_id provided, extract text from file
    if (file_id) {
      const { data: fileData, error: fileError } = await supabase
        .from('file_uploads')
        .select('*')
        .eq('id', file_id)
        .single();

      if (fileError) {
        throw new Error(`Failed to fetch file: ${fileError.message}`);
      }

      extractedText = fileData.ocr_text || '';
      if (!extractedText) {
        throw new Error('No text content found in file');
      }
    }

    if (!extractedText) {
      throw new Error('No text content provided for parsing');
    }

    console.log('Parsing text content with enhanced AI...');

    // Enhanced AI parsing with better prompts and structure
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert academic schedule parser. Extract and structure academic information from text with high accuracy.

CRITICAL: Always return valid JSON with this EXACT structure:
{
  "courses": [{"name": "", "code": "", "instructor": "", "credits": 3, "color": "#3B82F6"}],
  "classes": [{"title": "", "course_code": "", "day_of_week": 1, "start_time": "09:00", "end_time": "10:30", "location": "", "recurrence": "weekly"}],
  "assignments": [{"title": "", "course_code": "", "due_date": "2024-03-15T23:59:00Z", "description": "", "type": "homework"}],
  "exams": [{"title": "", "course_code": "", "date": "2024-03-20T10:00:00Z", "duration_minutes": 120, "location": "", "notes": ""}],
  "conflicts": []
}

PARSING RULES:
- Convert day names to numbers: Monday=1, Tuesday=2, ..., Sunday=0
- Use 24-hour time format (HH:MM)
- Convert dates to ISO format with timezone
- Detect course codes (e.g., CS101, MATH201, PHYS301)
- Identify class types: lecture, lab, seminar, tutorial
- Extract assignment types: homework, project, essay, quiz
- Identify exam types: midterm, final, quiz, test
- Default credits to 3 if not specified
- Assign colors based on subject: CS=#3B82F6, MATH=#10B981, PHYS=#F59E0B, etc.

CONFLICT DETECTION:
- Same time slot conflicts
- Overlapping exam schedules
- Assignment due date clusters
- Unrealistic schedules (too many classes in one day)`
          },
          {
            role: 'user',
            content: `Parse this academic schedule/syllabus text and extract structured data:\n\n${extractedText}`
          }
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const parsedContent = aiResponse.choices[0].message.content;

    console.log('AI parsing response:', parsedContent);

    // Extract JSON from response
    let scheduleData;
    try {
      const jsonMatch = parsedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        scheduleData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in AI response');
      }
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Validate and enhance schedule data
    scheduleData = validateAndEnhanceScheduleData(scheduleData);

    // Detect conflicts using the enhanced conflict detection
    const conflicts = await detectScheduleConflicts(scheduleData, user_id);
    scheduleData.conflicts = conflicts;

    // Update file record with parsed data
    if (file_id) {
      await supabase
        .from('file_uploads')
        .update({
          parsed_data: scheduleData,
          status: 'ai_parsed'
        })
        .eq('id', file_id);
    }

    // Auto-add to calendar if requested
    let calendarResults = null;
    if (auto_add_to_calendar && user_id) {
      console.log('Auto-adding to calendar...');
      calendarResults = await addScheduleToCalendar(scheduleData, user_id);
    }

    // Sync to Google Calendar if requested
    let googleSyncResults = null;
    if (sync_to_google && user_id) {
      console.log('Syncing to Google Calendar...');
      googleSyncResults = await syncToGoogleCalendar(scheduleData, user_id);
    }

    // Generate intelligent response
    const aiResponseText = generateIntelligentResponse(scheduleData, calendarResults, googleSyncResults, conflicts);

    return new Response(JSON.stringify({
      success: true,
      response: aiResponseText,
      schedule_data: scheduleData,
      conflicts: conflicts,
      calendar_results: calendarResults,
      google_sync_results: googleSyncResults,
      can_add_to_calendar: !auto_add_to_calendar,
      can_sync_to_google: !sync_to_google
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Enhanced schedule parser error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      response: "I encountered an error while parsing your schedule. Please check the file format and try again. Supported formats include PDFs, images, and text documents with clear schedule information."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function validateAndEnhanceScheduleData(data: any): any {
  // Ensure all required arrays exist
  const enhanced = {
    courses: data.courses || [],
    classes: data.classes || [],
    assignments: data.assignments || [],
    exams: data.exams || [],
    conflicts: data.conflicts || []
  };

  // Validate and enhance courses
  enhanced.courses = enhanced.courses.map((course: any, index: number) => ({
    name: course.name || `Course ${index + 1}`,
    code: course.code || `CRS${index + 1}`,
    instructor: course.instructor || '',
    credits: Number(course.credits) || 3,
    color: course.color || getSubjectColor(course.code || course.name)
  }));

  // Validate and enhance classes
  enhanced.classes = enhanced.classes.map((cls: any) => ({
    title: cls.title || cls.name || 'Class',
    course_code: cls.course_code || cls.code || '',
    day_of_week: validateDayOfWeek(cls.day_of_week),
    start_time: validateTime(cls.start_time),
    end_time: validateTime(cls.end_time),
    location: cls.location || '',
    recurrence: cls.recurrence || 'weekly'
  }));

  // Validate and enhance assignments
  enhanced.assignments = enhanced.assignments.map((assignment: any) => ({
    title: assignment.title || assignment.name || 'Assignment',
    course_code: assignment.course_code || assignment.code || '',
    due_date: validateDateTime(assignment.due_date),
    description: assignment.description || '',
    type: assignment.type || 'homework'
  }));

  // Validate and enhance exams
  enhanced.exams = enhanced.exams.map((exam: any) => ({
    title: exam.title || exam.name || 'Exam',
    course_code: exam.course_code || exam.code || '',
    date: validateDateTime(exam.date),
    duration_minutes: Number(exam.duration_minutes) || 120,
    location: exam.location || '',
    notes: exam.notes || ''
  }));

  return enhanced;
}

function getSubjectColor(codeOrName: string): string {
  const code = codeOrName.toUpperCase();
  if (code.includes('CS') || code.includes('COMP')) return '#3B82F6'; // Blue
  if (code.includes('MATH') || code.includes('CALC')) return '#10B981'; // Green
  if (code.includes('PHYS')) return '#F59E0B'; // Yellow
  if (code.includes('CHEM')) return '#EF4444'; // Red
  if (code.includes('BIO')) return '#8B5CF6'; // Purple
  if (code.includes('ENG') || code.includes('LIT')) return '#F97316'; // Orange
  if (code.includes('HIST')) return '#6B7280'; // Gray
  if (code.includes('PSYC')) return '#EC4899'; // Pink
  return '#3B82F6'; // Default blue
}

function validateDayOfWeek(day: any): number {
  if (typeof day === 'number') return Math.max(0, Math.min(6, day));
  if (typeof day === 'string') {
    const dayMap: { [key: string]: number } = {
      'sunday': 0, 'sun': 0,
      'monday': 1, 'mon': 1,
      'tuesday': 2, 'tue': 2, 'tues': 2,
      'wednesday': 3, 'wed': 3,
      'thursday': 4, 'thu': 4, 'thur': 4, 'thurs': 4,
      'friday': 5, 'fri': 5,
      'saturday': 6, 'sat': 6
    };
    return dayMap[day.toLowerCase()] || 1;
  }
  return 1; // Default to Monday
}

function validateTime(time: any): string {
  if (!time) return '09:00';
  if (typeof time === 'string') {
    // Handle various time formats
    const timeMatch = time.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const meridiem = timeMatch[3]?.toUpperCase();
      
      if (meridiem === 'PM' && hours !== 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }
  return '09:00';
}

function validateDateTime(dateTime: any): string {
  if (!dateTime) return new Date().toISOString();
  try {
    return new Date(dateTime).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

async function detectScheduleConflicts(scheduleData: any, userId?: string): Promise<any[]> {
  const conflicts: any[] = [];
  
  // Time slot conflicts in classes
  const classes = scheduleData.classes || [];
  for (let i = 0; i < classes.length; i++) {
    for (let j = i + 1; j < classes.length; j++) {
      const class1 = classes[i];
      const class2 = classes[j];
      
      if (class1.day_of_week === class2.day_of_week) {
        const start1 = timeToMinutes(class1.start_time);
        const end1 = timeToMinutes(class1.end_time);
        const start2 = timeToMinutes(class2.start_time);
        const end2 = timeToMinutes(class2.end_time);
        
        if ((start1 < end2 && end1 > start2)) {
          conflicts.push({
            type: 'schedule_overlap',
            severity: 'high',
            description: `Time conflict between "${class1.title}" and "${class2.title}"`,
            items: [class1, class2],
            suggested_action: 'reschedule_one'
          });
        }
      }
    }
  }
  
  // Assignment clustering (multiple assignments due on same date)
  const assignments = scheduleData.assignments || [];
  const assignmentsByDate = assignments.reduce((acc: any, assignment: any) => {
    const date = new Date(assignment.due_date).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(assignment);
    return acc;
  }, {});
  
  Object.entries(assignmentsByDate).forEach(([date, dayAssignments]: [string, any]) => {
    if (dayAssignments.length > 2) {
      conflicts.push({
        type: 'assignment_clustering',
        severity: 'medium',
        description: `${dayAssignments.length} assignments due on ${date}`,
        items: dayAssignments,
        suggested_action: 'redistribute_deadlines'
      });
    }
  });
  
  // Exam conflicts with existing schedule
  if (userId) {
    try {
      for (const exam of scheduleData.exams || []) {
        const examDate = new Date(exam.date);
        const examDay = examDate.getDay();
        
        // Check against existing classes
        const { data: existingClasses } = await supabase
          .from('schedule_blocks')
          .select('*')
          .eq('user_id', userId)
          .eq('day_of_week', examDay);
        
        if (existingClasses) {
          for (const existingClass of existingClasses) {
            const examHour = examDate.getHours();
            const examMinutes = examDate.getMinutes();
            const examTimeMinutes = examHour * 60 + examMinutes;
            
            const classStart = timeToMinutes(existingClass.start_time);
            const classEnd = timeToMinutes(existingClass.end_time);
            
            if (examTimeMinutes >= classStart && examTimeMinutes <= classEnd) {
              conflicts.push({
                type: 'exam_class_conflict',
                severity: 'high',
                description: `Exam "${exam.title}" conflicts with class "${existingClass.title}"`,
                items: [exam, existingClass],
                suggested_action: 'reschedule_exam'
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking exam conflicts:', error);
    }
  }
  
  return conflicts;
}

function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

async function addScheduleToCalendar(scheduleData: any, userId: string): Promise<any> {
  try {
    const results: { courses: number; classes: number; assignments: number; exams: number; errors: string[] } = { 
      courses: 0, classes: 0, assignments: 0, exams: 0, errors: [] 
    };
    
    // Add courses first
    const courseMap = new Map();
    for (const course of scheduleData.courses || []) {
      try {
        const { data: existingCourse } = await supabase
          .from('courses')
          .select('id')
          .eq('user_id', userId)
          .eq('code', course.code)
          .maybeSingle();

        if (!existingCourse) {
          const { data: newCourse, error } = await supabase
            .from('courses')
            .insert({
              user_id: userId,
              name: course.name,
              code: course.code,
              instructor: course.instructor,
              credits: course.credits,
              color: course.color,
              semester_id: '' // Will be set later
            })
            .select('id')
            .single();
          
          if (!error && newCourse) {
            courseMap.set(course.code, newCourse.id);
            results.courses++;
          }
        } else {
          courseMap.set(course.code, existingCourse.id);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        results.errors.push(`Course ${course.code}: ${errorMessage}`);
      }
    }

    // Add schedule blocks
    for (const classItem of scheduleData.classes || []) {
      try {
        const courseId = courseMap.get(classItem.course_code);
        await supabase
          .from('schedule_blocks')
          .insert({
            user_id: userId,
            title: classItem.title,
            course_id: courseId,
            day_of_week: classItem.day_of_week,
            start_time: classItem.start_time,
            end_time: classItem.end_time,
            location: classItem.location,
            is_recurring: true,
            recurrence_pattern: classItem.recurrence
          });
        results.classes++;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        results.errors.push(`Class ${classItem.title}: ${errorMessage}`);
      }
    }

    // Add assignments
    for (const assignment of scheduleData.assignments || []) {
      try {
        const courseId = courseMap.get(assignment.course_code);
        await supabase
          .from('assignments')
          .insert({
            user_id: userId,
            title: assignment.title,
            course_id: courseId,
            due_date: assignment.due_date,
            description: assignment.description,
            assignment_type: assignment.type
          });
        results.assignments++;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        results.errors.push(`Assignment ${assignment.title}: ${errorMessage}`);
      }
    }

    // Add exams
    for (const exam of scheduleData.exams || []) {
      try {
        const courseId = courseMap.get(exam.course_code);
        await supabase
          .from('exams')
          .insert({
            user_id: userId,
            title: exam.title,
            course_id: courseId,
            exam_date: exam.date,
            duration_minutes: exam.duration_minutes,
            location: exam.location,
            notes: exam.notes
          });
        results.exams++;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        results.errors.push(`Exam ${exam.title}: ${errorMessage}`);
      }
    }

    return results;
  } catch (error) {
    console.error('Error adding schedule to calendar:', error);
    throw error;
  }
}

async function syncToGoogleCalendar(scheduleData: any, userId: string): Promise<any> {
  try {
    // Check if user has Google Calendar connected
    const { data: googleToken } = await supabase
      .from('google_tokens')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!googleToken) {
      return { success: false, error: 'Google Calendar not connected' };
    }

    // Check if token is expired and refresh if needed
    const now = new Date();
    const expiresAt = new Date(googleToken.expires_at);
    
    if (now >= expiresAt && googleToken.refresh_token) {
      // Refresh token logic would go here
      console.log('Google token needs refresh');
    }

    // Invoke Google Calendar sync function
    const { data: syncResult, error: syncError } = await supabase.functions.invoke('google-calendar-sync', {
      body: {
        action: 'sync-schedule',
        userId: userId,
        scheduleData: scheduleData
      }
    });

    if (syncError) {
      throw syncError;
    }

    return syncResult;
  } catch (error) {
    console.error('Error syncing to Google Calendar:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function generateIntelligentResponse(
  scheduleData: any, 
  calendarResults: any, 
  googleSyncResults: any, 
  conflicts: any[]
): string {
  const { courses, classes, assignments, exams } = scheduleData;
  
  let response = "🎯 **Schedule Analysis Complete!**\n\n";
  
  // Summary of extracted data
  response += "**📊 Extracted Information:**\n";
  response += `• **${courses?.length || 0}** courses identified\n`;
  response += `• **${classes?.length || 0}** class sessions scheduled\n`;
  response += `• **${assignments?.length || 0}** assignments found\n`;
  response += `• **${exams?.length || 0}** exams detected\n\n`;

  // Highlight courses if found
  if (courses?.length > 0) {
    response += "**📚 Courses:**\n";
    courses.forEach((course: any) => {
      response += `• **${course.code}** - ${course.name}`;
      if (course.instructor) response += ` (${course.instructor})`;
      response += `\n`;
    });
    response += "\n";
  }

  // Calendar integration results
  if (calendarResults) {
    response += "**✅ Calendar Integration:**\n";
    response += `• Added ${calendarResults.courses} courses\n`;
    response += `• Added ${calendarResults.classes} class sessions\n`;
    response += `• Added ${calendarResults.assignments} assignments\n`;
    response += `• Added ${calendarResults.exams} exams\n`;
    
    if (calendarResults.errors?.length > 0) {
      response += `• ⚠️ ${calendarResults.errors.length} items had issues\n`;
    }
    response += "\n";
  }

  // Google Calendar sync results
  if (googleSyncResults) {
    if (googleSyncResults.success) {
      response += "**🔄 Google Calendar Sync:** ✅ Successfully synced to Google Calendar\n\n";
    } else {
      response += `**🔄 Google Calendar Sync:** ❌ ${googleSyncResults.error}\n\n`;
    }
  }

  // Conflict warnings
  if (conflicts?.length > 0) {
    response += "**⚠️ Schedule Conflicts Detected:**\n";
    conflicts.forEach((conflict: any) => {
      const severity = conflict.severity === 'high' ? '🔴' : '🟡';
      response += `${severity} **${conflict.type.replace('_', ' ').toUpperCase()}:** ${conflict.description}\n`;
    });
    response += "\n";
  }

  // Next steps and suggestions
  response += "**🚀 Next Steps:**\n";
  if (!calendarResults && !googleSyncResults) {
    response += "• Click **'Add to Calendar'** to integrate this schedule\n";
    response += "• Review the extracted information for accuracy\n";
  }
  if (conflicts?.length > 0) {
    response += "• Resolve the detected conflicts before finalizing\n";
  }
  response += "• Set up study sessions and reminders\n";
  response += "• Customize course colors and details\n\n";

  response += "**💡 Tip:** I can help you optimize your study schedule, set up reminders, and manage deadlines. Just ask!";

  return response;
}