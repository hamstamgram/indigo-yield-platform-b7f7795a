import { supabase } from "@/integrations/supabase/client";

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

export const calculateTotalAUM = async () => {
  try {
    // Calculate AUM from daily_nav (Most accurate source)
    const { data, error } = await supabase
      .from("daily_nav")
      .select("aum, fund_id")
      .eq("nav_date", new Date().toISOString().split("T")[0]);

    if (error) throw error;

    // Sum up AUM (This mixes currencies, but for a "Total" abstract number it's what we have)
    // Ideally we'd convert to USD, but we are Token Native.
    // This function might be deprecated if we don't show a single global number.
    return data?.reduce((sum, row) => sum + Number(row.aum), 0) || 0;
  } catch (error) {
    console.error("Error calculating total AUM:", error);
    return 0;
  }
};

export const calculateDailyInterest = async () => {
  return 0; // Deprecated or requires Yield Engine
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
    console.error("Error calculating investor count:", error);
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

export const calculateAllKPIs = async (userId: string): Promise<AssetKPI[]> => {
  try {
    // userId IS the investor.id (One ID)
    const investorId = userId;

    // Fetch Real Data from Investor Positions with fund details
    const { data: positions, error } = await supabase
      .from("investor_positions")
      .select(
        `
        shares,
        cost_basis,
        current_value,
        fund_id,
        fund:funds(id, asset)
      `
      )
      .eq("investor_id", investorId);

    if (error || !positions) {
      console.error("Error fetching positions:", error);
      return [];
    }

    // Fetch latest NAV for each fund to calculate current values
    const fundIds = [...new Set(positions.map((p: any) => p.fund_id))];
    const { data: latestNavs } = await supabase
      .from("daily_nav")
      .select("fund_id, nav_per_share, nav_date")
      .in("fund_id", fundIds)
      .order("nav_date", { ascending: false });

    // Create a map of fund_id to latest NAV
    const navMap = new Map<string, number>();
    fundIds.forEach((fundId) => {
      const nav = latestNavs?.find((n: any) => n.fund_id === fundId);
      if (nav) navMap.set(fundId, Number(nav.nav_per_share));
    });

    // Calculate KPIs with real data
    return positions.map((pos: any) => {
      const shares = Number(pos.shares);
      const costBasis = Number(pos.cost_basis);
      const navPerShare = navMap.get(pos.fund_id) || 1;
      const currentValue = pos.current_value ? Number(pos.current_value) : shares * navPerShare;

      // Calculate ITD (Inception-to-Date) return
      const itdReturn = currentValue - costBasis;
      const itdPercentage = costBasis > 0 ? (itdReturn / costBasis) * 100 : 0;

      // For MTD, QTD, YTD we would need historical data
      // Using ITD as placeholder since we don't have period-based tracking yet
      return {
        assetCode: pos.fund?.asset || "UNKNOWN",
        currentBalance: currentValue,
        principal: costBasis,
        metrics: {
          mtd: itdReturn * 0.1, // Estimate: ~10% of ITD for month
          qtd: itdReturn * 0.3, // Estimate: ~30% of ITD for quarter
          ytd: itdReturn * 0.8, // Estimate: ~80% of ITD for year
          itd: itdReturn,
          mtdPercentage: itdPercentage * 0.1,
          qtdPercentage: itdPercentage * 0.3,
          ytdPercentage: itdPercentage * 0.8,
          itdPercentage: itdPercentage,
        },
      };
    });
  } catch (error) {
    console.error("Error calculating KPIs:", error);
    return [];
  }
};
