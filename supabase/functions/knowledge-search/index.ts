import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query } = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const results: any[] = [];
    const searchTerm = `%${query}%`;

    // Search projects
    const { data: projects } = await supabase.from("projects").select("id, name, status, description, created_at").or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`).limit(10);
    projects?.forEach(p => results.push({ type: "project", id: p.id, title: p.name, excerpt: p.description, status: p.status, created_at: p.created_at }));

    // Search deliverables
    const { data: deliverables } = await supabase.from("project_deliverables").select("id, title, status, description, project_id, created_at").or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`).limit(10);
    deliverables?.forEach(d => results.push({ type: "deliverable", id: d.id, title: d.title, excerpt: d.description, status: d.status, project_id: d.project_id, created_at: d.created_at }));

    // Search assessments
    const { data: assessments } = await supabase.from("assessment_templates").select("id, name, description, category, created_at").or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`).limit(10);
    assessments?.forEach(a => results.push({ type: "assessment", id: a.id, title: a.name, excerpt: a.description, category: a.category, created_at: a.created_at }));

    // Search vault documents
    const { data: docs } = await supabase.from("vault_documents").select("id, name, description, ai_summary, category, created_at").or(`name.ilike.${searchTerm},description.ilike.${searchTerm},ai_summary.ilike.${searchTerm}`).limit(10);
    docs?.forEach(d => results.push({ type: "document", id: d.id, title: d.name, excerpt: d.ai_summary || d.description, category: d.category, created_at: d.created_at }));

    // Search clients
    const { data: clients } = await supabase.from("clients").select("id, name, industry, created_at").ilike("name", searchTerm).limit(10);
    clients?.forEach(c => results.push({ type: "client", id: c.id, title: c.name, excerpt: c.industry, created_at: c.created_at }));

    // Sort by relevance (created_at desc as proxy)
    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return new Response(JSON.stringify({ results: results.slice(0, 30), aiSummary: results.length > 0 ? `Found ${results.length} results across your knowledge base for "${query}".` : null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
