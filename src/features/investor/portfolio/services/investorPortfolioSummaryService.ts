/**
 * Investor Portfolio Summary Service
 * Handles portfolio aggregation, summaries, and performance metrics
 * Split from investorDataService.ts for better modularity
 */

import { supabase } from "@/integrations/supabase/client";
import { getInvestorPositions, type InvestorPositionDetail } from "./investorPositionService";
import { logError } from "@/lib/logger";
import { parseFinancial } from "@/utils/financial";
import { batchProcess } from "@/utils/batchHelper";

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
  createdAt?: string | null;
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
    logError("getInvestorSummary", investorError, { investorId });
    throw investorError;
  }

  if (!investor) return null;

  // Get positions to calculate totals
  const positions = await getInvestorPositions(investorId);

  const totalAUM = positions
    .reduce((sum, pos) => sum.plus(parseFinancial(pos.currentValue || 0)), parseFinancial(0))
    .toNumber();
  const totalEarned = positions
    .reduce((sum, pos) => sum.plus(parseFinancial(pos.unrealizedPnl || 0)), parseFinancial(0))
    .toNumber();
  const totalPrincipal = positions
    .reduce((sum, pos) => sum.plus(parseFinancial(pos.costBasis || 0)), parseFinancial(0))
    .toNumber();

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
    createdAt: investor.created_at,
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

  const denominator = totalValue - totalPnL;
  const safePercentage = totalValue > 0 && denominator !== 0 ? (totalPnL / denominator) * 100 : 0;

  const performanceMetrics: PortfolioPerformance = {
    mtd_return: 0,
    qtd_return: 0,
    ytd_return: totalPnL,
    itd_return: totalPnL,
    mtd_percentage: 0,
    qtd_percentage: 0,
    ytd_percentage: safePercentage,
    itd_percentage: safePercentage,
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

import { rpc } from "@/lib/rpc/index";

/**
 * Get all investors with their position summaries
 * Authoritative server-side aggregation for scalability
 */
export async function getAllInvestorsWithSummary(): Promise<InvestorSummary[]> {
  const { data, error } = await rpc.callNoArgs("get_all_investors_summary");

  if (error) {
    logError("getAllInvestorsWithSummary", error);
    throw error;
  }

  const results = (data || []) as any[];

  return results.map((investor) => ({
    id: investor.id,
    name: investor.name || "Unknown",
    email: investor.email || "",
    status: investor.status || "active",
    totalAUM: Number(investor.totalAUM || 0),
    totalEarned: Number(investor.totalEarned || 0),
    totalPrincipal: Number(investor.totalPrincipal || 0),
    positionCount: investor.positionCount || 0,
    assetBreakdown: investor.assetBreakdown || {},
    onboardingDate: investor.onboardingDate,
    createdAt: investor.createdAt,
    isSystemAccount: investor.account_type === "fees_account",
  })) as InvestorSummary[];
}
