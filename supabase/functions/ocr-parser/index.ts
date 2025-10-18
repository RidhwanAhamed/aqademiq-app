import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = await import('https://esm.sh/@supabase/supabase-js@2').then(m => 
      m.createClient(supabaseUrl, supabaseServiceKey)
    );

    const payload = await req.json();
    const { file_id, file_data, file_type: clientFileType } = payload;

    let fileBuffer: Uint8Array | null = null;
    let fileType = clientFileType || 'application/pdf';
    let fileName = 'upload.jpg';

    // Prefer storage fetch by file_id
    if (file_id) {
      console.log(`Fetching file from storage: ${file_id}`);
      const { data: fileRow, error: fileRowErr } = await supabase
        .from('file_uploads')
        .select('file_url, file_type')
        .eq('id', file_id)
        .maybeSingle();
      
      if (fileRowErr || !fileRow?.file_url) {
        throw new Error('File not found or missing storage path');
      }
      
      fileType = fileRow.file_type || fileType;
      
      const { data: storageFile, error: dlErr } = await supabase
        .storage
        .from('study-files')
        .download(fileRow.file_url);
      
      if (dlErr || !storageFile) {
        throw new Error('Could not download file from storage');
      }
      
      fileBuffer = new Uint8Array(await storageFile.arrayBuffer());
    } else if (file_data) {
      // Legacy: base64 path
      console.log('Using legacy base64 file data');
      const binaryString = atob(file_data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      fileBuffer = bytes;
    } else {
      return new Response(
        JSON.stringify({ error: 'No file provided (need file_id or file_data)' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    fileName = fileType.includes('pdf') ? 'upload.pdf' : 'upload.jpg';
    console.log('Processing file:', { file_type: fileType, fileName, file_id });

    // Use OCR Space API for text extraction
    const ocrApiKey = Deno.env.get('OCR_SPACE_API_KEY');
    if (!ocrApiKey) {
      throw new Error('OCR API key not configured');
    }

    // Create blob for OCR Space API
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: fileType });
    formData.append('file', blob, fileName);
    formData.append('apikey', ocrApiKey);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2');

    console.log('Calling OCR Space API...');

    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
    });

    if (!ocrResponse.ok) {
      throw new Error(`OCR API error: ${ocrResponse.statusText}`);
    }

    const ocrResult = await ocrResponse.json();
    console.log('OCR Result:', ocrResult);

    if (!ocrResult.ParsedResults || ocrResult.ParsedResults.length === 0) {
      throw new Error('No text could be extracted from the file');
    }

    const extractedText = ocrResult.ParsedResults[0].ParsedText;

    console.log('Extracted text:', extractedText.substring(0, 200) + '...');

    return new Response(
      JSON.stringify({ 
        success: true,
        text: extractedText,
        confidence: ocrResult.ParsedResults[0].TextOverlay?.Lines?.length || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in OCR parser:', error);
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