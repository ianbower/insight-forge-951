import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { messages, persona, projectContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const baseSystemPrompt = personaPrompts[persona] || personaPrompts.strategist;
    
    // Build full system prompt with project context
    let systemPrompt = baseSystemPrompt;
    if (projectContext) {
      systemPrompt += `\n\n---\n\n# PROJECT CONTEXT\n\n${projectContext}\n\n---\n\nUse the above context to provide relevant, specific guidance. Reference actual deliverables, notes, and workflow details when helpful.`;
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
    console.error("Expert AI chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
