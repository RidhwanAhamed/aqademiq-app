import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type DepthLevel = 'brief' | 'standard' | 'comprehensive';

const getPageRange = (depth: DepthLevel): { min: number; max: number } => {
  switch (depth) {
    case 'brief': return { min: 1, max: 2 };
    case 'standard': return { min: 2, max: 4 };
    case 'comprehensive': return { min: 4, max: 10 };
  }
};

const createSystemPrompt = (depth: DepthLevel, pageRange: { min: number; max: number }) => `
You are an expert educator and note-taking specialist with deep expertise in the Cornell Notes method.

## CORNELL NOTES STRUCTURE
Each page: Keywords/Questions Column (Left) + Notes Column (Right)
Complete document: Title, Pages with keywords/notes, Summary

## GENERATION PARAMETERS
**DEPTH LEVEL**: ${depth.toUpperCase()}
**PAGE RANGE**: ${pageRange.min} to ${pageRange.max} pages

## OUTPUT FORMAT (STRICT JSON)
Respond ONLY with valid JSON:
{
  "title": "Descriptive Topic Title",
  "totalPages": <number>,
  "pages": [
    {
      "pageNumber": 1,
      "keywords": ["keyword1", "question1", ...],
      "notes": ["Detailed note 1", "Detailed note 2", ...]
    }
  ],
  "summary": "A comprehensive summary paragraph covering all main ideas."
}

## CONTENT GUIDELINES
Per Page: 5-8 keywords/questions, 6-12 detailed notes
Summary: Brief=3-5 sentences, Standard=4-7, Comprehensive=6-10

Do NOT include any text outside the JSON object.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header for token tracking
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data } = await supabase.auth.getUser(token);
        if (data?.user) {
          userId = data.user.id;
        }
      } catch (e) {
        console.log('Auth header present but user could not be resolved.');
      }
    }

    // Token-based rate limiting (10,000 tokens per day per user)
    if (userId) {
      try {
        const { data: usageData, error: usageError } = await supabase.rpc('get_daily_token_usage', {
          p_user_id: userId
        });

        if (!usageError && usageData?.[0]?.is_limit_exceeded) {
          const usage = usageData[0];
          console.log(`Token limit exceeded for user ${userId}: ${usage.total_tokens_today}/10000 tokens used`);
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Daily token limit reached (10,000 tokens/day). Try again tomorrow.',
            usage: {
              used: Number(usage.total_tokens_today),
              limit: 10000,
              remaining: 0,
              resets_at: usage.resets_at
            }
          }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (tokenCheckError) {
        console.log('Token limit check failed (non-blocking):', tokenCheckError);
      }
    }

    const { topic, fileContent, fileName, filePrompt, depthLevel = 'standard' } = await req.json();
    const content = fileContent || topic;
    const sourceType = fileContent ? 'file' : 'topic';

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Topic or file content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating Cornell Notes - Source: ${sourceType}, Depth: ${depthLevel}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const pageRange = getPageRange(depthLevel as DepthLevel);
    const systemPrompt = createSystemPrompt(depthLevel as DepthLevel, pageRange);

    let userPrompt: string;
    if (sourceType === 'file') {
      const basePrompt = `Generate comprehensive Cornell Notes for the following document.`;
      const instructions = filePrompt ? `\n\nUser's instructions: ${filePrompt}` : '';
      userPrompt = `${basePrompt}${instructions}\n\nDocument content:\n${content}`;
    } else {
      userPrompt = `Generate comprehensive Cornell Notes for: ${content}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "Usage limit reached." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content;
    const tokenUsage = data.usage || {};
    if (!aiContent) throw new Error("No response from AI service");

    console.log('Token usage:', tokenUsage);

    // Record token usage to database
    if (userId && tokenUsage.total_tokens) {
      try {
        await supabase.from('ai_token_usage').insert({
          user_id: userId,
          prompt_tokens: tokenUsage.prompt_tokens || 0,
          completion_tokens: tokenUsage.completion_tokens || 0,
          total_tokens: tokenUsage.total_tokens || 0,
          function_name: 'generate-notes-orchestrator',
          request_metadata: { 
            topic: topic?.substring(0, 100),
            depth_level: depthLevel,
            source_type: sourceType
          }
        });
        console.log(`Recorded ${tokenUsage.total_tokens} tokens for user ${userId}`);
      } catch (tokenRecordError) {
        console.error('Failed to record token usage (non-blocking):', tokenRecordError);
      }
    }

    let parsedNotes;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      parsedNotes = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error("Failed to parse AI response");
    }

    if (!parsedNotes.title || !Array.isArray(parsedNotes.pages) || !parsedNotes.summary) {
      throw new Error("AI response missing required fields");
    }

    const cornellDocument = {
      title: parsedNotes.title,
      date: new Date().toISOString().split("T")[0],
      topic: topic || fileName || parsedNotes.title,
      totalPages: parsedNotes.pages.length,
      pages: parsedNotes.pages.map((page: any, index: number) => ({
        pageNumber: index + 1,
        keywords: page.keywords,
        notes: page.notes,
      })),
      summary: parsedNotes.summary,
      sourceType,
      sourceFileName: fileName,
    };

    console.log(`Generated ${cornellDocument.totalPages} pages: ${cornellDocument.title}`);

    // Fetch updated token usage to return to client
    let currentUsage = null;
    if (userId) {
      try {
        const { data: usageData } = await supabase.rpc('get_daily_token_usage', {
          p_user_id: userId
        });
        if (usageData?.[0]) {
          currentUsage = {
            used: Number(usageData[0].total_tokens_today),
            limit: 10000,
            remaining: Number(usageData[0].remaining_tokens),
            resets_at: usageData[0].resets_at
          };
        }
      } catch (usageError) {
        console.log('Failed to fetch updated usage:', usageError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: cornellDocument,
        usage: currentUsage,
        tokens_used: tokenUsage.total_tokens || 0
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "An error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
