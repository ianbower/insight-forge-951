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

    const { instanceId, action } = await req.json();

    if (!instanceId) {
      return new Response(
        JSON.stringify({ error: "Instance ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch instance data
    const { data: instance, error: instanceError } = await supabase
      .from("assessment_instances")
      .select("*, assessment_template:assessment_templates(*)")
      .eq("id", instanceId)
      .single();

    if (instanceError || !instance) {
      return new Response(
        JSON.stringify({ error: "Assessment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const templateId = instance.assessment_template_id;

    // Fetch dimensions
    const { data: dimensions } = await supabase
      .from("assessment_dimensions")
      .select("*")
      .eq("assessment_template_id", templateId)
      .order("order_index");

    // Fetch questions
    const { data: questions } = await supabase
      .from("assessment_questions")
      .select("*")
      .eq("assessment_template_id", templateId)
      .order("order_index");

    // Fetch responses
    const { data: responses } = await supabase
      .from("assessment_responses")
      .select("*, recipient:assessment_recipients(name, organization, industry, role)")
      .eq("assessment_instance_id", instanceId);

    // Calculate dimension scores
    const dimensionScores: Record<string, { scores: number[]; avg: number }> = {};
    
    (dimensions || []).forEach((dim) => {
      dimensionScores[dim.name] = { scores: [], avg: 0 };
    });

    (responses || []).forEach((response) => {
      const question = questions?.find((q) => q.id === response.question_id);
      if (!question) return;

      const dimension = dimensions?.find((d) => d.id === question.dimension_id);
      if (!dimension) return;

      const value = typeof response.response_value === "number" 
        ? response.response_value 
        : Number(response.response_value);

      if (!isNaN(value)) {
        dimensionScores[dimension.name].scores.push(value);
      }
    });

    // Calculate averages
    Object.keys(dimensionScores).forEach((name) => {
      const scores = dimensionScores[name].scores;
      dimensionScores[name].avg = scores.length > 0 
        ? scores.reduce((a, b) => a + b, 0) / scores.length 
        : 0;
    });

    // Prepare data for AI analysis
    const assessmentSummary = {
      name: instance.name,
      templateName: instance.assessment_template?.name,
      category: instance.assessment_template?.category,
      responseCount: responses?.length || 0,
      dimensions: Object.entries(dimensionScores).map(([name, data]) => ({
        name,
        averageScore: data.avg.toFixed(2),
        responseCount: data.scores.length,
      })),
      overallScore: Object.values(dimensionScores).length > 0
        ? (Object.values(dimensionScores).reduce((sum, d) => sum + d.avg, 0) / Object.values(dimensionScores).length).toFixed(2)
        : "0",
    };

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "insights") {
      systemPrompt = `You are an expert management consultant analyzing assessment results. 
Provide actionable insights based on the assessment data. Focus on:
1. Key strengths (dimensions scoring above 3.5/5)
2. Critical gaps (dimensions scoring below 3/5)
3. Priority recommendations for improvement
4. Strategic implications

Be specific and actionable. Use bullet points for clarity.`;

      userPrompt = `Analyze this ${assessmentSummary.category} assessment titled "${assessmentSummary.name}":

Template: ${assessmentSummary.templateName}
Total Responses: ${assessmentSummary.responseCount}
Overall Score: ${assessmentSummary.overallScore}/5

Dimension Scores:
${assessmentSummary.dimensions.map((d) => `- ${d.name}: ${d.averageScore}/5 (${d.responseCount} responses)`).join("\n")}

Provide strategic insights and recommendations.`;
    } else if (action === "summary") {
      systemPrompt = `You are an expert at summarizing assessment results for executive presentations.
Create a concise executive summary suitable for leadership review.
Include: key findings, overall maturity level, top 3 priorities.`;

      userPrompt = `Create an executive summary for this ${assessmentSummary.category} assessment:

Assessment: ${assessmentSummary.name}
Total Responses: ${assessmentSummary.responseCount}
Overall Score: ${assessmentSummary.overallScore}/5

Scores by Dimension:
${assessmentSummary.dimensions.map((d) => `- ${d.name}: ${d.averageScore}/5`).join("\n")}`;
    } else if (action === "recommendations") {
      systemPrompt = `You are a strategic advisor creating an improvement roadmap.
Provide specific, prioritized recommendations based on the assessment gaps.
Structure as: Quick Wins (0-3 months), Medium-term (3-6 months), Strategic (6-12 months).`;

      userPrompt = `Create improvement recommendations for this assessment:

Assessment: ${assessmentSummary.name}
Category: ${assessmentSummary.category}
Overall Score: ${assessmentSummary.overallScore}/5

Dimension Scores (sorted by priority):
${assessmentSummary.dimensions
  .sort((a, b) => Number(a.averageScore) - Number(b.averageScore))
  .map((d) => `- ${d.name}: ${d.averageScore}/5`)
  .join("\n")}

Focus on the lowest-scoring dimensions first.`;
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Calling Axet LLM for assessment insights:", action);

    const aiResponse = await fetch(AXET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Axet error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "Unable to generate insights";

    console.log("Axet insights generated successfully for action:", action);

    return new Response(
      JSON.stringify({ 
        content,
        summary: assessmentSummary,
        action,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Assessment insights error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
