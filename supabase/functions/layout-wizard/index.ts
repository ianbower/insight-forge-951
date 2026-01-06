import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `You are an expert consulting engagement designer helping create step page layouts for consulting runbooks.

Your role is to help design engaging, interactive step pages that make consulting work more immersive and effective.

Available block types you can use:
- heading: Section headers (level 1, 2, or 3)
- text: Rich text content blocks
- image: Image placeholders with captions
- video: Video embeds with captions
- divider: Visual separators
- tool: Embedded consulting tools (SWOT, Business Model Canvas, etc.)
- checklist: Task checklists with checkable items
- form: Data collection forms with text/textarea/select fields
- poll: Voting/polling for stakeholder input
- ai-chat: AI assistant for that step's context
- deliverables: File upload and deliverable tracking
- notes: Collaborative notes section

When suggesting layouts, provide a JSON structure like this:
{
  "blocks": [
    { "id": "h1", "type": "heading", "order": 0, "content": "Title here", "level": 1 },
    { "id": "t1", "type": "text", "order": 1, "content": "Description text..." },
    { "id": "cl1", "type": "checklist", "order": 2, "title": "Key Tasks", "items": [] },
    { "id": "tool1", "type": "tool", "order": 3, "toolName": "SWOT Analysis", "embedded": true },
    { "id": "d1", "type": "deliverables", "order": 4 }
  ]
}

Consider the step's purpose, industry context, and what would make the work engaging.
Be creative but practical. Suggest layouts that will genuinely help consultants deliver better work.

When asked to refine a layout, make targeted changes based on the user's feedback.
Always respond with valid JSON when providing layout suggestions, wrapped in \`\`\`json code blocks.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, stepContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context-aware system prompt
    let contextualPrompt = systemPrompt;
    if (stepContext) {
      contextualPrompt += `\n\nCurrent context:
- Step Title: ${stepContext.stepTitle || 'Not specified'}
- Runbook Name: ${stepContext.runbookName || 'Not specified'}
- Industry: ${stepContext.industry || 'Cross-Industry'}
- Assigned Tools: ${stepContext.tools?.join(', ') || 'None'}`;
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
          { role: "system", content: contextualPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Layout wizard error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
