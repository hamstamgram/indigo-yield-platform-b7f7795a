/**
 * Investor Position Service
 * Handles fetching and managing investor positions
 */

import { supabase } from "@/integrations/supabase/client";

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

/**
 * Fetch investor positions with fund details
 * Filters out zero-value positions (deleted or fully withdrawn)
 */
export async function fetchInvestorPositions(investorId: string): Promise<InvestorPositionRow[]> {
  const { data, error } = await supabase
    .from("investor_positions")
    .select(
      `
      investor_id,
      fund_id,
      shares,
      cost_basis,
      current_value,
      realized_pnl,
      fund_class,
      updated_at,
      funds ( id, name, asset )
    `
    )
    .eq("investor_id", investorId)
    // Filter out zero-value positions (deleted or fully withdrawn)
    // Include negative values (debt/overdraft) by checking neq.0
    .or("current_value.neq.0,cost_basis.neq.0,shares.neq.0");

  if (error) throw error;
  return (data as InvestorPositionRow[]) || [];
}

/**
 * Fetch all investors for dropdown selectors
 * Returns non-admin profiles with basic info
 * Includes system accounts (like INDIGO FEES) for admin visibility
 */
export async function fetchInvestorsForSelector(includeSystemAccounts = true): Promise<{
  id: string;
  email: string;
  displayName: string;
  isSystemAccount?: boolean;
}[]> {
  let query = supabase
    .from("profiles")
    .select("id, email, first_name, last_name, account_type")
    .eq("is_admin", false)
    .order("email");

  const { data, error } = await query;

  if (error) throw error;

  return (data || [])
    .filter(p => {
      // Always include regular investors
      if (p.account_type !== 'fees_account') return true;
      // Only include system accounts if requested
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