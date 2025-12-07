import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type DbPosition = Database["public"]["Tables"]["investor_positions"]["Row"];

export interface InvestorPositionDetail {
  fundId: string;
  fundName: string;
  fundCode: string;
  asset: string;
  fundClass: string;
  shares: number;
  currentValue: number;
  costBasis: number;
  unrealizedPnl: number;
  realizedPnl: number;
  lastTransactionDate?: string | null;
  lockUntilDate?: string | null;
}

export interface InvestorSummary {
  id: string;
  name: string;
  email: string;
  status: string;
  totalAUM: number;
  totalEarned: number;
  totalPrincipal: number;
  positionCount: number;
  assetBreakdown: Record<string, number>;
  onboardingDate?: string | null;
}

/**
 * Unified service for investor data management
 * Updated to use 'investor_positions' as the single source of truth
 */
export class InvestorDataService {
  /**
   * Get investor positions from the new structure
   */
  async getInvestorPositions(investorId: string): Promise<InvestorPositionDetail[]> {
    try {
      // Get positions from investor_positions
      const { data: fundPositions, error } = await supabase
        .from("investor_positions")
        .select(
          `
          *,
          funds (
            name,
            code,
            asset,
            fund_class
          )
        `
        )
        .eq("investor_id", investorId)
        .gt("shares", 0);

      if (error) {
        console.error("Error fetching investor positions:", error);
        throw error;
      }

      return (fundPositions || []).map((fp: any) => ({
        fundId: fp.fund_id,
        fundName: fp.funds?.name || "Unknown Fund",
        fundCode: fp.funds?.code || "N/A",
        asset: fp.funds?.asset || "Unknown",
        fundClass: fp.fund_class || fp.funds?.fund_class || "Standard",
        shares: Number(fp.shares) || 0,
        currentValue: Number(fp.current_value) || 0,
        costBasis: Number(fp.cost_basis) || 0,
        unrealizedPnl: Number(fp.unrealized_pnl) || 0,
        realizedPnl: Number(fp.realized_pnl) || 0,
        lastTransactionDate: fp.last_transaction_date || fp.updated_at,
        lockUntilDate: fp.lock_until_date,
      }));
    } catch (error) {
      console.error("Error in getInvestorPositions:", error);
      throw error;
    }
  }

  /**
   * Get investor summary with consolidated data
   */
  async getInvestorSummary(investorId: string): Promise<InvestorSummary | null> {
    try {
      // Get investor profile from PROFILES table (unified ID)
      const { data: investor, error: investorError } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, status, onboarding_date, created_at")
        .eq("id", investorId)
        .single();

      if (investorError) {
        console.error("Error fetching investor:", investorError);
        throw investorError;
      }

      if (!investor) return null;

      // Get positions to calculate totals
      const positions = await this.getInvestorPositions(investorId);

      const totalAUM = positions.reduce((sum, pos) => sum + pos.currentValue, 0);
      const totalEarned = positions.reduce((sum, pos) => sum + pos.unrealizedPnl, 0);
      const totalPrincipal = positions.reduce((sum, pos) => sum + pos.costBasis, 0);

      // Calculate asset breakdown
      const assetBreakdown: Record<string, number> = {};
      positions.forEach((pos) => {
        if (!assetBreakdown[pos.asset]) {
          assetBreakdown[pos.asset] = 0;
        }
        assetBreakdown[pos.asset] += pos.currentValue;
      });

      const fullName = `${investor.first_name || ""} ${investor.last_name || ""}`.trim();

      return {
        id: investor.id,
        name: fullName || "Unknown",
        email: investor.email || "",
        status: investor.status || "active",
        totalAUM,
        totalEarned,
        totalPrincipal,
        positionCount: positions.length,
        assetBreakdown,
        onboardingDate: investor.onboarding_date || investor.created_at,
      };
    } catch (error) {
      console.error("Error in getInvestorSummary:", error);
      throw error;
    }
  }

