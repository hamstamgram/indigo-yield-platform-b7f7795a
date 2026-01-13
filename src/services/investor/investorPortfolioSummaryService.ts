/**
 * Investor Portfolio Summary Service
 * Handles portfolio aggregation, summaries, and performance metrics
 * Split from investorDataService.ts for better modularity
 */

import { supabase } from "@/integrations/supabase/client";
import { getInvestorPositions, type InvestorPositionDetail } from "./investorPositionService";

// ============================================
// Types
// ============================================

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

// ============================================
// Summary Functions
// ============================================

/**
 * Get investor summary with consolidated data
 */
export async function getInvestorSummary(investorId: string): Promise<InvestorSummary | null> {
  // Get investor profile from PROFILES table (unified ID)
  const { data: investor, error: investorError } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, status, onboarding_date, created_at")
    .eq("id", investorId)
    .maybeSingle();

  if (investorError) {
    console.error("Error fetching investor:", investorError);
    throw investorError;
  }

  if (!investor) return null;

  // Get positions to calculate totals
  const positions = await getInvestorPositions(investorId);

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
}

/**
 * Get detailed investor portfolio with performance metrics
 */
export async function getInvestorPortfolio(investorId?: string): Promise<InvestorPortfolio | null> {
  const id = investorId || (await supabase.auth.getUser()).data.user?.id;
  if (!id) return null;

  const summary = await getInvestorSummary(id);
  if (!summary) return null;

  const positions = await getInvestorPositions(id);

  // Calculate performance metrics (simplified for now)
  const totalValue = summary.totalAUM;
  const totalPnL = summary.totalEarned;

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
 * Get all investors with their position summaries
 * OPTIMIZED: Uses batch queries to avoid N+1 pattern
 */
export async function getAllInvestorsWithSummary(): Promise<InvestorSummary[]> {
  // Step 1: Get all investors including system accounts (like INDIGO FEES)
  const { data: investors, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, status, onboarding_date, created_at, account_type")
    .eq("is_admin", false)
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
}
