/**
 * Investor Position Service
 * Handles position queries, position summaries, and investor listings
 * Split from investorDataService.ts for better modularity
 */

import { supabase } from "@/integrations/supabase/client";

// ============================================
// Types
// ============================================

export interface InvestorPositionRow {
  investor_id: string;
  fund_id: string;
  shares: number;
  cost_basis: number;
  current_value: number;
  realized_pnl: number;
  fund_class: string;
  updated_at: string;
  funds: {
    id: string;
    name: string;
    asset: string;
  } | null;
}

export interface ExpertPosition {
  id: string;
  investor_id: string;
  fund_id: string;
  fund_name: string;
  fund_code: string;
  asset: string;
  fund_class: string | null;
  shares: number;
  cost_basis: number;
  current_value: number;
  total_earnings: number;
  last_transaction_date: string | null;
}

export interface ExpertInvestor {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  positions: ExpertPosition[];
}

export interface InvestorSelectorItem {
  id: string;
  email: string;
  displayName: string;
  isSystemAccount?: boolean;
}

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
  allocationPercentage?: number;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Helper to map raw position to ExpertPosition
 */
function mapPositionToExpert(pos: any): ExpertPosition {
  const fund = pos.funds || {};
  return {
    id: `${pos.investor_id}:${pos.fund_id}`,
    investor_id: pos.investor_id,
    fund_id: pos.fund_id,
    fund_name: fund.name || "Unknown Fund",
    fund_code: fund.code || fund.id || "",
    asset: fund.asset || "UNKNOWN",
    fund_class: pos.fund_class || fund.fund_class || null,
    shares: Number(pos.shares || 0),
    cost_basis: Number(pos.cost_basis || 0),
    current_value: Number(pos.current_value || 0),
    total_earnings: Number(pos.realized_pnl || 0) + Number(pos.unrealized_pnl || 0),
    last_transaction_date: pos.last_transaction_date || null,
  };
}

// ============================================
// Position Query Functions
// ============================================

/**
 * Get investor positions from the new structure
 */
