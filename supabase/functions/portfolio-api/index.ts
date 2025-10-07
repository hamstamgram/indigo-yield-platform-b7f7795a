import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PortfolioPosition {
  asset_id: string;
  asset_name: string;
  asset_symbol: string;
  quantity: number;
  current_price: number;
  current_value: number;
  cost_basis: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
}

interface PortfolioSummary {
  user_id: string;
  total_value: number;
  total_cost_basis: number;
  total_unrealized_pnl: number;
  total_unrealized_pnl_percent: number;
  total_realized_pnl: number;
  positions: PortfolioPosition[];
  last_updated: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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
          headers: { ...corsHeaders, "Content-Type": "application/json" }
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
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id") || user.id;

    // Verify user has permission to access this portfolio
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
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Fetch portfolio positions with current prices
    const { data: positions, error: positionsError } = await supabaseClient
      .from("portfolio_positions")
      .select(`
        *,
        crypto_assets (
          id,
          name,
          symbol,
          current_price,
          price_updated_at
        )
      `)
      .eq("user_id", userId)
      .eq("is_active", true);

    if (positionsError) throw positionsError;

    // Calculate portfolio summary
    const portfolioPositions: PortfolioPosition[] = (positions || []).map((pos: any) => {
      const currentPrice = pos.crypto_assets?.current_price || 0;
      const currentValue = pos.quantity * currentPrice;
      const unrealizedPnl = currentValue - pos.cost_basis;
      const unrealizedPnlPercent = pos.cost_basis > 0
        ? (unrealizedPnl / pos.cost_basis) * 100
        : 0;

      return {
        asset_id: pos.asset_id,
        asset_name: pos.crypto_assets?.name || "Unknown",
        asset_symbol: pos.crypto_assets?.symbol || "???",
        quantity: pos.quantity,
        current_price: currentPrice,
        current_value: currentValue,
        cost_basis: pos.cost_basis,
        unrealized_pnl: unrealizedPnl,
        unrealized_pnl_percent: unrealizedPnlPercent,
      };
    });

    const totalValue = portfolioPositions.reduce((sum, pos) => sum + pos.current_value, 0);
    const totalCostBasis = portfolioPositions.reduce((sum, pos) => sum + pos.cost_basis, 0);
    const totalUnrealizedPnl = totalValue - totalCostBasis;
    const totalUnrealizedPnlPercent = totalCostBasis > 0
      ? (totalUnrealizedPnl / totalCostBasis) * 100
      : 0;

    // Get total realized P&L from transactions
    const { data: realizedPnl } = await supabaseClient
      .from("portfolio_transactions")
      .select("realized_pnl")
      .eq("user_id", userId)
      .eq("transaction_type", "sell");

    const totalRealizedPnl = (realizedPnl || []).reduce(
      (sum: number, txn: any) => sum + (txn.realized_pnl || 0),
      0
    );

    const summary: PortfolioSummary = {
      user_id: userId,
      total_value: totalValue,
      total_cost_basis: totalCostBasis,
      total_unrealized_pnl: totalUnrealizedPnl,
      total_unrealized_pnl_percent: totalUnrealizedPnlPercent,
      total_realized_pnl: totalRealizedPnl,
      positions: portfolioPositions,
      last_updated: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify(summary),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Portfolio API error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
