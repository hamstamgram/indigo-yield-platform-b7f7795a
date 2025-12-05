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
      .from("investors")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");
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
    USDC: { decimals: 2, symbol: "USDC" },
    USDT: { decimals: 2, symbol: "USDT" },
    EURC: { decimals: 2, symbol: "EURC" },
    xAUT: { decimals: 4, symbol: "xAUT" },
  };

  const config = assetConfig[assetCode] || { decimals: 4, symbol: assetCode };

  return `${value.toLocaleString("en-US", {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  })} ${config.symbol}`;
};

export const calculateAllKPIs = async (userId: string): Promise<AssetKPI[]> => {
  try {
    // Fetch Investor ID for the Auth User
    const { data: investor } = await supabase
      .from("investors")
      .select("id")
      .eq("profile_id", userId)
      .single();

    if (!investor) return [];

    // Fetch Real Data from Investor Positions
    const { data: positions, error } = await supabase
      .from("investor_positions")
      .select(
        `
        shares,
        cost_basis,
        fund:funds(asset)
      `
      )
      .eq("investor_id", investor.id);

    if (error || !positions) {
      console.error("Error fetching positions:", error);
      return [];
    }

    // Map to KPI Structure
    return positions.map((pos: any) => ({
      assetCode: pos.fund.asset,
      currentBalance: Number(pos.shares),
      principal: Number(pos.cost_basis),
      metrics: {
        mtd: 0,
        qtd: 0,
        ytd: 0,
        itd: 0,
        mtdPercentage: 0,
        qtdPercentage: 0,
        ytdPercentage: 0,
        itdPercentage: 0,
      },
    }));
  } catch (error) {
    console.error("Error calculating KPIs:", error);
    return [];
  }
};
