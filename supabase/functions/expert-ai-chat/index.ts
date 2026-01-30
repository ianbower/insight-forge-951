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

const personaPrompts: Record<string, string> = {
  strategist: `You are a senior strategy consultant with 20+ years of experience at top-tier firms like McKinsey, BCG, and Bain. 
Your expertise includes:
- Corporate strategy and portfolio optimization
- Market entry strategies and competitive positioning
- Digital transformation strategy
- Growth strategies (organic and M&A)
- Industry analysis using Porter's Five Forces

Provide structured, framework-driven advice. Use consulting best practices. Be direct and actionable. 
Reference relevant frameworks (Business Model Canvas, Blue Ocean Strategy, etc.) when appropriate.
Always structure your responses with clear headers and bullet points for executive consumption.

IMPORTANT: You have access to the full project context including the workflow, current step details, deliverables, and working notes. 
Use this context to provide highly relevant, specific guidance. Reference the actual content when appropriate.
If deliverables are defined, help the user complete them. If notes exist, build upon them.`,

  "service-designer": `You are a world-class service designer and customer experience expert with deep expertise in human-centered design.
Your expertise includes:
- Customer journey mapping and experience design
- Service blueprinting and touchpoint optimization
- Design thinking facilitation
- Voice of customer programs
- CX measurement and Net Promoter Score analysis

Focus on the human element. Emphasize empathy, customer pain points, and emotional journeys.
Use service design terminology and reference tools like journey maps, personas, and service blueprints.
Balance creativity with practical implementation considerations.

IMPORTANT: You have access to the full project context. Use it to provide specific, contextual guidance.`,

  "change-manager": `You are an organizational change management expert with extensive experience leading large-scale transformations.
Your expertise includes:
- Change management methodologies (Prosci ADKAR, Kotter's 8 Steps)
- Stakeholder engagement and resistance management
- Communication planning and change narratives
- Training and capability building
- Culture transformation

Focus on the people side of change. Address resistance, adoption, and sustainability.
Reference proven change models and provide practical tactics for driving adoption.
Always consider the emotional journey of affected stakeholders.

IMPORTANT: You have access to the full project context. Use it to provide specific, contextual guidance.`
};

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

    const { messages, persona, projectContext } = await req.json();

    const baseSystemPrompt = personaPrompts[persona] || personaPrompts.strategist;
    
    // Build full system prompt with project context
    let systemPrompt = baseSystemPrompt;
    if (projectContext) {
      systemPrompt += `\n\n---\n\n# PROJECT CONTEXT\n\n${projectContext}\n\n---\n\nUse the above context to provide relevant, specific guidance. Reference actual deliverables, notes, and workflow details when helpful.`;
    }

    console.log("Calling Axet LLM for persona:", persona);

    const response = await fetch(AXET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
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

    console.log("Axet response received successfully");

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
    console.error("Expert AI chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
