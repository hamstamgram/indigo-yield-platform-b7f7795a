import { supabase } from "@/integrations/supabase/client";
import { logError, logWarn } from "@/lib/logger";
import { parseFinancial } from "@/utils/financial";

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
 * NOTE: daily_nav table was dropped - returns 0
 */
export const calculateTotalAUM = async () => {
  return 0;
};

export const calculateInvestorCount = async () => {
  try {
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .eq("is_admin", false); // Only count non-admin profiles
    return count || 0;
  } catch (error) {
    logError("kpiCalculations.calculateInvestorCount", error);
    return 0;
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
          currentBalance: parseFinancial(perf.mtd_ending_balance).toNumber(),
          principal: parseFinancial(perf.itd_additions).minus(parseFinancial(perf.itd_redemptions)).toNumber(),
          metrics: {
            mtd: parseFinancial(perf.mtd_net_income).toNumber(),
            qtd: parseFinancial(perf.qtd_net_income).toNumber(),
            ytd: parseFinancial(perf.ytd_net_income).toNumber(),
            itd: parseFinancial(perf.itd_net_income).toNumber(),
            mtdPercentage: parseFinancial(perf.mtd_rate_of_return).toNumber(),
            qtdPercentage: parseFinancial(perf.qtd_rate_of_return).toNumber(),
            ytdPercentage: parseFinancial(perf.ytd_rate_of_return).toNumber(),
            itdPercentage: parseFinancial(perf.itd_rate_of_return).toNumber(),
          },
        }));
      }
    }

    // Fallback: Calculate from positions if no performance data exists yet
    // This should only happen for new investors before month-end processing
    logWarn("kpiCalculations.calculateAllKPIs", {
      reason: "No investor_fund_performance data found, falling back to positions calculation",
    });

    const { data: positions, error } = await supabase
      .from("investor_positions")
      .select(
        `
        shares,
        cost_basis,
        current_value,
        fund_id,
        fund:funds!fk_investor_positions_fund(id, asset)
      `
      )
      .eq("investor_id", investorId);

    if (error || !positions) {
      logError("kpiCalculations.calculateAllKPIs", error, { step: "fetchPositions" });
      return [];
    }

    // For fallback, we can only calculate ITD from positions
    // MTD/QTD/YTD require the generate-fund-performance edge function to be run
    return positions.map((pos: any) => {
      const currentValue = parseFinancial(pos.current_value);
      const costBasis = parseFinancial(pos.cost_basis);

      // ITD calculation: current_value - cost_basis (where cost_basis = principal)
      const itdReturn = currentValue.minus(costBasis);
      const itdPercentage = costBasis.gt(0)
        ? itdReturn.dividedBy(costBasis).times(100).toNumber()
        : 0;

      return {
        assetCode: pos.fund?.asset || "UNKNOWN",
        currentBalance: currentValue.toNumber(),
        principal: costBasis.toNumber(),
        metrics: {
          // Cannot calculate MTD/QTD/YTD without historical data
          // These will be 0 until generate-fund-performance is run
          mtd: 0,
          qtd: 0,
          ytd: 0,
          itd: itdReturn.toNumber(),
          mtdPercentage: 0,
          qtdPercentage: 0,
          ytdPercentage: 0,
          itdPercentage: itdPercentage,
        },
      };
    });
  } catch (error) {
    logError("kpiCalculations.calculateAllKPIs", error);
    return [];
  }
};
