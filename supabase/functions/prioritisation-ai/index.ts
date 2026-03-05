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

    const { detailLevel, itemCountRange, assessmentContext, existingItems } = await req.json();

    const minItems = itemCountRange?.min || 5;
    const maxItems = itemCountRange?.max || 10;

    // Build rich context from assessment data
    let assessmentPrompt = "";
    if (assessmentContext) {
      assessmentPrompt += "\n\n## ASSESSMENT CONTEXT\n";
      if (assessmentContext.projectName) {
        assessmentPrompt += `Project: ${assessmentContext.projectName}\n`;
      }
      if (assessmentContext.projectDescription) {
        assessmentPrompt += `Description: ${assessmentContext.projectDescription}\n`;
      }
      if (assessmentContext.industry) {
        assessmentPrompt += `Industry: ${assessmentContext.industry}\n`;
      }

      assessmentPrompt += "\n## DIMENSION SCORES (As-Is vs Target):\n";
      for (const dim of assessmentContext.dimensions || []) {
        const gap = dim.target - dim.score;
        assessmentPrompt += `\n### ${dim.name} — Score: ${dim.score.toFixed(2)}/5, Target: ${dim.target.toFixed(1)}/5, Gap: ${gap.toFixed(2)}\n`;
        if (dim.questionScores?.length > 0) {
          assessmentPrompt += "Question-level breakdown:\n";
          for (const q of dim.questionScores) {
            const qGap = q.target - q.score;
            assessmentPrompt += `  - "${q.question}" → Score: ${q.score.toFixed(2)}, Target: ${q.target.toFixed(1)}, Gap: ${qGap.toFixed(2)}\n`;
          }
        }
      }
    }

    let existingPrompt = "";
    if (existingItems?.length > 0) {
      existingPrompt = "\n\n## EXISTING ITEMS (for reference, you may refine or replace them):\n";
      existingPrompt += existingItems.map((i: any, idx: number) =>
        `${idx + 1}. "${i.title}" (Category: ${i.category || "N/A"}) — ${i.description || "No description"}`
      ).join("\n");
    }

    const systemPrompt = `You are a senior management consultant with deep expertise in organisational transformation, operating model design, and strategic prioritisation.

You are analysing a maturity assessment to produce a prioritisation matrix of SPECIFIC, ACTIONABLE initiatives. 

CRITICAL REQUIREMENTS for descriptions:
- DO NOT describe the gap or the score. The user already knows the scores.
- Instead, describe WHAT SPECIFICALLY needs to be done. Be prescriptive and concrete.
- Use consulting language: "Redesign the...", "Implement a...", "Establish a...", "Deploy...", "Create a..."
- Reference specific frameworks, methodologies, or approaches where relevant (e.g., "hub-and-spoke operating model", "RACI governance framework", "agile delivery squads")
- Each description should read like a brief from a consulting engagement — actionable, specific, and informed by the gap between as-is and to-be maturity scores.
- Descriptions should be 1-3 sentences long.

EXAMPLES of GOOD descriptions:
- "Redesign the organisational structure to a hub-and-spoke model with a central AI CoE and embedded capability leads in each business unit. Establish clear RACI governance and role expansion paths."
- "Implement a federated data governance framework with domain-specific data stewards, automated quality monitoring, and a centralised data catalogue to enable self-service analytics."
- "Deploy a continuous learning platform with AI-curated pathways, hands-on labs, and quarterly capability assessments to close the digital skills gap across mid-management."

EXAMPLES of BAD descriptions (DO NOT do this):
- "Organisation has a gap of 1.5 points requiring attention" ← This is useless
- "Currently at 2.5/5 with moderate maturity" ← This just restates the score
- "Significant gap identified in data management" ← Too vague

The detail level is "${detailLevel}". Generate between ${minItems} and ${maxItems} initiatives.
- Break down dimensions into sub-initiatives based on the question-level gaps.
- Higher detail = more granular, specific initiatives per dimension.
- Lower detail = consolidated strategic themes across dimensions.

Position each on a 2x2 matrix:
- X-axis = Implementation Effort (0 = high effort left, 100 = low effort right)
- Y-axis = Business Impact/Value (0 = low impact bottom, 100 = high impact top)

Quadrants:
- Top-right (effort >= 50, impact >= 50): "1. Tactical – Quick Wins"
- Top-left (effort < 50, impact >= 50): "2. Strategic Roadmap"  
- Bottom-right (effort >= 50, impact < 50): "3. Opportunistic"
- Bottom-left (effort < 50, impact < 50): "4. Deprioritise"

Spread items realistically. Don't cluster everything in one quadrant. Assign category from: Analyse, Design, Develop, Test, Deploy, Strength, Gap, Neutral.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Based on the following assessment data, generate ${minItems}-${maxItems} specific, actionable initiatives for the prioritisation matrix.${assessmentPrompt}${existingPrompt}\n\nGenerate the initiatives now.` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "recommend_positions",
              description: "Return recommended initiatives with effort/impact positions, descriptions, and priority scores.",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "Unique ID e.g. init-1" },
                        title: { type: "string", description: "Concise initiative title (3-8 words)" },
                        description: { type: "string", description: "Specific, actionable description of what needs to be done (1-3 sentences). DO NOT mention scores or gaps." },
                        effort: { type: "number", description: "X position 0-100 (0=high effort, 100=low effort)" },
                        impact: { type: "number", description: "Y position 0-100 (0=low impact, 100=high impact)" },
                        priorityScore: { type: "number", description: "Priority score 1-5 (5=highest)" },
                        category: { type: "string", description: "Category: Analyse, Design, Develop, Test, Deploy, Strength, Gap, or Neutral" },
                      },
                      required: ["id", "title", "description", "effort", "impact", "priorityScore", "category"],
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
