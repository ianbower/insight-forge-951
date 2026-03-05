import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { items } = await req.json();
    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "Items array is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const itemsList = items.map((i: any, idx: number) => 
      `${idx + 1}. ID: "${i.id}" | Title: "${i.title}" | Description: "${i.description || 'N/A'}" | Category: "${i.category || 'N/A'}"`
    ).join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a management consulting expert specializing in prioritisation frameworks. Given a list of use cases / initiatives, evaluate each one and recommend its position on a 2x2 prioritisation matrix where:
- X-axis = Implementation Effort (0 = high effort on the left, 100 = low effort on the right)
- Y-axis = Business Impact/Value (0 = low impact at bottom, 100 = high impact at top)

Also assign a priorityScore from 1-5 (5 = highest priority).

Quadrants:
- Top-right (effort >= 50, impact >= 50): "1. Tactical – Quick Wins"
- Top-left (effort < 50, impact >= 50): "2. Strategic Roadmap"
- Bottom-right (effort >= 50, impact < 50): "3. Opportunistic"
- Bottom-left (effort < 50, impact < 50): "4. Deprioritise"

Spread items realistically across the matrix. Don't cluster everything in one quadrant.`,
          },
          {
            role: "user",
            content: `Evaluate and position these items on the prioritisation matrix:\n\n${itemsList}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "recommend_positions",
              description: "Return recommended effort/impact positions and priority scores for each item.",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "The item ID" },
                        effort: { type: "number", description: "X position 0-100 (0=high effort, 100=low effort)" },
                        impact: { type: "number", description: "Y position 0-100 (0=low impact, 100=high impact)" },
                        priorityScore: { type: "number", description: "Priority score 1-5" },
                        rationale: { type: "string", description: "Brief rationale for this positioning" },
                      },
                      required: ["id", "effort", "impact", "priorityScore"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["recommendations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "recommend_positions" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Prioritisation AI error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
