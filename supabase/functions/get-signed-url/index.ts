/**
 * Secure Signed URL Generation Edge Function
 * 
 * Generates time-limited signed URLs for authenticated file access.
 * This provides enterprise-grade security by:
 * 1. Authenticating the user via JWT
 * 2. Verifying file ownership (user owns the file)
 * 3. Generating a signed URL valid for 1 hour
 * 4. Logging access for audit trail
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { fileId, storagePath } = await req.json();

    if (!fileId && !storagePath) {
      return new Response(
        JSON.stringify({ error: 'Either fileId or storagePath is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let targetPath = storagePath;
    let fileRecord = null;

    // If fileId provided, look up the file and verify ownership
    if (fileId) {
      const { data: file, error: fileError } = await supabaseAdmin
        .from('file_uploads')
        .select('*')
        .eq('id', fileId)
        .single();

      if (fileError || !file) {
        console.error('File lookup error:', fileError);
        return new Response(
          JSON.stringify({ error: 'File not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify user owns this file
      if (file.user_id !== user.id) {
        console.warn(`Unauthorized access attempt: User ${user.id} tried to access file owned by ${file.user_id}`);
        
        // Log security event
        await supabaseAdmin.rpc('log_security_event', {
          p_action: 'unauthorized_file_access_attempt',
          p_resource_type: 'file_upload',
          p_resource_id: fileId,
          p_details: {
            requesting_user: user.id,
            file_owner: file.user_id,
            timestamp: new Date().toISOString()
          }
        }).catch(err => console.error('Failed to log security event:', err));

        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      fileRecord = file;

      // Extract storage path from file_url
      // URL format: https://xxx.supabase.co/storage/v1/object/public/study-files/user_id/course_id/filename
      if (file.file_url) {
        const urlParts = file.file_url.split('/storage/v1/object/public/study-files/');
        if (urlParts.length > 1) {
          targetPath = urlParts[1];
        } else {
          // Try signed URL format
          const signedParts = file.file_url.split('/storage/v1/object/sign/study-files/');
          if (signedParts.length > 1) {
            targetPath = signedParts[1].split('?')[0];
          }
        }
      }
    }

    if (!targetPath) {
      return new Response(
        JSON.stringify({ error: 'Could not determine storage path' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the path belongs to this user (path should start with user_id/)
    if (!targetPath.startsWith(`${user.id}/`)) {
      console.warn(`Path ownership mismatch: User ${user.id} requested path ${targetPath}`);
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating signed URL for path: ${targetPath}, user: ${user.id}`);

    // Generate signed URL valid for 1 hour (3600 seconds)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin
      .storage
      .from('study-files')
      .createSignedUrl(targetPath, 3600);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('Signed URL generation error:', signedUrlError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate signed URL', details: signedUrlError?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log successful access
    console.log(`Signed URL generated successfully for user ${user.id}, file: ${fileId || targetPath}`);

    return new Response(
      JSON.stringify({
        signedUrl: signedUrlData.signedUrl,
        expiresIn: 3600,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        fileId: fileId || null,
        fileName: fileRecord?.display_name || fileRecord?.file_name || null
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in get-signed-url:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
