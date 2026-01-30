import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Axet LLM for title generation
    const AXET_URL = "https://axet.nttdata.com/flows/cloud/hackthon-be/v1/chat/completions";

    const response = await fetch(AXET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: `You are a title generator. Given a user's message, generate a concise, descriptive title (3-6 words) that captures the main topic or intent. 
Do not use quotes or punctuation at the end. 
Just return the title text, nothing else.
Examples:
- "How do I implement authentication?" → "Implementing Authentication"
- "What's the best strategy for entering new markets?" → "Market Entry Strategy"
- "Can you help me understand SWOT analysis?" → "Understanding SWOT Analysis"`
          },
          {
            role: "user",
            content: message
          }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Axet error:", response.status, errorText);
      // Fallback to truncated message
      const fallbackTitle = message.slice(0, 40) + (message.length > 40 ? "..." : "");
      return new Response(
        JSON.stringify({ title: fallbackTitle }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const generatedTitle = data.choices?.[0]?.message?.content?.trim() || message.slice(0, 40);

    // Clean up the title
    const cleanTitle = generatedTitle
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/[.!?]$/, '') // Remove trailing punctuation
      .slice(0, 50); // Limit length

    return new Response(
      JSON.stringify({ title: cleanTitle }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating title:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
