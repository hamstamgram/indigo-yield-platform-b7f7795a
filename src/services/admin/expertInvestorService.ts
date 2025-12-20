// Minimal expert investor service aligned to current schema
import { supabase } from "@/integrations/supabase/client";

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

function mapPosition(pos: any): ExpertPosition {
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
    total_earnings:
      Number(pos.realized_pnl || 0) + Number(pos.unrealized_pnl || 0),
    last_transaction_date: pos.last_transaction_date || null,
  };
}

export async function getAllInvestorsExpertSummary(): Promise<ExpertInvestor[]> {
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .limit(200);

  const { data: positions } = await supabase
    .from("investor_positions")
    .select(
      `
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
      `
    )
    .limit(2000);

  const posByInvestor = new Map<string, ExpertPosition[]>();
  (positions || []).forEach((p) => {
    if (!posByInvestor.has(p.investor_id)) posByInvestor.set(p.investor_id, []);
    posByInvestor.get(p.investor_id)!.push(mapPosition(p));
  });

  return (profiles || []).map((p) => ({
    id: p.id,
    email: p.email,
    first_name: p.first_name,
    last_name: p.last_name,
    positions: posByInvestor.get(p.id) || [],
  }));
}

export async function getInvestorExpertView(investorId: string): Promise<ExpertInvestor | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .eq("id", investorId)
    .maybeSingle();
  if (!profile) return null;

  const { data: positions } = await supabase
    .from("investor_positions")
    .select(
      `
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
      `
    )
    .eq("investor_id", investorId);

  return {
    id: profile.id,
    email: profile.email,
    first_name: profile.first_name,
    last_name: profile.last_name,
    positions: (positions || []).map(mapPosition),
  };
}

export async function updatePositionValue(
  investorId: string,
  fundId: string,
  newValue: number
): Promise<boolean> {
  const { error } = await supabase
    .from("investor_positions")
    .update({ current_value: newValue, updated_at: new Date().toISOString() })
    .eq("investor_id", investorId)
    .eq("fund_id", fundId);
  return !error;
}

export const expertInvestorService = {
  getAllInvestorsExpertSummary,
  getInvestorExpertView,
  updatePositionValue,
};
