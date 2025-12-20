import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    if (!aiContent) throw new Error("No response from AI service");

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

    return new Response(
      JSON.stringify({ success: true, data: cornellDocument }),
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
