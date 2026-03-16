import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    const { topic, industry, assessment_instance_id, title } = await req.json();
    if (!topic) throw new Error("Topic is required");

    // Step 1: If assessment linked, fetch dimension scores
    let assessmentCapabilities: any[] = [];
    let assessmentTemplateName = "";
    let assessmentTemplateId: string | null = null;

    if (assessment_instance_id) {
      // Get the instance and its template
      const { data: instance } = await supabase
        .from("assessment_instances")
        .select("assessment_template_id, name, assessment_templates(name)")
        .eq("id", assessment_instance_id)
        .single();

      if (instance) {
        assessmentTemplateId = instance.assessment_template_id;
        assessmentTemplateName = (instance as any).assessment_templates?.name || instance.name;

        // Get dimensions
        const { data: dimensions } = await supabase
          .from("assessment_dimensions")
          .select("id, name, description, weight")
          .eq("assessment_template_id", instance.assessment_template_id)
          .order("order_index");

        // Get responses for this instance
        const { data: responses } = await supabase
          .from("assessment_responses")
          .select("question_id, response_value, assessment_questions(dimension_id)")
          .eq("assessment_instance_id", assessment_instance_id);

        if (dimensions && responses) {
          // Compute average score per dimension
          const dimScores: Record<string, { total: number; count: number }> = {};
          for (const r of responses) {
            const dimId = (r as any).assessment_questions?.dimension_id;
            if (!dimId) continue;
            const val = typeof r.response_value === "object" && r.response_value !== null
              ? (r.response_value as any).score ?? (r.response_value as any).value ?? 0
              : Number(r.response_value) || 0;
            if (!dimScores[dimId]) dimScores[dimId] = { total: 0, count: 0 };
            dimScores[dimId].total += val;
            dimScores[dimId].count += 1;
          }

          assessmentCapabilities = dimensions.map((dim, i) => {
            const s = dimScores[dim.id];
            const score = s ? Math.round((s.total / s.count) * 10) / 10 : null;
            return {
              name: dim.name,
              score,
              dimension_id: dim.id,
              source_type: score !== null ? "proprietary" : null,
              source_detail: score !== null ? `Assessment: ${assessmentTemplateName}` : null,
              summary: dim.description || "",
              order_index: i,
            };
          });
        }
      }
    }

    // Step 2: Call AI to fill gaps and generate recommendations
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const existingData = assessmentCapabilities.length > 0
      ? `\nExisting assessment data (proprietary):\n${assessmentCapabilities.map(c => `- ${c.name}: score ${c.score ?? "MISSING"}`).join("\n")}`
      : "";

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
        "X-No-Train": "true",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert management consultant specializing in maturity assessments. Generate comprehensive maturity dashboard data based on the topic and industry provided. Use real-world knowledge and public research to create realistic, actionable insights.`,
          },
          {
            role: "user",
            content: `Generate a maturity dashboard for:
Topic: ${topic}
Industry: ${industry || "General"}
${existingData}

Provide 5-8 capability dimensions with scores (1-5 scale), target scores, owners, and summaries.
For any capabilities that already have proprietary scores, keep those scores and enhance the summary.
For capabilities without data, generate realistic scores based on public research and industry benchmarks.
Also provide 3-5 recommended next moves and 3 snapshot KPI metrics.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_dashboard",
              description: "Generate structured maturity dashboard data",
              parameters: {
                type: "object",
                properties: {
                  subtitle: { type: "string", description: "Dashboard subtitle/description" },
                  capabilities: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        score: { type: "number", description: "Score 1-5" },
                        target_score: { type: "number", description: "Target score 1-5" },
                        owner: { type: "string", description: "Responsible party/team" },
                        summary: { type: "string", description: "Brief assessment summary" },
                        source_detail: { type: "string", description: "Source citation if from research" },
                      },
                      required: ["name", "score", "owner", "summary"],
                      additionalProperties: false,
                    },
                  },
                  recommended_moves: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 recommended next actions",
                  },
                  snapshot_metrics: {
                    type: "object",
                    properties: {
                      priority_domain: { type: "string" },
                      strongest_signal: { type: "string" },
                    },
                    required: ["priority_domain", "strongest_signal"],
                    additionalProperties: false,
                  },
                },
                required: ["subtitle", "capabilities", "recommended_moves", "snapshot_metrics"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_dashboard" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured data");

    const generated = JSON.parse(toolCall.function.arguments);

    // Step 3: Merge AI data with assessment data
    const mergedCapabilities = generated.capabilities.map((aiCap: any, i: number) => {
      const existing = assessmentCapabilities.find(
        (ac) => ac.name.toLowerCase() === aiCap.name.toLowerCase()
      );
      if (existing && existing.score !== null) {
        return {
          name: existing.name,
          score: existing.score,
          target_score: aiCap.target_score || existing.score + 0.5,
          source_type: "blended",
          source_detail: existing.source_detail,
          owner: aiCap.owner || "TBD",
          summary: aiCap.summary || existing.summary,
          dimension_id: existing.dimension_id,
          order_index: i,
        };
      }
      return {
        name: aiCap.name,
        score: aiCap.score,
        target_score: aiCap.target_score || null,
        source_type: assessment_instance_id ? "ai_research" : "ai_research",
        source_detail: aiCap.source_detail || "AI-powered desktop research",
        owner: aiCap.owner || "TBD",
        summary: aiCap.summary,
        dimension_id: null,
        order_index: i,
      };
    });

    // Also add any assessment capabilities that AI didn't cover
    for (const ac of assessmentCapabilities) {
      if (ac.score !== null && !mergedCapabilities.find((m: any) => m.dimension_id === ac.dimension_id)) {
        mergedCapabilities.push({
          ...ac,
          source_type: "proprietary",
          target_score: ac.score + 0.5,
          owner: "Assessment respondent",
        });
      }
    }

    const result = {
      title: title || `${topic} Maturity Dashboard`,
      subtitle: generated.subtitle,
      topic,
      industry: industry || "General",
      assessment_instance_id: assessment_instance_id || null,
      assessment_template_id: assessmentTemplateId,
      hero_style: "navy",
      recommended_moves: generated.recommended_moves,
      snapshot_metrics: generated.snapshot_metrics,
      capabilities: mergedCapabilities,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
