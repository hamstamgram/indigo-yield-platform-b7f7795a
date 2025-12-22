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
    .or("current_value.gt.0,cost_basis.gt.0,shares.gt.0");

  if (error) throw error;
  return (data as InvestorPositionRow[]) || [];
}

/**
 * Fetch all investors for dropdown selectors
 * Returns non-admin profiles with basic info
 */
export async function fetchInvestorsForSelector(): Promise<{
  id: string;
  email: string;
  displayName: string;
}[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .eq("is_admin", false)
    .order("email");

  if (error) throw error;

  return (data || []).map((p) => ({
    id: p.id,
    email: p.email || "",
    displayName: p.first_name && p.last_name 
      ? `${p.first_name} ${p.last_name}` 
      : p.email || p.id,
  }));
}