export async function getInvestorPositions(investorId: string): Promise<InvestorPositionDetail[]> {
  const { data: fundPositions, error } = await supabase
    .from("investor_positions")
    .select(
      `
      investor_id,
      fund_id,
      fund_class,
      shares,
      cost_basis,
      current_value,
      unrealized_pnl,
      realized_pnl,
      last_transaction_date,
      updated_at,
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
    allocationPercentage: totalValue > 0 ? (Number(fp.current_value) / totalValue) * 100 : 0,
  }));
}

/**
 * Get user's own positions (for investor dashboard)
 */
export async function getUserPositions(userId: string): Promise<InvestorPositionDetail[]> {
  return getInvestorPositions(userId);
}

/**
 * Fetch investor positions with fund details
 * Filters out zero-value positions (deleted or fully withdrawn)
 */
export async function fetchInvestorPositions(investorId: string): Promise<InvestorPositionRow[]> {
  const { data, error } = await supabase
    .from("investor_positions")
    .select(`
      investor_id,
      fund_id,
      shares,
      cost_basis,
      current_value,
      realized_pnl,
      fund_class,
      updated_at,
      funds!fk_investor_positions_fund ( id, name, asset )
    `)
    .eq("investor_id", investorId)
    .or("current_value.neq.0,cost_basis.neq.0,shares.neq.0");

  if (error) throw error;
  return (data as InvestorPositionRow[]) || [];
}

/**
 * Calculate total AUM across all investors
 */
export async function getTotalAUM(): Promise<number> {
  const { data, error } = await supabase.from("investor_positions").select("current_value");

  if (error) throw error;

  return data?.reduce((sum, pos) => sum + Number(pos.current_value), 0) || 0;
}

/**
 * Get investor count with active positions
 */
export async function getActiveInvestorCount(): Promise<number> {
  const { data, error } = await supabase
    .from("investor_positions")
    .select("investor_id")
    .gt("current_value", 0);

  if (error) throw error;

  const uniqueInvestors = new Set(data?.map((pos) => pos.investor_id));
  return uniqueInvestors.size;
}

// ============================================
// Investor Selector Functions
// ============================================

/**
 * Fetch all investors for dropdown selectors
 * Returns non-admin profiles with basic info
 */
export async function fetchInvestorsForSelector(includeSystemAccounts = true): Promise<InvestorSelectorItem[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, account_type")
    .eq("is_admin", false)
    .order("email");

  if (error) throw error;

  return (data || [])
    .filter(p => {
      if (p.account_type !== 'fees_account') return true;
      return includeSystemAccounts;
    })
    .map((p) => ({
      id: p.id,
      email: p.email || "",
      displayName: p.first_name && p.last_name 
        ? `${p.first_name} ${p.last_name}` 
        : p.email || p.id,
      isSystemAccount: p.account_type === 'fees_account',
    }));
}

/**
 * Fetch all non-admin investors
 */
export async function fetchInvestors(): Promise<{
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  fee_percentage?: number;
  portfolio_summary?: Record<string, { balance: number; usd_value: number }>;
}[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, created_at, fee_pct")
    .eq("is_admin", false);

  if (error) throw new Error(`Failed to fetch investors: ${error.message}`);

  return (data || []).map((profile) => ({
    id: profile.id || "",
    email: profile.email || "",
    first_name: profile.first_name || null,
    last_name: profile.last_name || null,
    created_at: profile.created_at || new Date().toISOString(),
    fee_percentage: profile.fee_pct || 20.0,
    portfolio_summary: {},
  }));
}

/**
 * Fetch pending invites
 */
export async function fetchPendingInvites(): Promise<{
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
}[]> {
  const { data, error } = await supabase
    .from("admin_invites")
    .select("email, created_at")
    .eq("used", false);

  if (error) {
    console.error("Error fetching invites:", error);
    return [];
  }

  return (data || []).map((invite) => ({
    id: "",
    email: invite.email,
    first_name: null,
    last_name: null,
    created_at: invite.created_at || new Date().toISOString(),
  }));
}

// ============================================
// Expert View Functions
// ============================================

/**
 * Get all investors with expert summary including positions
 */
export async function getAllInvestorsExpertSummary(): Promise<ExpertInvestor[]> {
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .limit(200);

  const { data: positions } = await supabase
    .from("investor_positions")
    .select(`
      investor_id,
      fund_id,
      fund_class,
      current_value,
      shares,
      cost_basis,
      realized_pnl,
      unrealized_pnl,
      last_transaction_date,
      funds (
        id,
        code,
        name,
        asset,
        fund_class
      )
    `)
    .limit(2000);

  const posByInvestor = new Map<string, ExpertPosition[]>();
  (positions || []).forEach((p) => {
    if (!posByInvestor.has(p.investor_id)) posByInvestor.set(p.investor_id, []);
    posByInvestor.get(p.investor_id)!.push(mapPositionToExpert(p));
  });

  return (profiles || []).map((p) => ({
    id: p.id,
    email: p.email,
    first_name: p.first_name,
    last_name: p.last_name,
    positions: posByInvestor.get(p.id) || [],
  }));
}

/**
 * Get single investor expert view with positions
 */
export async function getInvestorExpertView(investorId: string): Promise<ExpertInvestor | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .eq("id", investorId)
    .maybeSingle();
  if (!profile) return null;

  const { data: positions } = await supabase
    .from("investor_positions")
    .select(`
      investor_id,
      fund_id,
      fund_class,
      current_value,
      shares,
      cost_basis,
      realized_pnl,
      unrealized_pnl,
      last_transaction_date,
      funds (
        id,
        code,
        name,
        asset,
        fund_class
      )
    `)
    .eq("investor_id", investorId);

  return {
    id: profile.id,
    email: profile.email,
    first_name: profile.first_name,
    last_name: profile.last_name,
    positions: (positions || []).map(mapPositionToExpert),
  };
}

/**
 * Update a position's current value - DISABLED
 */
export async function updatePositionValue(
  investorId: string,
  fundId: string,
  newValue: number
): Promise<boolean> {
  void investorId;
  void fundId;
  void newValue;
  throw new Error(
    "Direct updates to investor_positions are disabled. Positions are derived from SUM(transactions_v2) via recompute triggers."
  );
}

/**
 * Check if current user is admin
 */
export async function checkAdminStatus(): Promise<{ isAdmin: boolean | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { isAdmin: false };

  const { data: profileData, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Error checking admin status:", error);
    return { isAdmin: false };
  }

  return { isAdmin: profileData?.is_admin === true };
}

/**
 * Expert investor service object (for backward compatibility)
 */
export const expertInvestorService = {
  getAllInvestorsExpertSummary,
  getInvestorExpertView,
  updatePositionValue,
};
