import { supabase } from "@/integrations/supabase/client";

export interface InvestorPortfolioV2 {
  portfolio_id: string;
  portfolio_name: string;
  total_value: number;
  total_pnl: number;
  positions: InvestorPositionV2[];
  performance_metrics: PortfolioPerformance;
}

export interface InvestorPositionV2 {
  fund_id: string;
  fund_name: string;
  fund_class: string;
  asset: string;
  shares: number;
  cost_basis: number;
  current_value: number;
  unrealized_pnl: number;
  realized_pnl: number;
  allocation_percentage: number;
  last_transaction_date?: string | null;
  lock_until_date?: string | null;
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

export interface YieldHistoryEntry {
  date: string;
  asset: string;
  balance_before: number;
  yield_amount: number;
  balance_after: number;
  daily_rate: number;
  annual_rate: number;
}

export interface WithdrawalRequestV2 {
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

class InvestorServiceV2 {
  // Get investor's current portfolio with all positions
  async getInvestorPortfolio(): Promise<InvestorPortfolioV2 | null> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return null;

    // Get investor record
    const { data: investor } = await supabase
      .from("investors")
      .select("id, name")
      .eq("profile_id", user.user.id)
      .maybeSingle();

    if (!investor) return null;

    // Get all positions for this investor
    const { data: positions, error } = await supabase
      .from("investor_positions")
      .select(
        `
        fund_id,
        fund_class,
        shares,
        cost_basis,
        current_value,
        unrealized_pnl,
        realized_pnl,
        last_transaction_date,
        lock_until_date,
        funds!inner(name, asset)
      `
      )
      .eq("investor_id", investor.id);

    if (error) throw error;

    const totalValue = (positions || []).reduce((sum, pos) => sum + Number(pos.current_value), 0);
    const totalPnL = (positions || []).reduce(
      (sum, pos) => sum + Number(pos.unrealized_pnl) + Number(pos.realized_pnl),
      0
    );

    const portfolioPositions: InvestorPositionV2[] = (positions || []).map((pos) => ({
      fund_id: pos.fund_id,
      fund_name: (pos.funds as any)?.name || "Unknown",
      fund_class: pos.fund_class || "Standard",
      asset: (pos.funds as any)?.asset || "Unknown",
      shares: Number(pos.shares),
      cost_basis: Number(pos.cost_basis),
      current_value: Number(pos.current_value),
      unrealized_pnl: Number(pos.unrealized_pnl),
      realized_pnl: Number(pos.realized_pnl),
      allocation_percentage: totalValue > 0 ? (Number(pos.current_value) / totalValue) * 100 : 0,
      last_transaction_date: pos.last_transaction_date,
      lock_until_date: pos.lock_until_date,
    }));

    // Calculate performance metrics (simplified for now)
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
      portfolio_id: investor.id,
      portfolio_name: investor.name || "Portfolio",
      total_value: totalValue,
      total_pnl: totalPnL,
      positions: portfolioPositions,
      performance_metrics: performanceMetrics,
    };
  }

  // Get yield history for the investor (from transactions_v2)
  async getYieldHistory(days: number = 30): Promise<YieldHistoryEntry[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return [];

    // Get investor record
    const { data: investor } = await supabase
      .from("investors")
      .select("id")
      .eq("profile_id", user.user.id)
      .maybeSingle();

    if (!investor) return [];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get yield transactions (INTEREST type) from transactions_v2
    const { data, error } = await supabase
      .from("transactions_v2")
      .select("*")
      .eq("investor_id", investor.id)
      .eq("type", "INTEREST")
      .gte("tx_date", startDate.toISOString().split("T")[0])
      .order("tx_date", { ascending: false });

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
  async getWithdrawalRequests(): Promise<WithdrawalRequestV2[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return [];

    // Get investor record
    const { data: investor } = await supabase
      .from("investors")
      .select("id")
      .eq("profile_id", user.user.id)
      .maybeSingle();

    if (!investor) return [];

    const { data, error } = await supabase
      .from("withdrawal_requests")
      .select(
        `
        *,
        funds!inner(name, asset, fund_class)
      `
      )
      .eq("investor_id", investor.id)
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

    // Get investor record
    const { data: investor } = await supabase
      .from("investors")
      .select("id")
      .eq("profile_id", user.user.id)
      .maybeSingle();

    if (!investor) throw new Error("Investor profile not found");

    if (!investor) throw new Error("Investor profile not found");

    const { data, error } = await supabase.rpc("create_withdrawal_request", {
      p_investor_id: investor.id,
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
      .eq("status", "pending"); // Only allow cancellation of pending requests

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
  // Note: daily_rates table doesn't exist - yield_settings has different schema
  async getCurrentYieldRates(): Promise<any[]> {
    const { data, error } = await supabase
      .from("yield_settings")
      .select("id, rate_bps, frequency, effective_from");

    if (error) {
      console.warn("getCurrentYieldRates: Error fetching yield settings:", error);
      return [];
    }

    // Convert rate_bps (basis points) to annual rate percentage
    return (data || []).map((setting) => ({
      asset_symbol: "USD", // Default since no asset_code column
      asset_name: "USD Yield",
      daily_rate: (setting.rate_bps || 0) / 10000 / 365, // bps to percentage to daily
      annual_rate: (setting.rate_bps || 0) / 100, // bps to percentage
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

    // Get investor record
    const { data: investor } = await supabase
      .from("investors")
      .select("id")
      .eq("profile_id", user.user.id)
      .maybeSingle();

    if (!investor) return [];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Break type chain to avoid TS2589
    const queryBuilder: any = supabase.from("portfolio_history");
    const { data, error } = await queryBuilder
      .select("*")
      .eq("investor_id", investor.id)
      .gte("snapshot_date", startDate.toISOString().split("T")[0])
      .order("snapshot_date", { ascending: true });

    if (error) throw error;
    return data || [];
  }
}

export const investorServiceV2 = new InvestorServiceV2();
