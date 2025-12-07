/**
 * Portfolio Service - Updated for secure database schema
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AssetCode = Database["public"]["Enums"]["asset_code"];

export interface PortfolioEntry {
  user_id: string;
  asset_code: string;
  current_balance: number;
  principal: number;
}

export interface InvestorPosition {
  investor_id: string;
  fund_id: string;
  fund_class: string | null;
  shares: number;
  cost_basis: number;
  current_value: number;
}

/**
 * Get user portfolio positions
 */
export async function getUserPortfolio(userId: string): Promise<PortfolioEntry[]> {
  const { data, error } = await supabase.from("positions").select("*").eq("user_id", userId);

  if (error) {
    console.error("Error fetching user portfolio:", error);
    throw new Error(`Failed to fetch user portfolio: ${error.message}`);
  }
  return data || [];
}

/**
 * Get investor positions (for admin view)
 */
export async function getInvestorPositions(investorId: string): Promise<InvestorPosition[]> {
  const { data, error } = await supabase
    .from("investor_positions")
    .select(
      `
      *,
      funds:fund_id (
        code,
        name,
        asset,
        fund_class
      )
    `
    )
    .eq("investor_id", investorId);

  if (error) {
    console.error("Error fetching investor positions:", error);
    throw new Error(`Failed to fetch investor positions: ${error.message}`);
  }
  return data || [];
}

/**
 * Fetch active assets
 */
export const fetchAssets = async () => {
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Error fetching assets:", error);
    throw new Error(`Failed to fetch assets: ${error.message}`);
  }
  return data || [];
};

/**
 * Enrich investors with portfolio data
 */
export const enrichInvestorsWithPortfolioData = async (investors: any[]) => {
  try {
    const enrichedInvestors = await Promise.all(
      investors.map(async (investor) => {
        const positions = await getInvestorPositions(investor.id);
        const totalValue = positions.reduce((sum, pos) => sum + pos.current_value, 0);

        return {
          ...investor,
          totalValue,
          positionCount: positions.length,
          positions,
        };
      })
    );

    return enrichedInvestors;
  } catch (error) {
    console.error("Error enriching investors with portfolio data:", error);
    return investors;
  }
};

/**
 * Create portfolio entries for a new investor
 */
export async function createPortfolioEntries(
  _investorId: string,
  _assets: any[]
): Promise<boolean> {
  try {
    // Stub function - actual implementation would create positions in investor_positions table
    return true;
  } catch (error) {
    console.error("Error creating portfolio entries:", error);
    return false;
  }
}

/**
 * Update portfolio balance
 */
export async function updatePortfolioBalance(
  userId: string,
  assetCode: string,
  newBalance: number
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("positions")
      .update({ current_balance: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("asset_code", assetCode as AssetCode);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating portfolio balance:", error);
    return false;
  }
}
