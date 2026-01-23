import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Axet LLM endpoint - NTT Data's custom LLM
const AXET_URL = "https://axet.nttdata.com/flows/cloud/hackthon-be/v1/chat/completions";

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

Be specific and practical. Provide actionable benchmark data that consultants can use.

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

    const userPrompt = `Find relevant public benchmarks for an assessment on the topic: "${topic}"
${industry ? `Industry focus: ${industry}` : ""}
${dimensions?.length ? `Key dimensions to benchmark: ${dimensions.join(", ")}` : ""}
${context ? `Additional context: ${context}` : ""}

Provide 5-8 specific benchmark suggestions with realistic score ranges (on a 1-5 scale).
Respond ONLY with the JSON object, no additional text.`;

    console.log("Calling Axet LLM for benchmark discovery...");

    const response = await fetch(AXET_URL, {
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Axet error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Axet error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    console.log("Axet benchmark response received");

    // Try to parse the JSON from the response
    let result;
    try {
      // Try to extract JSON from the content
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = JSON.parse(content);
      }
    } catch {
      console.error("Failed to parse benchmark JSON:", content);
      return new Response(
        JSON.stringify({ 
          benchmarks: [], 
          notes: content || "Unable to extract structured benchmark data" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
