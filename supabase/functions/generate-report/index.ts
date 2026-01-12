import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TaskData {
  title: string;
  description: string | null;
  status: string;
  deliverables: any;
  notes: any;
}

interface ToolData {
  toolName: string;
  content: any;
}

interface BrandingConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headingFont: string;
  bodyFont: string;
  styleGuideNotes: string;
}

interface RequestBody {
  projectId: string;
  projectName: string;
  clientName: string;
  tasks: TaskData[];
  toolData: ToolData[];
  branding: BrandingConfig;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body: RequestBody = await req.json();
    const { projectName, clientName, tasks, toolData, branding } = body;

    console.log("Generating report for project:", projectName);
    console.log("Tasks count:", tasks.length);
    console.log("Tool data count:", toolData.length);

    // Build context from project data
    const tasksContext = tasks
      .map((t, i) => {
        let taskStr = `Step ${i + 1}: ${t.title} (Status: ${t.status})`;
        if (t.description) taskStr += `\nDescription: ${t.description}`;
        if (t.deliverables && Array.isArray(t.deliverables)) {
          const dels = t.deliverables
            .map((d: any) => `- ${d.text || d.name || d} ${d.completed ? "✓" : ""}`)
            .join("\n");
          if (dels) taskStr += `\nDeliverables:\n${dels}`;
        }
        if (t.notes && Array.isArray(t.notes)) {
          const notes = t.notes.map((n: any) => n.text || n).join("; ");
          if (notes) taskStr += `\nNotes: ${notes}`;
        }
        return taskStr;
      })
      .join("\n\n");

    const toolsContext = toolData
      .filter((td) => td.toolName && td.content)
      .map((td) => {
        let toolStr = `Tool: ${td.toolName}`;
        if (typeof td.content === "object") {
          // Format tool content based on known structures
          const content = td.content;
          if (content.strengths || content.weaknesses || content.opportunities || content.threats) {
            // SWOT
            toolStr += "\nSWOT Analysis:";
            if (content.strengths?.length) toolStr += `\n  Strengths: ${content.strengths.map((n: any) => n.content).join(", ")}`;
            if (content.weaknesses?.length) toolStr += `\n  Weaknesses: ${content.weaknesses.map((n: any) => n.content).join(", ")}`;
            if (content.opportunities?.length) toolStr += `\n  Opportunities: ${content.opportunities.map((n: any) => n.content).join(", ")}`;
            if (content.threats?.length) toolStr += `\n  Threats: ${content.threats.map((n: any) => n.content).join(", ")}`;
          } else {
            // Generic: stringify sections
            Object.entries(content).forEach(([key, value]) => {
              if (Array.isArray(value) && value.length > 0) {
                const items = value.map((v: any) => v.content || v.title || JSON.stringify(v)).join(", ");
                toolStr += `\n  ${key}: ${items}`;
              }
            });
          }
        }
        return toolStr;
      })
      .join("\n\n");

    const styleNotes = branding.styleGuideNotes
      ? `\n\nStyle/Tone Guidelines: ${branding.styleGuideNotes}`
      : "";

    const systemPrompt = `You are an expert consulting report writer. Generate a comprehensive, professional consulting deliverable report. 

The report should be structured with clear sections that flow logically. Use professional consulting language while remaining accessible. 

The output must be a JSON object with a "sections" array, where each section has:
- "title": Section heading
- "type": One of "executive-summary", "methodology", "step-content", "tool-output", "recommendations", "appendix"
- "content": The full text content for that section

Create the following sections:
1. Executive Summary - High-level overview of the engagement, key findings, and critical recommendations
2. Methodology - How the work was conducted, frameworks used
3. Key Findings - Detailed analysis from each workflow step
4. Strategic Analysis - Insights from any tools/frameworks used (SWOT, Business Model Canvas, etc.)
5. Recommendations - Actionable next steps prioritized by impact
6. Implementation Roadmap - High-level timeline for executing recommendations
7. Appendix - Supporting details, data sources, and methodology notes${styleNotes}`;

    const userPrompt = `Generate a comprehensive consulting report for:

Project: ${projectName}
Client: ${clientName}

WORKFLOW STEPS:
${tasksContext || "No workflow steps defined yet."}

STRATEGIC ANALYSIS (from consulting tools):
${toolsContext || "No tool analysis data available."}

Generate a professional consulting report with all required sections. Make it actionable and insightful.`;

    console.log("Calling Lovable AI...");

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
        tools: [
          {
            type: "function",
            function: {
              name: "create_report",
              description: "Create a structured consulting report with multiple sections",
              parameters: {
                type: "object",
                properties: {
                  sections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Section heading" },
                        type: {
                          type: "string",
                          enum: ["executive-summary", "methodology", "step-content", "tool-output", "recommendations", "appendix"],
                        },
                        content: { type: "string", description: "Full text content for the section" },
                      },
                      required: ["title", "type", "content"],
                    },
                  },
                },
                required: ["sections"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_report" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received");

    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in response:", JSON.stringify(data));
      throw new Error("Invalid AI response format");
    }

    const reportData = JSON.parse(toolCall.function.arguments);
    console.log("Report sections generated:", reportData.sections?.length);

    return new Response(JSON.stringify(reportData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
