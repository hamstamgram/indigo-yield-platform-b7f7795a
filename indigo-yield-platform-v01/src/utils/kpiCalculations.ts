import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc";
import type { RPCResponse } from "@/contracts/rpcSignatures";

export interface AssetKPI {
  assetCode: string;
  currentBalance: number;
  principal: number;
  metrics: {
    mtd: number;
    qtd: number;
    ytd: number;
    itd: number;
    mtdPercentage: number;
    qtdPercentage: number;
    ytdPercentage: number;
    itdPercentage: number;
  };
}

/**
 * Calculate platform KPIs using canonical RPC (P0 Gateway Fix)
 * This method enforces security checks and audit logging
 */
export const calculatePlatformKPIs = async (): Promise<RPCResponse<'get_kpi_metrics'> | null> => {
  try {
    // Use canonical RPC function for KPI calculations
    const { data: kpiData, error } = await rpc.call('get_kpi_metrics', {});

    if (error) {
      console.error('Canonical KPI RPC failed:', error);
      // For non-admin users, this will fail with permission error - that's expected
      if (error.message?.includes('Admin access required')) {
        console.warn('KPI access restricted to admin users');
        return null;
      }
      throw new Error(`KPI calculation failed: ${error.message}`);
    }

    if (!kpiData) {
      throw new Error('No data returned from canonical KPI function');
    }

    return kpiData;
  } catch (error) {
    console.error('Error calculating platform KPIs:', error);
    return null;
  }
};

export const calculateTotalAUM = async () => {
  try {
    // Try canonical RPC first
    const kpiData = await calculatePlatformKPIs();
    if (kpiData?.total_aum !== undefined) {
      return kpiData.total_aum;
    }

    // Fallback to legacy method
    return await legacyCalculateTotalAUM();
  } catch (error) {
    console.error("Error calculating total AUM:", error);
    return await legacyCalculateTotalAUM();
  }
};

/**
 * Legacy AUM calculation for backward compatibility
 * @deprecated Use canonical RPC method instead
 */
const legacyCalculateTotalAUM = async () => {
  try {
    // Calculate AUM from daily_nav (Most accurate source)
    const { data, error } = await supabase
      .from("daily_nav")
      .select("aum, fund_id")
      .eq("nav_date", new Date().toISOString().split("T")[0]);

    if (error) throw error;

    // Sum up AUM - all values are in native token units
    return data?.reduce((sum, row) => sum + Number(row.aum), 0) || 0;
  } catch (error) {
    console.error("Error calculating total AUM (legacy):", error);
    return 0;
  }
};

// calculateDailyInterest has been removed - use the Yield Engine for all yield calculations

export const calculateInvestorCount = async () => {
  try {
    // Try canonical RPC first
    const kpiData = await calculatePlatformKPIs();
    if (kpiData?.total_investors !== undefined) {
      return kpiData.total_investors;
    }

    // Fallback to legacy method
    return await legacyCalculateInvestorCount();
  } catch (error) {
    console.error("Error calculating investor count:", error);
    return await legacyCalculateInvestorCount();
  }
};

/**
 * Legacy investor count calculation for backward compatibility
 * @deprecated Use canonical RPC method instead
 */
const legacyCalculateInvestorCount = async () => {
  try {
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .eq("is_admin", false); // Only count non-admin profiles
    return count || 0;
  } catch (error) {
    console.error("Error calculating investor count (legacy):", error);
    return 0;
  }
};

/**
 * Calculate monthly flows using canonical RPC
 */
export const calculateMonthlyFlows = async (): Promise<{ inflows: number; outflows: number }> => {
  try {
    const kpiData = await calculatePlatformKPIs();
    if (kpiData) {
      return {
        inflows: kpiData.monthly_inflows || 0,
        outflows: kpiData.monthly_outflows || 0
      };
    }

    // Fallback: manual calculation (legacy)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch separately to avoid excessive type instantiation
    const inflowsData = await supabase
      .from("transactions_v2")
      .select("amount")
      .eq("transaction_type", "DEPOSIT")
      .gte("created_at", monthStart.toISOString());

    const outflowsData = await supabase
      .from("transactions_v2")
      .select("amount")
      .eq("transaction_type", "WITHDRAWAL")
      .gte("created_at", monthStart.toISOString());

    const inflows = inflowsData.data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const outflows = outflowsData.data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    return { inflows, outflows };
  } catch (error) {
    console.error("Error calculating monthly flows:", error);
    return { inflows: 0, outflows: 0 };
  }
};

/**
 * Format asset value with proper decimals and symbol
 * CRITICAL: Always display assets in their native currency with symbol
 */
