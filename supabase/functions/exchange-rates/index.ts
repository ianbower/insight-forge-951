import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Exchange rate API - using exchangerate-api.com free tier (no API key needed for basic rates)
const EXCHANGE_RATE_API_URL = "https://api.exchangerate-api.com/v4/latest/USD";

// How old rates can be before refresh (18 hours in milliseconds)
const RATE_EXPIRY_MS = 18 * 60 * 60 * 1000;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if we have recent rates in the database
    const { data: existingRates, error: fetchError } = await supabase
      .from("exchange_rates")
      .select("*")
      .eq("base_currency", "USD")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .single();

    const now = Date.now();

    // If we have rates and they're less than 18 hours old, return them
    if (existingRates && !fetchError) {
      const fetchedAt = new Date(existingRates.fetched_at).getTime();
      const age = now - fetchedAt;

      if (age < RATE_EXPIRY_MS) {
        console.log("Returning cached rates, age:", Math.round(age / 1000 / 60), "minutes");
        return new Response(
          JSON.stringify({
            success: true,
            rates: existingRates.rates,
            fetched_at: existingRates.fetched_at,
            cached: true,
          }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
    }

    // Fetch fresh rates from API
    console.log("Fetching fresh exchange rates...");
    const apiResponse = await fetch(EXCHANGE_RATE_API_URL);
    
    if (!apiResponse.ok) {
      throw new Error(`Failed to fetch exchange rates: ${apiResponse.statusText}`);
    }

    const apiData = await apiResponse.json();
    const rates = apiData.rates;

    // Store in database
    const { error: insertError } = await supabase
      .from("exchange_rates")
      .insert({
        base_currency: "USD",
        rates: rates,
        fetched_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Error storing rates:", insertError);
      // Still return the rates even if storage fails
    }

    // Clean up old rates (keep only last 5)
    const { data: allRates } = await supabase
      .from("exchange_rates")
      .select("id")
      .order("fetched_at", { ascending: false });

    if (allRates && allRates.length > 5) {
      const idsToDelete = allRates.slice(5).map(r => r.id);
      await supabase
        .from("exchange_rates")
        .delete()
        .in("id", idsToDelete);
    }

    return new Response(
      JSON.stringify({
        success: true,
        rates: rates,
        fetched_at: new Date().toISOString(),
        cached: false,
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in exchange-rates function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
