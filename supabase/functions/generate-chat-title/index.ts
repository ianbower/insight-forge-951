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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await validateAuth(req);
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { message } = await req.json();
    if (!message || typeof message !== "string") return new Response(JSON.stringify({ error: "Message is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const llmConfig = await getActiveLLMConfig();

    const titleMessages = [
      { role: "system", content: `You are a title generator. Given a user's message, generate a concise, descriptive title (3-6 words) that captures the main topic or intent.\nDo not use quotes or punctuation at the end.\nJust return the title text, nothing else.` },
      { role: "user", content: message }
    ];

    let response = await callLLM(llmConfig, titleMessages, false);

    // Fallback to Lovable AI if the active provider fails (e.g. Axet Okta auth error)
    if (!response.ok && llmConfig.provider !== "lovable_ai") {
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      if (lovableKey) {
        console.log(`Primary LLM (${llmConfig.provider}) failed with ${response.status}, falling back to Lovable AI`);
        response = await callLLM(
          { provider: "lovable_ai", model: "google/gemini-3-flash-preview", endpoint_url: "https://ai.gateway.lovable.dev/v1/chat/completions", api_key_secret_name: null },
          titleMessages,
          false
        );
      }
    }

    if (!response.ok) {
      const fallbackTitle = message.slice(0, 40) + (message.length > 40 ? "..." : "");
      return new Response(JSON.stringify({ title: fallbackTitle }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const generatedTitle = data.choices?.[0]?.message?.content?.trim() || message.slice(0, 40);
    const cleanTitle = generatedTitle.replace(/^["']|["']$/g, '').replace(/[.!?]$/, '').slice(0, 50);

    return new Response(JSON.stringify({ title: cleanTitle }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error generating title:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