export const formatAssetValue = (value: number, assetCode?: string): string => {
  if (!assetCode) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  }

  const assetConfig: Record<string, { decimals: number; symbol: string }> = {
    BTC: { decimals: 8, symbol: "BTC" },
    ETH: { decimals: 8, symbol: "ETH" },
    SOL: { decimals: 6, symbol: "SOL" },
    USDT: { decimals: 2, symbol: "USDT" },
    EURC: { decimals: 2, symbol: "EURC" },
    xAUT: { decimals: 4, symbol: "xAUT" },
    XRP: { decimals: 6, symbol: "XRP" },
  };

  const config = assetConfig[assetCode] || { decimals: 4, symbol: assetCode };

  return `${value.toLocaleString("en-US", {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  })} ${config.symbol}`;
};

/**
 * Get the current period ID for fetching performance data
 */
async function getCurrentPeriodId(): Promise<string | null> {
  const now = new Date();
  const { data, error } = await supabase
    .from("statement_periods")
    .select("id")
    .eq("year", now.getFullYear())
    .eq("month", now.getMonth() + 1)
    .maybeSingle();

  if (error || !data) {
    // Try to get the most recent period
    const { data: latestPeriod } = await supabase
      .from("statement_periods")
      .select("id")
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(1)
      .maybeSingle();

    return latestPeriod?.id || null;
  }

  return data.id;
}

/**
 * Calculate all KPIs for an investor by fetching REAL data from investor_fund_performance
 * This is the single source of truth for performance metrics.
 *
 * Formula (canonical):
 * - net_income = ending_balance - beginning_balance - additions + redemptions
 * - rate_of_return = net_income / beginning_balance (0 if beginning_balance <= 0)
 */
export const calculateAllKPIs = async (userId: string): Promise<AssetKPI[]> => {
  try {
    const investorId = userId;

    // Get current period ID
    const periodId = await getCurrentPeriodId();

    // First try to fetch from investor_fund_performance (source of truth)
    if (periodId) {
      const { data: performanceData, error: perfError } = await supabase
        .from("investor_fund_performance")
        .select("*")
        .eq("investor_id", investorId)
        .eq("period_id", periodId);

      if (!perfError && performanceData && performanceData.length > 0) {
        // Return real performance data from the canonical source
        return performanceData.map((perf: any) => ({
          assetCode: perf.fund_name,
          currentBalance: Number(perf.mtd_ending_balance) || 0,
          principal: Number(perf.itd_additions) - Number(perf.itd_redemptions) || 0,
          metrics: {
            mtd: Number(perf.mtd_net_income) || 0,
            qtd: Number(perf.qtd_net_income) || 0,
            ytd: Number(perf.ytd_net_income) || 0,
            itd: Number(perf.itd_net_income) || 0,
            mtdPercentage: Number(perf.mtd_rate_of_return) || 0,
            qtdPercentage: Number(perf.qtd_rate_of_return) || 0,
            ytdPercentage: Number(perf.ytd_rate_of_return) || 0,
            itdPercentage: Number(perf.itd_rate_of_return) || 0,
          },
        }));
      }
    }

    // Fallback: Calculate from positions if no performance data exists yet
    // This should only happen for new investors before month-end processing
    console.warn("No investor_fund_performance data found, falling back to positions calculation");

    const { data: positions, error } = await supabase
      .from("investor_positions")
      .select(`
        shares,
        cost_basis,
        current_value,
        fund_id,
        fund:funds!fk_investor_positions_fund(id, asset)
      `)
      .eq("investor_id", investorId);

    if (error || !positions) {
      console.error("Error fetching positions:", error);
      return [];
    }

    // For fallback, we can only calculate ITD from positions
    // MTD/QTD/YTD require the generate-fund-performance edge function to be run
    return positions.map((pos: any) => {
      const currentValue = Number(pos.current_value) || 0;
      const costBasis = Number(pos.cost_basis) || 0;

      // ITD calculation: current_value - cost_basis (where cost_basis = principal)
      const itdReturn = currentValue - costBasis;
      const itdPercentage = costBasis > 0 ? (itdReturn / costBasis) * 100 : 0;

      return {
        assetCode: pos.fund?.asset || "UNKNOWN",
        currentBalance: currentValue,
        principal: costBasis,
        metrics: {
          // Cannot calculate MTD/QTD/YTD without historical data
          // These will be 0 until generate-fund-performance is run
          mtd: 0,
          qtd: 0,
          ytd: 0,
          itd: itdReturn,
          mtdPercentage: 0,
          qtdPercentage: 0,
          ytdPercentage: 0,
          itdPercentage: itdPercentage,
        },
      };
    });
  } catch (error) {
    console.error("Error calculating KPIs:", error);
    return [];
  }
};