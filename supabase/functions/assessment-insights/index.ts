import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DimensionScore {
  dimension: string;
  score: number;
  maxScore: number;
  benchmark?: number;
  target?: number;
}

interface GapData {
  dimension: string;
  currentScore: number;
  targetScore: number;
  priority: string;
}

interface InsightsRequest {
  templateName: string;
  instanceName: string;
  dimensionScores: DimensionScore[];
  gapData: GapData[];
  responseCount: number;
  overallScore: number;
  industry?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      templateName, 
      instanceName, 
      dimensionScores, 
      gapData, 
      responseCount, 
      overallScore,
      industry 
    }: InsightsRequest = await req.json();

    console.log("Generating insights for:", instanceName);
    console.log("Dimension scores:", JSON.stringify(dimensionScores));
    console.log("Overall score:", overallScore);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context for AI
    const dimensionSummary = dimensionScores
      .map(d => `${d.dimension}: ${d.score.toFixed(1)}/${d.maxScore} (${((d.score / d.maxScore) * 100).toFixed(0)}%)`)
      .join("\n");

    const gapSummary = gapData
      .filter(g => g.priority === "high")
      .map(g => `${g.dimension}: Gap of ${(g.targetScore - g.currentScore).toFixed(1)} points (Priority: ${g.priority})`)
      .join("\n");

    const lowestDimensions = [...dimensionScores]
      .sort((a, b) => (a.score / a.maxScore) - (b.score / b.maxScore))
      .slice(0, 3)
      .map(d => d.dimension);

    const highestDimensions = [...dimensionScores]
      .sort((a, b) => (b.score / b.maxScore) - (a.score / a.maxScore))
      .slice(0, 3)
      .map(d => d.dimension);

    const systemPrompt = `You are an expert management consultant providing insights on maturity assessment results. You analyze assessment data and provide actionable, strategic recommendations. Be concise but insightful. Focus on business impact and practical next steps.`;

    const userPrompt = `Analyze the following assessment results and provide strategic insights:

**Assessment:** ${templateName}
**Instance:** ${instanceName}
**Industry:** ${industry || "Not specified"}
**Response Count:** ${responseCount}
**Overall Maturity Score:** ${overallScore}%

**Dimension Scores:**
${dimensionSummary}

**Highest Performing Areas:** ${highestDimensions.join(", ")}
**Lowest Performing Areas:** ${lowestDimensions.join(", ")}

**High Priority Gaps:**
${gapSummary || "No high priority gaps identified"}

Please provide:
1. **Executive Summary** (2-3 sentences on overall maturity state)
2. **Key Strengths** (2-3 bullet points on what's working well)
3. **Critical Improvement Areas** (2-3 prioritized recommendations with specific actions)
4. **Quick Wins** (1-2 low-effort, high-impact improvements)
5. **Strategic Roadmap** (3-6 month recommended focus areas)

Keep the response structured and actionable for senior leadership.`;

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
          { role: "user", content: userPrompt },
        ],
        stream: false,
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
        return new Response(JSON.stringify({ error: "Payment required, please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const insights = data.choices?.[0]?.message?.content || "Unable to generate insights.";

    console.log("Successfully generated insights");

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating insights:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
