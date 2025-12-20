/**
 * Delete Course File Edge Function
 * Purpose: Delete a file and its associated embeddings
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

    const { file_id } = await req.json();

    if (!file_id) {
      return new Response(JSON.stringify({ error: 'file_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user owns the file
    const { data: file, error: fileError } = await supabase
      .from('file_uploads')
      .select('id, file_name, file_url')
      .eq('id', file_id)
      .eq('user_id', user.id)
      .single();

    if (fileError || !file) {
      return new Response(JSON.stringify({ error: 'File not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Deleting file ${file_id} (${file.file_name}) for user ${user.id}`);

    // Delete embeddings first (referential integrity)
    const { error: embeddingsDeleteError } = await supabase
      .from('document_embeddings')
      .delete()
      .eq('file_upload_id', file_id)
      .eq('user_id', user.id);

    if (embeddingsDeleteError) {
      console.error('Error deleting embeddings:', embeddingsDeleteError);
      // Continue anyway - embeddings might not exist
    }

    // Delete from storage if file_url exists
    if (file.file_url) {
      try {
        // Extract path from URL
        const urlParts = file.file_url.split('/storage/v1/object/public/');
        if (urlParts.length > 1) {
          const pathParts = urlParts[1].split('/');
          const bucket = pathParts[0];
          const filePath = pathParts.slice(1).join('/');
          
          const { error: storageError } = await supabase.storage
            .from(bucket)
            .remove([filePath]);

          if (storageError) {
            console.error('Error deleting from storage:', storageError);
            // Continue anyway - file might not exist in storage
          }
        }
      } catch (storageParseError) {
        console.error('Error parsing storage URL:', storageParseError);
      }
    }

    // Delete file_uploads record
    const { error: deleteError } = await supabase
      .from('file_uploads')
      .delete()
      .eq('id', file_id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting file record:', deleteError);
      throw new Error(`Database error: ${deleteError.message}`);
    }

    console.log(`Successfully deleted file ${file_id}`);

    return new Response(JSON.stringify({
      success: true,
      deleted_file_id: file_id,
      file_name: file.file_name,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in delete-course-file:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
