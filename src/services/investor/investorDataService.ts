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
  allocationPercentage?: number;
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
  isSystemAccount?: boolean;
}

export interface PortfolioPerformance {
  mtd_return: number;
  qtd_return: number;
  ytd_return: number;
  itd_return: number;
  mtd_percentage: number;
  qtd_percentage: number;
  ytd_percentage: number;
  itd_percentage: number;
}

export interface InvestorPortfolio {
  portfolio_id: string;
  portfolio_name: string;
  total_value: number;
  total_pnl: number;
  positions: InvestorPositionDetail[];
  performance_metrics: PortfolioPerformance;
}

export interface YieldHistoryEntry {
  date: string;
  asset: string;
  balance_before: number;
  yield_amount: number;
  balance_after: number;
  daily_rate: number;
  annual_rate: number;
}

export interface WithdrawalRequest {
  id: string;
  fund_id: string;
  fund_name: string;
  fund_class: string;
  asset: string;
  requested_amount: number;
  approved_amount?: number;
  processed_amount?: number;
  withdrawal_type: string;
  status: string;
  notes?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  approved_at?: string | null;
  settlement_date?: string | null;
  tx_hash?: string | null;
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

      const totalValue = (fundPositions || []).reduce((sum, pos) => sum + Number(pos.current_value || 0), 0);

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
        allocationPercentage: totalValue > 0 ? (Number(fp.current_value) / totalValue) * 100 : 0,
      }));
    } catch (error) {
      console.error("Error in getInvestorPositions:", error);
      throw error;
    }
  }

  /**
   * Get detailed investor portfolio with performance metrics
   */
  async getInvestorPortfolio(investorId?: string): Promise<InvestorPortfolio | null> {
    const id = investorId || (await supabase.auth.getUser()).data.user?.id;
    if (!id) return null;

    const summary = await this.getInvestorSummary(id);
    if (!summary) return null;

    const positions = await this.getInvestorPositions(id);

    // Calculate performance metrics (simplified for now)
    const totalValue = summary.totalAUM;
    const totalPnL = summary.totalEarned; // Unrealized for now

    const performanceMetrics: PortfolioPerformance = {
      mtd_return: 0,
      qtd_return: 0,
      ytd_return: totalPnL,
      itd_return: totalPnL,
      mtd_percentage: 0,
      qtd_percentage: 0,
      ytd_percentage: totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0,
      itd_percentage: totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0,
    };

    return {
      portfolio_id: id,
      portfolio_name: summary.name || "Portfolio",
      total_value: totalValue,
      total_pnl: totalPnL,
      positions,
      performance_metrics: performanceMetrics,
    };
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
      // Step 1: Get all investors including system accounts (like INDIGO FEES)
      // We filter out is_admin=true but include account_type='fees_account'
      const { data: investors, error } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, status, onboarding_date, created_at, account_type")
        .eq("is_admin", false) // Include all non-admin accounts (investors + system accounts)
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
        const isSystemAccount = investor.account_type === 'fees_account';

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
          isSystemAccount,
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

  // Get yield history for the investor (from transactions_v2)
  async getYieldHistory(days: number = 30): Promise<YieldHistoryEntry[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return [];

    // The user.user.id IS the investor_id now (One ID)
    const investorId = user.user.id;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get yield transactions (INTEREST type) from transactions_v2
    const { data, error } = await supabase
      .from("transactions_v2")
      .select("*")
      .eq("investor_id", investorId)
      .eq("type", "INTEREST")
      .gte("tx_date", startDate.toISOString().split("T")[0])
      .order("tx_date", { ascending: false })
      .order("id", { ascending: false }); // Deterministic tie-breaker for same-day ordering

    if (error) throw error;

    return (data || []).map((entry) => ({
      date: entry.tx_date,
      asset: entry.asset,
      balance_before: Number(entry.balance_before || 0),
      yield_amount: Number(entry.amount),
      balance_after: Number(entry.balance_after || 0),
      daily_rate: 0, // daily_rate column doesn't exist in transactions_v2
      annual_rate: 0, // annual_rate column doesn't exist in transactions_v2
    }));
  }

  // Get investor's withdrawal requests
  async getWithdrawalRequests(): Promise<WithdrawalRequest[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return [];

    const investorId = user.user.id;

    const { data, error } = await supabase
      .from("withdrawal_requests")
      .select(
        `
        *,
        funds!inner(name, asset, fund_class)
      `
      )
      .eq("investor_id", investorId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((request) => ({
      id: request.id,
      fund_id: request.fund_id,
      fund_name: (request.funds as any)?.name || "Unknown",
      fund_class: (request.funds as any)?.fund_class || "Standard",
      asset: (request.funds as any)?.asset || "Unknown",
      requested_amount: Number(request.requested_amount),
      approved_amount: request.approved_amount ? Number(request.approved_amount) : undefined,
      processed_amount: request.processed_amount ? Number(request.processed_amount) : undefined,
      withdrawal_type: request.withdrawal_type,
      status: request.status,
      notes: request.notes,
      rejection_reason: request.rejection_reason,
      created_at: request.request_date,
      approved_at: request.approved_at,
      settlement_date: request.settlement_date,
      tx_hash: request.tx_hash,
    }));
  }

  // Create a withdrawal request
  async createWithdrawalRequest(
    fundId: string,
    amount: number,
    withdrawalType: string = "partial",
    notes?: string
  ): Promise<string> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("Not authenticated");

    const investorId = user.user.id;

    const { data, error } = await supabase.rpc("create_withdrawal_request", {
      p_investor_id: investorId,
      p_fund_id: fundId,
      p_amount: amount,
      p_type: withdrawalType,
      p_notes: notes || undefined,
    });

    if (error) throw error;
    return data;
  }

  // Cancel a withdrawal request (if still pending)
  async cancelWithdrawalRequest(requestId: string, reason?: string): Promise<void> {
    const { error } = await supabase
      .from("withdrawal_requests")
      .update({
        status: "cancelled",
        cancellation_reason: reason || "Cancelled by investor",
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("status", "pending");

    if (error) throw error;
  }

  // Get available funds for investment
  async getAvailableFunds(): Promise<any[]> {
    const { data, error } = await supabase
      .from("funds")
      .select("*")
      .eq("status", "active")
      .order("name");

    if (error) throw error;
    return data || [];
  }

  // Get current yield rates for all assets
  async getCurrentYieldRates(): Promise<any[]> {
    const { data, error } = await supabase
      .from("yield_settings")
      .select("id, rate_bps, frequency, effective_from");

    if (error) {
      console.warn("getCurrentYieldRates: Error fetching yield settings:", error);
      return [];
    }

    return (data || []).map((setting) => ({
      asset_symbol: "USD", // Default since no asset_code column in current view
      asset_name: "USD Yield",
      daily_rate: (setting.rate_bps || 0) / 10000 / 365,
      annual_rate: (setting.rate_bps || 0) / 100,
    }));
  }

  // Get investor documents (statements, etc.)
  async getInvestorDocuments(): Promise<any[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return [];

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Get portfolio performance over time (from portfolio_history)
  async getPortfolioPerformanceHistory(days: number = 30): Promise<any[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return [];

    const investorId = user.user.id;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Break type chain to avoid TS2589
    const queryBuilder: any = supabase.from("portfolio_history");
    const { data, error } = await queryBuilder
      .select("*")
      .eq("investor_id", investorId)
      .gte("snapshot_date", startDate.toISOString().split("T")[0])
      .order("snapshot_date", { ascending: true });

    if (error) throw error;
    return data || [];
  }
}

// Export singleton instance
export const investorDataService = new InvestorDataService();
