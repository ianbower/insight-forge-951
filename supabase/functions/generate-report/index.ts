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
  else if (config.provider === "axet") { body.model = config.model || "default"; }
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

interface TaskData { title: string; description: string | null; status: string; deliverables: any; notes: any; }
interface ToolData { toolName: string; content: any; }
interface BrandingConfig { primaryColor: string; secondaryColor: string; accentColor: string; headingFont: string; bodyFont: string; styleGuideNotes: string; }
interface RequestBody { projectId: string; projectName: string; clientName: string; tasks: TaskData[]; toolData: ToolData[]; branding: BrandingConfig; }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await validateAuth(req);
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body: RequestBody = await req.json();
    const { projectName, clientName, tasks, toolData, branding } = body;

    const tasksContext = tasks.map((t, i) => {
      let taskStr = `Step ${i + 1}: ${t.title} (Status: ${t.status})`;
      if (t.description) taskStr += `\nDescription: ${t.description}`;
      if (t.deliverables && Array.isArray(t.deliverables)) {
        const dels = t.deliverables.map((d: any) => `- ${d.text || d.name || d} ${d.completed ? "✓" : ""}`).join("\n");
        if (dels) taskStr += `\nDeliverables:\n${dels}`;
      }
      if (t.notes && Array.isArray(t.notes)) {
        const notes = t.notes.map((n: any) => n.text || n).join("; ");
        if (notes) taskStr += `\nNotes: ${notes}`;
      }
      return taskStr;
    }).join("\n\n");

    const toolsContext = toolData.filter((td) => td.toolName && td.content).map((td) => {
      let toolStr = `Tool: ${td.toolName}`;
      if (typeof td.content === "object") {
        const content = td.content;
        if (content.strengths || content.weaknesses || content.opportunities || content.threats) {
          toolStr += "\nSWOT Analysis:";
          if (content.strengths?.length) toolStr += `\n  Strengths: ${content.strengths.map((n: any) => n.content).join(", ")}`;
          if (content.weaknesses?.length) toolStr += `\n  Weaknesses: ${content.weaknesses.map((n: any) => n.content).join(", ")}`;
          if (content.opportunities?.length) toolStr += `\n  Opportunities: ${content.opportunities.map((n: any) => n.content).join(", ")}`;
          if (content.threats?.length) toolStr += `\n  Threats: ${content.threats.map((n: any) => n.content).join(", ")}`;
        } else {
          Object.entries(content).forEach(([key, value]) => {
            if (Array.isArray(value) && value.length > 0) {
              const items = value.map((v: any) => v.content || v.title || JSON.stringify(v)).join(", ");
              toolStr += `\n  ${key}: ${items}`;
            }
          });
        }
      }
      return toolStr;
    }).join("\n\n");

    const styleNotes = branding.styleGuideNotes ? `\n\nStyle/Tone Guidelines: ${branding.styleGuideNotes}` : "";

    const systemPrompt = `You are an expert consulting report writer for a top-tier strategy firm like McKinsey, BCG, or Bain. Generate a comprehensive, professional consulting deliverable report.

CRITICAL FORMATTING RULES:
- DO NOT use any markdown formatting like **bold**, *italics*, or ## headings
- Write in clean, plain prose suitable for a professional white paper
- Use proper sentence structure and paragraphs, not bullet points or lists
- Write complete, flowing sentences that read elegantly
- Avoid jargon overload - be precise but accessible

The report should be structured with clear sections that flow logically. Use sophisticated consulting language while remaining accessible.

IMPORTANT: You must respond with a JSON object in this exact format:
{
  "sections": [
    {
      "title": "Section heading (plain text)",
      "type": "executive-summary|methodology|step-content|tool-output|recommendations|appendix",
      "content": "Full text content for the section"
    }
  ]
}

Create the following sections:
1. Executive Summary
2. Methodology
3. Key Findings
4. Strategic Analysis
5. Recommendations
6. Implementation Roadmap
7. Appendix${styleNotes}`;

    const userPrompt = `Generate a comprehensive consulting report for:\n\nProject: ${projectName}\nClient: ${clientName}\n\nWORKFLOW STEPS:\n${tasksContext || "No workflow steps defined yet."}\n\nSTRATEGIC ANALYSIS (from consulting tools):\n${toolsContext || "No tool analysis data available."}\n\nGenerate a professional consulting report with all required sections. Respond ONLY with the JSON object.`;

    const llmConfig = await getActiveLLMConfig();
    console.log(`Calling LLM (${llmConfig.provider}) for report generation...`);

    const response = await callLLM(llmConfig, [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], false);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("LLM error:", response.status, errorText);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`LLM error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let reportData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      reportData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      console.error("Failed to parse report JSON:", content);
      throw new Error("Invalid AI response format");
    }

    return new Response(JSON.stringify(reportData), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error generating report:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
