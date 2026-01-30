import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Axet LLM endpoint - NTT Data's custom LLM
const AXET_URL = "https://axet.nttdata.com/flows/cloud/hackthon-be/v1/chat/completions";

async function validateAuth(req: Request): Promise<{ userId: string } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return null;
  }

  return { userId: data.user.id };
}

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
    // Validate authentication
    const auth = await validateAuth(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages, stepContext } = await req.json();

    // Build context-aware system prompt
    let contextualPrompt = systemPrompt;
    if (stepContext) {
      contextualPrompt += `\n\nCurrent context:
- Step Title: ${stepContext.stepTitle || 'Not specified'}
- Runbook Name: ${stepContext.runbookName || 'Not specified'}
- Industry: ${stepContext.industry || 'Cross-Industry'}
- Assigned Tools: ${stepContext.tools?.join(', ') || 'None'}`;
    }

    console.log("Calling Axet LLM for layout wizard...");

    const response = await fetch(AXET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: contextualPrompt },
          ...messages,
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Axet error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    console.log("Axet layout wizard response received successfully");

    // Convert to SSE format for streaming compatibility with frontend
    const sseData = `data: ${JSON.stringify({
      id: data.id || "axet-response",
      object: "chat.completion.chunk",
      created: data.created || Date.now(),
      model: data.model || "axet",
      choices: [{
        index: 0,
        delta: { role: "assistant", content },
        finish_reason: "stop"
      }]
    })}\n\ndata: [DONE]\n\n`;

    return new Response(sseData, {
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
