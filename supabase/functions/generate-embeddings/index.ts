/**
 * Generate Embeddings Edge Function
 * Purpose: Generate vector embeddings for documents and store them in pgvector
 * Supports chunking, course association, and multiple source types
 */
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Chunk configuration for optimal embedding performance
const CHUNK_SIZE = 1000; // characters per chunk
const CHUNK_OVERLAP = 200; // overlap between chunks for context preservation
const MAX_CHUNKS = 100; // limit to prevent excessive API calls

/**
 * Split text into overlapping chunks for embedding
 */
function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  
  if (!text || text.trim().length === 0) {
    return chunks;
  }
  
  // Clean the text
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  if (cleanText.length <= chunkSize) {
    return [cleanText];
  }
  
  let startIndex = 0;
  while (startIndex < cleanText.length && chunks.length < MAX_CHUNKS) {
    let endIndex = Math.min(startIndex + chunkSize, cleanText.length);
    
    // Try to break at sentence boundary
    if (endIndex < cleanText.length) {
      const lastPeriod = cleanText.lastIndexOf('.', endIndex);
      const lastNewline = cleanText.lastIndexOf('\n', endIndex);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      
      if (breakPoint > startIndex + chunkSize / 2) {
        endIndex = breakPoint + 1;
      }
    }
    
    const chunk = cleanText.slice(startIndex, endIndex).trim();
    if (chunk.length > 50) { // Only add meaningful chunks
      chunks.push(chunk);
    }
    
    startIndex = endIndex - overlap;
  }
  
  console.log(`Created ${chunks.length} chunks from ${cleanText.length} characters`);
  return chunks;
}

/**
 * Generate embedding using OpenAI API
 */
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000), // API limit
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('OpenAI embedding error:', response.status, error);
    throw new Error(`Embedding API error: ${response.status}`);
  }
  
  const result = await response.json();
  return result.data[0].embedding;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    
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
      file_upload_id, 
      course_id, 
      content, 
      source_type = 'upload',
      metadata = {} 
    } = await req.json();
    
    let textContent = content;
    
    // If file_upload_id provided, fetch OCR text from database
    if (file_upload_id && !content) {
      const { data: fileData, error: fileError } = await supabase
        .from('file_uploads')
        .select('ocr_text, file_name')
        .eq('id', file_upload_id)
        .eq('user_id', user.id)
        .single();
      
      if (fileError || !fileData) {
        return new Response(JSON.stringify({ error: 'File not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      textContent = fileData.ocr_text;
      metadata.file_name = fileData.file_name;
    }
    
    if (!textContent || textContent.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'No content to embed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Generating embeddings for user ${user.id}, content length: ${textContent.length}`);
    
    // Chunk the content
    const chunks = chunkText(textContent);
    
    if (chunks.length === 0) {
      return new Response(JSON.stringify({ error: 'Content too short to embed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Processing ${chunks.length} chunks`);
    
    // Delete existing embeddings for this file if re-processing
    if (file_upload_id) {
      const { error: deleteError } = await supabase
        .from('document_embeddings')
        .delete()
        .eq('file_upload_id', file_upload_id)
        .eq('user_id', user.id);
      
      if (deleteError) {
        console.error('Error deleting old embeddings:', deleteError);
      }
    }
    
    // Generate embeddings for each chunk
    const embeddings: Array<{
      user_id: string;
      file_upload_id: string | null;
      course_id: string | null;
      chunk_index: number;
      content: string;
      embedding: number[];
      metadata: Record<string, any>;
      source_type: string;
    }> = [];
    
    for (let i = 0; i < chunks.length; i++) {
      try {
        const embedding = await generateEmbedding(chunks[i], openaiApiKey);
        
        embeddings.push({
          user_id: user.id,
          file_upload_id: file_upload_id || null,
          course_id: course_id || null,
          chunk_index: i,
          content: chunks[i],
          embedding,
          metadata: {
            ...metadata,
            chunk_index: i,
            total_chunks: chunks.length,
            chunk_length: chunks[i].length,
          },
          source_type,
        });
        
        // Small delay to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } catch (embeddingError) {
        console.error(`Error embedding chunk ${i}:`, embeddingError);
        // Continue with other chunks
      }
    }
    
    if (embeddings.length === 0) {
      return new Response(JSON.stringify({ error: 'Failed to generate any embeddings' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Format embeddings for pgvector - convert array to string representation
    const formattedEmbeddings = embeddings.map(e => ({
      ...e,
      embedding: `[${e.embedding.join(',')}]`,
    }));
    
    // Insert embeddings into database
    const { data: insertedData, error: insertError } = await supabase
      .from('document_embeddings')
      .insert(formattedEmbeddings)
      .select('id');
    
    if (insertError) {
      console.error('Error inserting embeddings:', insertError);
      throw new Error(`Database error: ${insertError.message}`);
    }
    
    console.log(`Successfully stored ${insertedData?.length || 0} embeddings`);
    
    // Update file_uploads status if applicable
    if (file_upload_id) {
      await supabase
        .from('file_uploads')
        .update({ 
          status: 'indexed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', file_upload_id)
        .eq('user_id', user.id);
    }
    
    return new Response(JSON.stringify({
      success: true,
      chunks_processed: chunks.length,
      embeddings_stored: insertedData?.length || 0,
      file_upload_id,
      course_id,
      source_type,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in generate-embeddings:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
