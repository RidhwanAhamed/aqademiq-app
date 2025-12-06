/**
 * Search Documents Edge Function
 * Purpose: Semantic search over user documents using pgvector
 * Returns relevant document chunks for RAG context
 */
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Generate embedding for search query
 */
async function generateQueryEmbedding(query: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: query.slice(0, 8000),
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
      query, 
      course_id = null, 
      match_threshold = 0.7, 
      match_count = 5,
      source_types = null // optional filter: ['syllabus', 'notes', 'upload']
    } = await req.json();
    
    if (!query || query.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Searching documents for user ${user.id}: "${query.substring(0, 50)}..."`);
    
    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(query, openaiApiKey);
    
    // Format embedding for pgvector
    const embeddingString = `[${queryEmbedding.join(',')}]`;
    
    // Call the search_documents function
    const { data: searchResults, error: searchError } = await supabase
      .rpc('search_documents', {
        p_user_id: user.id,
        p_query_embedding: embeddingString,
        p_match_threshold: match_threshold,
        p_match_count: match_count,
        p_course_id: course_id,
      });
    
    if (searchError) {
      console.error('Search error:', searchError);
      throw new Error(`Search failed: ${searchError.message}`);
    }
    
    // Filter by source types if specified
    let filteredResults = searchResults || [];
    if (source_types && Array.isArray(source_types) && source_types.length > 0) {
      filteredResults = filteredResults.filter(
        (r: any) => source_types.includes(r.source_type)
      );
    }
    
    console.log(`Found ${filteredResults.length} matching documents`);
    
    // Enrich results with file names if available
    const enrichedResults = await Promise.all(
      filteredResults.map(async (result: any) => {
        let fileName = result.metadata?.file_name || null;
        let courseName = null;
        
        // Get file name if not in metadata
        if (result.file_upload_id && !fileName) {
          const { data: fileData } = await supabase
            .from('file_uploads')
            .select('file_name')
            .eq('id', result.file_upload_id)
            .single();
          
          if (fileData) {
            fileName = fileData.file_name;
          }
        }
        
        // Get course name if course_id exists
        if (result.course_id) {
          const { data: courseData } = await supabase
            .from('courses')
            .select('name')
            .eq('id', result.course_id)
            .single();
          
          if (courseData) {
            courseName = courseData.name;
          }
        }
        
        return {
          id: result.id,
          content: result.content,
          similarity: result.similarity,
          source_type: result.source_type,
          file_name: fileName,
          course_name: courseName,
          course_id: result.course_id,
          file_upload_id: result.file_upload_id,
          metadata: result.metadata,
        };
      })
    );
    
    return new Response(JSON.stringify({
      results: enrichedResults,
      query,
      total_results: enrichedResults.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in search-documents:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
