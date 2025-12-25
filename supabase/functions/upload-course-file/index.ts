/**
 * Upload Course File Edge Function
 * Purpose: Handle file uploads with course association, OCR, and automatic embedding generation
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supported file types
const SUPPORTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp',
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

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

    const { 
      course_id, 
      file_name, 
      file_type, 
      file_data, // base64 encoded
      source_type = 'other',
      display_name,
      description,
    } = await req.json();

    // Validate required fields
    if (!course_id || !file_name || !file_type || !file_data) {
      return new Response(JSON.stringify({ 
        error: 'course_id, file_name, file_type, and file_data are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate source_type
    const validSourceTypes = ['syllabus', 'lecture', 'notes', 'textbook', 'assignment', 'other'];
    if (!validSourceTypes.includes(source_type)) {
      return new Response(JSON.stringify({ 
        error: `Invalid source_type. Must be one of: ${validSourceTypes.join(', ')}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user owns the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, name')
      .eq('id', course_id)
      .eq('user_id', user.id)
      .single();

    if (courseError || !course) {
      return new Response(JSON.stringify({ error: 'Course not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Decode base64 file
    let fileBuffer: Uint8Array;
    try {
      const base64Data = file_data.includes(',') ? file_data.split(',')[1] : file_data;
      fileBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    } catch (decodeError) {
      return new Response(JSON.stringify({ error: 'Invalid file data encoding' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate file size
    if (fileBuffer.length > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ 
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Uploading file ${file_name} (${file_type}, ${fileBuffer.length} bytes) for course ${course_id}`);

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedFileName = file_name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${user.id}/${course_id}/${timestamp}_${sanitizedFileName}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('study-files')
      .upload(storagePath, fileBuffer, {
        contentType: file_type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Storage error: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('study-files')
      .getPublicUrl(storagePath);

    const fileUrl = urlData?.publicUrl || null;

    // Create file_uploads record
    const { data: fileRecord, error: insertError } = await supabase
      .from('file_uploads')
      .insert({
        user_id: user.id,
        course_id: course_id,
        file_name: file_name,
        file_type: file_type,
        file_url: fileUrl,
        source_type: source_type,
        display_name: display_name || file_name,
        description: description || null,
        status: 'uploaded',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      // Try to clean up uploaded file
      await supabase.storage.from('study-files').remove([storagePath]);
      throw new Error(`Database error: ${insertError.message}`);
    }

    console.log(`Created file record ${fileRecord.id}, triggering OCR processing...`);

    // Trigger OCR processing asynchronously
    const ocrPromise = supabase.functions.invoke('enhanced-ocr-parser', {
      body: {
        file_id: fileRecord.id, // Changed from file_upload_id to file_id
        file_type: file_type,
      },
      headers: {
        Authorization: authHeader,
      },
    }).then(async (ocrResult) => {
      if (ocrResult.error) {
        console.error('OCR processing error:', ocrResult.error);
        await supabase
          .from('file_uploads')
          .update({ status: 'ocr_failed' })
          .eq('id', fileRecord.id);
        return;
      }

      console.log(`OCR completed for ${fileRecord.id}, triggering embedding generation...`);

      // Update status
      await supabase
        .from('file_uploads')
        .update({ status: 'indexing' })
        .eq('id', fileRecord.id);

      // Trigger embedding generation
      const embeddingResult = await supabase.functions.invoke('generate-embeddings', {
        body: {
          file_upload_id: fileRecord.id,
          course_id: course_id,
          source_type: source_type,
          metadata: {
            file_name: file_name,
            display_name: display_name || file_name,
            course_name: course.name,
          },
        },
        headers: {
          Authorization: authHeader,
        },
      });

      if (embeddingResult.error) {
        console.error('Embedding generation error:', embeddingResult.error);
        await supabase
          .from('file_uploads')
          .update({ status: 'embedding_failed' })
          .eq('id', fileRecord.id);
      } else {
        console.log(`Embeddings generated for ${fileRecord.id}`);
        await supabase
          .from('file_uploads')
          .update({ status: 'indexed' })
          .eq('id', fileRecord.id);
      }
    }).catch((err) => {
      console.error('Background processing error:', err);
    });

    // Don't await the background processing - return immediately
    // The client can poll for status updates

    return new Response(JSON.stringify({
      success: true,
      file: {
        id: fileRecord.id,
        file_name: fileRecord.file_name,
        file_url: fileRecord.file_url,
        source_type: fileRecord.source_type,
        display_name: fileRecord.display_name,
        status: fileRecord.status,
        course_id: course_id,
        course_name: course.name,
      },
      message: 'File uploaded successfully. Processing OCR and indexing in background.',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in upload-course-file:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
