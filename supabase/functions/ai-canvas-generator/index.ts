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
  else if (config.provider === "axet") { body.model = config.model || "gpt-4o"; }
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

const systemPrompt = `You are an expert consulting canvas designer. You help create structured canvas layouts for consulting and strategy frameworks.

When a user describes a canvas they want to create, you should:
1. Understand the purpose and use case
2. Suggest an appropriate name and description
3. Design a logical section layout with clear zones

IMPORTANT: Always respond with a JSON structure wrapped in \`\`\`json code blocks.

Your response should include:
{
  "name": "Canvas Name",
  "description": "Brief description of what this canvas is used for",
  "category": "Strategy|Operations|Planning|Organization|Custom",
  "sections": [
    {
      "id": "unique_id",
      "title": "Section Title",
      "description": "What goes in this section",
      "position": { "x": 0, "y": 0, "width": 4, "height": 2 },
      "color": "#color_hex"
    }
  ],
  "layout": {
    "columns": 12,
    "rows": 6,
    "backgroundColor": "#f8fafc"
  },
  "tips": ["Tip 1 for using this canvas", "Tip 2"]
}

Position uses a 12-column grid system. Width and height are in grid units.
Use professional, muted colors that work well together.

Common canvas patterns:
- 3x3 grid (9 sections) - good for matrices
- 2x2 grid (4 sections) - good for quadrants like SWOT
- Horizontal flow (3-5 columns) - good for journeys/processes
- Center + periphery - good for hub-and-spoke models
- Top-to-bottom layers - good for hierarchies

Be creative but practical. Consider the consulting context and make canvases that will genuinely help with strategic work.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await validateAuth(req);
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { messages, context } = await req.json();
    let contextualPrompt = systemPrompt;
    if (context) {
      contextualPrompt += `\n\nAdditional context:\n- Industry Focus: ${context.industry || 'Cross-Industry'}\n- Use Case: ${context.useCase || 'General consulting'}`;
    }

    const llmConfig = await getActiveLLMConfig();
    console.log(`Calling LLM (${llmConfig.provider}) for AI canvas generation...`);

    const response = await callLLM(llmConfig, [{ role: "system", content: contextualPrompt }, ...messages], false);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("LLM error:", response.status, errorText);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("AI canvas generator error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