  /**
   * Get all investors with their position summaries
   * OPTIMIZED: Uses batch queries to avoid N+1 pattern
   */
  async getAllInvestorsWithSummary(): Promise<InvestorSummary[]> {
    try {
      // Step 1: Get all investors (profiles with role=user usually, or filtering admin)
      const { data: investors, error } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, status, onboarding_date, created_at")
        .eq("is_admin", false) // Assuming we only want investors
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching investors:", error);
        throw error;
      }

      if (!investors || investors.length === 0) return [];

      // Step 2: Get ALL positions with fund data in one query (fixes N+1)
      const investorIds = investors.map((inv) => inv.id);
      const { data: allPositions } = await supabase
        .from("investor_positions")
        .select(
          `
          investor_id,
          shares,
          current_value,
          cost_basis,
          unrealized_pnl,
          funds (asset)
        `
        )
        .in("investor_id", investorIds)
        .gt("shares", 0);

      // Step 3: Group positions by investor_id for O(1) lookup
      const positionsByInvestor = new Map<string, typeof allPositions>();
      (allPositions || []).forEach((pos) => {
        const existing = positionsByInvestor.get(pos.investor_id) || [];
        existing.push(pos);
        positionsByInvestor.set(pos.investor_id, existing);
      });

      // Step 4: Map investors with pre-fetched positions (no additional queries)
      const summaries = investors.map((investor) => {
        const positions = positionsByInvestor.get(investor.id) || [];

        const totalAUM = positions.reduce((sum, pos) => sum + Number(pos.current_value || 0), 0);
        const totalEarned = positions.reduce(
          (sum, pos) => sum + Number(pos.unrealized_pnl || 0),
          0
        );
        const totalPrincipal = positions.reduce((sum, pos) => sum + Number(pos.cost_basis || 0), 0);

        // Calculate asset breakdown
        const assetBreakdown: Record<string, number> = {};
        positions.forEach((pos) => {
          const asset = (pos.funds as { asset?: string } | null)?.asset || "Unknown";
          if (!assetBreakdown[asset]) {
            assetBreakdown[asset] = 0;
          }
          assetBreakdown[asset] += Number(pos.current_value || 0);
        });

        const fullName = `${investor.first_name || ""} ${investor.last_name || ""}`.trim();

        return {
          id: investor.id,
          name: fullName || "Unknown",
          email: investor.email || "",
          status: investor.status || "active",
          totalAUM,
          totalEarned,
          totalPrincipal,
          positionCount: positions.length,
          assetBreakdown,
          onboardingDate: investor.onboarding_date || investor.created_at,
        };
      });

      return summaries;
    } catch (error) {
      console.error("Error in getAllInvestorsWithSummary:", error);
      throw error;
    }
  }

  /**
   * Get user's own positions (for investor dashboard)
   * Note: The userId IS the investor_id now (Unified ID)
   */
  async getUserPositions(userId: string): Promise<InvestorPositionDetail[]> {
    try {
      // Direct call - One ID rule
      return await this.getInvestorPositions(userId);
    } catch (error) {
      console.error("Error fetching user positions:", error);
      throw error;
    }
  }

  /**
   * Calculate total AUM across all investors
   */
  async getTotalAUM(): Promise<number> {
    try {
      const { data, error } = await supabase.from("investor_positions").select("current_value");

      if (error) throw error;

      return data?.reduce((sum, pos) => sum + Number(pos.current_value), 0) || 0;
    } catch (error) {
      console.error("Error calculating total AUM:", error);
      return 0;
    }
  }

  /**
   * Get investor count with active positions
   */
  async getActiveInvestorCount(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from("investor_positions")
        .select("investor_id")
        .gt("current_value", 0);

      if (error) throw error;

      // Count unique users
      const uniqueInvestors = new Set(data?.map((pos) => pos.investor_id));
      return uniqueInvestors.size;
    } catch (error) {
      console.error("Error getting active investor count:", error);
      return 0;
    }
  }
}

// Export singleton instance
export const investorDataService = new InvestorDataService();
