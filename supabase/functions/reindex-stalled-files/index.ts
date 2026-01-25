/**
 * Reindex Stalled Files Edge Function
 * Purpose: Find files stuck at 'ocr_completed' status without embeddings and re-trigger indexing
 * This is a recovery job for files that failed during the initial upload pipeline
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StalledFile {
  id: string;
  file_name: string;
  file_type: string;
  course_id: string | null;
  ocr_text_length: number;
  status: string;
  created_at: string;
}

interface ReindexResult {
  file_id: string;
  file_name: string;
  status: 'success' | 'failed' | 'skipped';
  message: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user (admin or owner only)
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

    const { user_id, file_id, dry_run = false, limit = 10 } = await req.json().catch(() => ({}));
    
    // If specific file_id is provided, process only that file
    // Otherwise, find all stalled files for the user
    const targetUserId = user_id || user.id;

    console.log(`Reindex job started for user: ${targetUserId}, dry_run: ${dry_run}, limit: ${limit}`);

    // Find stalled files: any status EXCEPT 'indexed' (which means embeddings exist)
    // This catches all stalled statuses: ocr_completed, uploaded, advanced_parsed, parsed, indexing, embedding_failed, etc.
    let query = supabase
      .from('file_uploads')
      .select(`
        id,
        file_name,
        file_type,
        course_id,
        ocr_text,
        status,
        created_at,
        source_type,
        display_name
      `)
      .eq('user_id', targetUserId)
      .neq('status', 'indexed'); // All non-indexed files are potentially stalled

    if (file_id) {
      query = query.eq('id', file_id);
    }

    const { data: files, error: fetchError } = await query.limit(limit);

    if (fetchError) {
      throw new Error(`Failed to fetch files: ${fetchError.message}`);
    }

    if (!files || files.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No stalled files found',
        processed: 0,
        results: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${files.length} potentially stalled files`);

    // Check which files actually have embeddings
    const fileIds = files.map(f => f.id);
    const { data: existingEmbeddings } = await supabase
      .from('document_embeddings')
      .select('file_upload_id')
      .in('file_upload_id', fileIds);

    const filesWithEmbeddings = new Set((existingEmbeddings || []).map(e => e.file_upload_id));

    // Filter to files that need reindexing
    const stalledFiles: StalledFile[] = files
      .filter(f => !filesWithEmbeddings.has(f.id))
      .filter(f => f.ocr_text && f.ocr_text.length > 50) // Must have meaningful OCR text
      .map(f => ({
        id: f.id,
        file_name: f.file_name,
        file_type: f.file_type,
        course_id: f.course_id,
        ocr_text_length: f.ocr_text?.length || 0,
        status: f.status,
        created_at: f.created_at
      }));

    console.log(`${stalledFiles.length} files need reindexing (missing embeddings with valid OCR text)`);

    if (dry_run) {
      return new Response(JSON.stringify({
        success: true,
        dry_run: true,
        message: `Would reindex ${stalledFiles.length} files`,
        stalled_files: stalledFiles
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process each stalled file
    const results: ReindexResult[] = [];

    for (const file of stalledFiles) {
      try {
        console.log(`Reindexing file: ${file.file_name} (${file.id})`);

        // Update status to 'indexing'
        await supabase
          .from('file_uploads')
          .update({ status: 'indexing' })
          .eq('id', file.id);

        // Get the full file record with ocr_text
        const { data: fullFile } = await supabase
          .from('file_uploads')
          .select('ocr_text, display_name, source_type')
          .eq('id', file.id)
          .single();

        if (!fullFile?.ocr_text || fullFile.ocr_text.length < 50) {
          console.log(`File ${file.id} has insufficient OCR text, skipping`);
          
          await supabase
            .from('file_uploads')
            .update({ status: 'ocr_failed' })
            .eq('id', file.id);

          results.push({
            file_id: file.id,
            file_name: file.file_name,
            status: 'skipped',
            message: 'Insufficient OCR text'
          });
          continue;
        }

        // Call generate-embeddings function
        const { data: embResult, error: embError } = await supabase.functions.invoke('generate-embeddings', {
          body: {
            file_upload_id: file.id,
            course_id: file.course_id,
            source_type: fullFile.source_type || 'other',
            metadata: {
              file_name: file.file_name,
              display_name: fullFile.display_name || file.file_name,
              reindexed: true,
              reindexed_at: new Date().toISOString()
            }
          },
          headers: {
            Authorization: authHeader
          }
        });

        if (embError) {
          console.error(`Embedding failed for ${file.id}:`, embError);
          
          await supabase
            .from('file_uploads')
            .update({ status: 'embedding_failed' })
            .eq('id', file.id);

          results.push({
            file_id: file.id,
            file_name: file.file_name,
            status: 'failed',
            message: embError.message || 'Embedding generation failed'
          });
        } else {
          console.log(`Successfully reindexed ${file.id}`);
          
          await supabase
            .from('file_uploads')
            .update({ status: 'indexed' })
            .eq('id', file.id);

          results.push({
            file_id: file.id,
            file_name: file.file_name,
            status: 'success',
            message: `Generated ${embResult?.chunks_created || 0} embeddings`
          });
        }

      } catch (fileError) {
        console.error(`Error processing file ${file.id}:`, fileError);
        
        await supabase
          .from('file_uploads')
          .update({ status: 'embedding_failed' })
          .eq('id', file.id);

        results.push({
          file_id: file.id,
          file_name: file.file_name,
          status: 'failed',
          message: fileError instanceof Error ? fileError.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;

    console.log(`Reindex complete: ${successCount} success, ${failedCount} failed, ${skippedCount} skipped`);

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${stalledFiles.length} files: ${successCount} success, ${failedCount} failed, ${skippedCount} skipped`,
      processed: stalledFiles.length,
      success_count: successCount,
      failed_count: failedCount,
      skipped_count: skippedCount,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Reindex error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
