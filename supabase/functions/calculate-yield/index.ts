import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Secure CORS configuration
const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [];
const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

interface YieldCalculation {
  user_id: string;
  asset_id: string;
  asset_symbol: string;
  yield_type: "staking" | "lending" | "liquidity_provision";
  apy: number;
  principal_amount: number;
  accrued_yield: number;
  last_calculation_date: string;
  next_payout_date: string;
  total_yield_earned: number;
}

interface YieldSummary {
  user_id: string;
  total_accrued_yield: number;
  total_yield_earned: number;
  yield_by_type: {
    staking: number;
    lending: number;
    liquidity_provision: number;
  };
  calculations: YieldCalculation[];
  calculation_timestamp: string;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = corsHeaders(origin);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    // CSRF validation for state-changing operations
    const csrfToken = req.headers.get('x-csrf-token');
    if (!csrfToken || csrfToken.length < 32) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid CSRF token' }),
        { headers: { ...headers, 'Content-Type': 'application/json' }, status: 403 }
      );
    }
    // Validate environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing required environment variables", {
        has_url: !!supabaseUrl,
        has_key: !!supabaseAnonKey
      });

      return new Response(
        JSON.stringify({
          error: "Server configuration error. Please contact support."
        }),
        {
          status: 500,
          headers: { ...headers, "Content-Type": "application/json" }
        }
      );
    }

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...headers, "Content-Type": "application/json" },
        }
      );
    }

    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id") || user.id;
    const applyYield = url.searchParams.get("apply") === "true";

    // Verify user has permission
    if (userId !== user.id) {
      const { data: adminData } = await supabaseClient
        .from("admin_users")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!adminData) {
        return new Response(
          JSON.stringify({ error: "Forbidden: Admin access required" }),
          {
            status: 403,
            headers: { ...headers, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Fetch all yield-generating positions
    const { data: yieldPositions, error: positionsError } = await supabaseClient
      .from("yield_positions")
      .select(`
        *,
        crypto_assets (
          id,
          symbol,
          current_price
        )
      `)
      .eq("user_id", userId)
      .eq("is_active", true);

    if (positionsError) throw positionsError;

    const calculations: YieldCalculation[] = [];
    const now = new Date();

    for (const position of yieldPositions || []) {
      const lastCalc = new Date(position.last_yield_calculation || position.created_at);
      const daysSinceLastCalc = (now.getTime() - lastCalc.getTime()) / (1000 * 60 * 60 * 24);

      // Calculate accrued yield using compound interest formula
      // A = P(1 + r/n)^(nt) - P
      // For daily compounding: A = P(1 + APY/365)^(days) - P
      const apy = position.current_apy / 100; // Convert percentage to decimal
      const principal = position.staked_amount || position.principal_amount;
      const accruedYield = principal * (Math.pow(1 + apy / 365, daysSinceLastCalc) - 1);

      // Determine next payout date based on payout frequency
      let nextPayoutDate = new Date(lastCalc);
      switch (position.payout_frequency) {
        case "daily":
          nextPayoutDate.setDate(nextPayoutDate.getDate() + 1);
          break;
        case "weekly":
          nextPayoutDate.setDate(nextPayoutDate.getDate() + 7);
          break;
        case "monthly":
          nextPayoutDate.setMonth(nextPayoutDate.getMonth() + 1);
          break;
        default:
          nextPayoutDate.setDate(nextPayoutDate.getDate() + 1);
      }

      const calc: YieldCalculation = {
        user_id: userId,
        asset_id: position.asset_id,
        asset_symbol: position.crypto_assets?.symbol || "???",
        yield_type: position.yield_type,
        apy: position.current_apy,
        principal_amount: principal,
        accrued_yield: accruedYield,
        last_calculation_date: position.last_yield_calculation || position.created_at,
        next_payout_date: nextPayoutDate.toISOString(),
        total_yield_earned: (position.total_yield_earned || 0) + accruedYield,
      };

      calculations.push(calc);

      // If apply flag is set, update the position with new yield
      if (applyYield && accruedYield > 0) {
        const { error: updateError } = await supabaseClient
          .from("yield_positions")
          .update({
            accrued_yield: (position.accrued_yield || 0) + accruedYield,
            total_yield_earned: (position.total_yield_earned || 0) + accruedYield,
            last_yield_calculation: now.toISOString(),
          })
          .eq("id", position.id);

        if (updateError) {
          console.error(`Failed to update yield for position ${position.id}:`, updateError);
        }

        // Create yield transaction record
        const { error: txnError } = await supabaseClient
          .from("yield_transactions")
          .insert({
            user_id: userId,
            position_id: position.id,
            asset_id: position.asset_id,
            yield_amount: accruedYield,
            yield_type: position.yield_type,
            apy: position.current_apy,
            calculation_date: now.toISOString(),
          });

        if (txnError) {
          console.error(`Failed to create yield transaction:`, txnError);
        }
      }
    }

    // Calculate summary statistics
    const totalAccruedYield = calculations.reduce((sum, calc) => sum + calc.accrued_yield, 0);
    const totalYieldEarned = calculations.reduce((sum, calc) => sum + calc.total_yield_earned, 0);

    const yieldByType = {
      staking: calculations
        .filter((c) => c.yield_type === "staking")
        .reduce((sum, c) => sum + c.accrued_yield, 0),
      lending: calculations
        .filter((c) => c.yield_type === "lending")
        .reduce((sum, c) => sum + c.accrued_yield, 0),
      liquidity_provision: calculations
        .filter((c) => c.yield_type === "liquidity_provision")
        .reduce((sum, c) => sum + c.accrued_yield, 0),
    };

    const summary: YieldSummary = {
      user_id: userId,
      total_accrued_yield: totalAccruedYield,
      total_yield_earned: totalYieldEarned,
      yield_by_type: yieldByType,
      calculations,
      calculation_timestamp: now.toISOString(),
    };

    return new Response(
      JSON.stringify({
        ...summary,
        applied: applyYield,
      }),
      {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Yield calculation error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  }
});
