import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DiscoveryRequest {
  topic: string;
  industry?: string;
  dimensions?: string[];
  context?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, industry, dimensions, context } = await req.json() as DiscoveryRequest;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Benchmark discovery request:", { topic, industry, dimensions });

    const systemPrompt = `You are an expert consultant specializing in benchmarking and industry analysis. Your task is to suggest relevant public benchmarks and industry standards based on the assessment topic provided.

For each benchmark suggestion, provide:
1. A specific, actionable benchmark with real-world context
2. The source or framework it's based on (use well-known sources like Gartner, McKinsey, Forrester, industry associations, academic research, government data)
3. Typical score ranges or percentiles observed in the industry
4. The industry or sector it applies to
5. How recent or relevant the data is

Focus on:
- Industry-standard frameworks (CMMI, COBIT, ITIL, ISO standards, etc.)
- Published research from reputable consulting firms
- Government and regulatory benchmarks
- Academic and industry association studies
- Best practice guidelines from professional bodies

Be specific and practical. Provide actionable benchmark data that consultants can use.`;

    const userPrompt = `Find relevant public benchmarks for an assessment on the topic: "${topic}"
${industry ? `Industry focus: ${industry}` : ""}
${dimensions?.length ? `Key dimensions to benchmark: ${dimensions.join(", ")}` : ""}
${context ? `Additional context: ${context}` : ""}

Provide 5-8 specific benchmark suggestions with realistic score ranges (on a 1-5 or 1-10 scale as appropriate).`;

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
              name: "suggest_benchmarks",
              description: "Return a list of relevant public benchmarks with specific data",
              parameters: {
                type: "object",
                properties: {
                  benchmarks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { 
                          type: "string",
                          description: "Short descriptive name for the benchmark"
                        },
                        description: { 
                          type: "string",
                          description: "Brief description of what this benchmark measures"
                        },
                        source: { 
                          type: "string",
                          description: "The source or framework (e.g., 'Gartner 2023', 'CMMI Institute', 'McKinsey Digital')"
                        },
                        industry: { 
                          type: "string",
                          description: "Applicable industry or 'Cross-industry' if general"
                        },
                        framework: { 
                          type: "string",
                          description: "Related framework or standard if applicable"
                        },
                        score_average: { 
                          type: "number",
                          description: "Typical average score (on 1-5 scale)"
                        },
                        score_percentile_25: { 
                          type: "number",
                          description: "25th percentile score (laggards)"
                        },
                        score_percentile_50: { 
                          type: "number",
                          description: "50th percentile score (median)"
                        },
                        score_percentile_75: { 
                          type: "number",
                          description: "75th percentile score (leaders)"
                        },
                        sample_size: { 
                          type: "number",
                          description: "Estimated sample size if known"
                        },
                        data_year: { 
                          type: "string",
                          description: "Year of the data (e.g., '2024', '2023-2024')"
                        },
                        relevance_notes: { 
                          type: "string",
                          description: "Why this benchmark is relevant and how to apply it"
                        },
                        dimension_match: {
                          type: "string",
                          description: "Which dimension this benchmark best applies to, if specified"
                        }
                      },
                      required: ["name", "description", "source", "industry", "score_average", "score_percentile_50"]
                    }
                  },
                  search_notes: {
                    type: "string",
                    description: "Any caveats or notes about the benchmark search"
                  }
                },
                required: ["benchmarks"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "suggest_benchmarks" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received");

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "suggest_benchmarks") {
      // Fallback to parsing content if tool call didn't work
      const content = data.choices?.[0]?.message?.content;
      return new Response(
        JSON.stringify({ 
          benchmarks: [], 
          notes: content || "Unable to extract structured benchmark data" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log(`Found ${result.benchmarks?.length || 0} benchmarks`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Benchmark discovery error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
