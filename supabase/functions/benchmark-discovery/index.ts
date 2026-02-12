import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LLMConfig { provider: string; model: string | null; endpoint_url: string; api_key_secret_name: string | null; }
async function getActiveLLMConfig(): Promise<LLMConfig> {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await sb.from("llm_config").select("provider,model,endpoint_url,api_key_secret_name").eq("is_active", true).limit(1).single();
  if (!data) return { provider: "axet", model: null, endpoint_url: "https://axet.nttdata.com/flows/cloud/hackthon-be/v1/chat/completions", api_key_secret_name: null };
  return data as LLMConfig;
}
async function callLLM(config: LLMConfig, messages: any[], stream = false): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const body: any = { messages, stream };
  if (config.provider === "lovable_ai") { const key = Deno.env.get("LOVABLE_API_KEY"); if (!key) throw new Error("LOVABLE_API_KEY not configured"); headers["Authorization"] = `Bearer ${key}`; if (config.model) body.model = config.model; }
  else if (config.provider === "custom" && config.api_key_secret_name) { const key = Deno.env.get(config.api_key_secret_name); if (key) headers["Authorization"] = `Bearer ${key}`; if (config.model) body.model = config.model; }
  return fetch(config.endpoint_url, { method: "POST", headers, body: JSON.stringify(body) });
}

async function validateAuth(req: Request): Promise<{ userId: string } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return { userId: data.user.id };
}

interface DiscoveryRequest { topic: string; industry?: string; dimensions?: string[]; context?: string; }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await validateAuth(req);
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { topic, industry, dimensions, context } = await req.json() as DiscoveryRequest;

    const systemPrompt = `You are an expert consultant specializing in benchmarking and industry analysis. Your task is to suggest relevant public benchmarks and industry standards based on the assessment topic provided.

For each benchmark suggestion, provide:
1. A specific, actionable benchmark with real-world context
2. The source or framework it's based on
3. Typical score ranges or percentiles observed in the industry
4. The industry or sector it applies to
5. How recent or relevant the data is

IMPORTANT: You must respond with a JSON object in this exact format:
{
  "benchmarks": [
    {
      "name": "Benchmark name",
      "description": "Brief description",
      "source": "Source name",
      "industry": "Industry or Cross-industry",
      "framework": "Related framework if applicable",
      "score_average": 3.5,
      "score_percentile_25": 2.5,
      "score_percentile_50": 3.5,
      "score_percentile_75": 4.2,
      "sample_size": 500,
      "data_year": "2024",
      "relevance_notes": "Why this is relevant",
      "dimension_match": "Matching dimension if specified"
    }
  ],
  "search_notes": "Any caveats about the benchmarks"
}`;

    const userPrompt = `Find relevant public benchmarks for an assessment on the topic: "${topic}"\n${industry ? `Industry focus: ${industry}` : ""}\n${dimensions?.length ? `Key dimensions to benchmark: ${dimensions.join(", ")}` : ""}\n${context ? `Additional context: ${context}` : ""}\n\nProvide 5-8 specific benchmark suggestions with realistic score ranges (on a 1-5 scale).\nRespond ONLY with the JSON object, no additional text.`;

    const llmConfig = await getActiveLLMConfig();
    console.log(`Calling LLM (${llmConfig.provider}) for benchmark discovery...`);

    const response = await callLLM(llmConfig, [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], false);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("LLM error:", response.status, errorText);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`LLM error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      return new Response(JSON.stringify({ benchmarks: [], notes: content || "Unable to extract structured benchmark data" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Benchmark discovery error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
