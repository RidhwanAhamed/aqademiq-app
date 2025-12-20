/**
 * Get Course Files Edge Function
 * Purpose: Retrieve all files for a specific course with embedding status
 */
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get course_id from query params (GET) or body (POST)
    let courseId: string | null = null;
    
    if (req.method === 'GET') {
      const url = new URL(req.url);
      courseId = url.searchParams.get('course_id');
    } else if (req.method === 'POST') {
      try {
        const body = await req.json();
        courseId = body.course_id;
      } catch {
        // Body parse failed, continue
      }
    }

    if (!courseId) {
      return new Response(JSON.stringify({ error: 'course_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user owns the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, name')
      .eq('id', courseId)
      .eq('user_id', user.id)
      .single();

    if (courseError || !course) {
      return new Response(JSON.stringify({ error: 'Course not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch files for this course with embedding counts
    const { data: files, error: filesError } = await supabase
      .from('file_uploads')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    if (filesError) {
      console.error('Error fetching files:', filesError);
      throw new Error(`Database error: ${filesError.message}`);
    }

    // Get embedding counts for each file
    const fileIds = files?.map(f => f.id) || [];
    let embeddingCounts: Record<string, number> = {};

    if (fileIds.length > 0) {
      const { data: embeddings, error: embeddingsError } = await supabase
        .from('document_embeddings')
        .select('file_upload_id')
        .in('file_upload_id', fileIds);

      if (!embeddingsError && embeddings) {
        embeddingCounts = embeddings.reduce((acc, e) => {
          const id = e.file_upload_id;
          acc[id] = (acc[id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }
    }

    // Enrich files with embedding info
    const enrichedFiles = files?.map(file => ({
      ...file,
      chunk_count: embeddingCounts[file.id] || 0,
      is_indexed: (embeddingCounts[file.id] || 0) > 0,
      display_name: file.display_name || file.file_name,
    })) || [];

    console.log(`Fetched ${enrichedFiles.length} files for course ${courseId}`);

    return new Response(JSON.stringify({
      success: true,
      files: enrichedFiles,
      course: {
        id: course.id,
        name: course.name,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-course-files:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
