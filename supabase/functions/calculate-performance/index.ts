/**
 * @deprecated This edge function is DEPRECATED as of December 2024.
 * 
 * Use `generate-fund-performance` instead, which implements the canonical formula:
 * - net_income = ending_balance - beginning_balance - additions + redemptions
 * - rate_of_return = net_income / beginning_balance
 * 
 * This function used the Modified Dietz method which is inconsistent with the
 * investor_fund_performance table calculations.
 * 
 * Migration path:
 * 1. Replace calls to `/calculate-performance` with `/generate-fund-performance`
 * 2. Request body changes: { investorId, asOfDate } -> { periodYear, periodMonth }
 * 3. Response format changes: individual investor -> batch processing
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.warn("DEPRECATED: calculate-performance called. Use generate-fund-performance instead.");

  return new Response(
    JSON.stringify({
      success: false,
      error: "DEPRECATED",
      message: "This endpoint is deprecated. Use /generate-fund-performance instead.",
      migration: {
        newEndpoint: "/generate-fund-performance",
        newRequestFormat: "{ periodYear: number, periodMonth: number }",
        documentation: "See generate-fund-performance for the canonical performance calculation formula."
      }
    }),
    {
      status: 410, // HTTP 410 Gone
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
