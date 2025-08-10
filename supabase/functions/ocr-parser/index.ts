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
    const { file_data, file_type, file_id } = await req.json();

    if (!file_data) {
      return new Response(
        JSON.stringify({ error: 'No file data provided' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Processing file:', { file_type, file_id });

    // Use OCR Space API for text extraction
    const ocrApiKey = Deno.env.get('OCR_SPACE_API_KEY');
    if (!ocrApiKey) {
      throw new Error('OCR API key not configured');
    }

    // Convert base64 to blob for OCR Space API
    const formData = new FormData();
    
    // Create blob from base64
    const binaryString = atob(file_data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const blob = new Blob([bytes], { type: file_type });
    formData.append('file', blob, 'upload.jpg');
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