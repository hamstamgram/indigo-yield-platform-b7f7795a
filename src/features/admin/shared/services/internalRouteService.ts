/**
 * Internal Route Service
 * Handles internal routing of funds to INDIGO FEES account
 */

import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc/index";

export interface InvestorPositionForRoute {
  fund_id: string;
  current_value: number;
  funds: {
    id: string;
    name: string;
    asset: string;
  } | null;
}

export interface InternalRouteParams {
  fromInvestorId: string;
  fundId: string;
  amount: number;
  effectiveDate: string;
  reason: string;
}

export interface InternalRouteResult {
  success: boolean;
  message?: string;
  transfer_id: string;
  debit_tx_id: string;
  credit_tx_id: string;
}

/**
 * Fetch investor positions for internal routing
 */
export async function fetchInvestorPositionsForRoute(
  investorId: string
): Promise<InvestorPositionForRoute[]> {
  const { data, error } = await supabase
    .from("investor_positions")
    .select(
      `
      fund_id,
      current_value,
      funds!fk_investor_positions_fund_id ( id, name, asset )
    `
    )
    .eq("investor_id", investorId)
    .gt("current_value", 0);

  if (error) throw error;
  return data || [];
}

/**
 * Execute internal route to INDIGO FEES account
 */
export async function executeInternalRoute(
  params: InternalRouteParams
): Promise<InternalRouteResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await rpc.call("internal_route_to_fees", {
    p_from_investor_id: params.fromInvestorId,
    p_fund_id: params.fundId,
    p_amount: params.amount,
    p_effective_date: params.effectiveDate,
    p_reason: params.reason,
    p_admin_id: user.id,
  });

  if (error) throw error;

  const row = data?.[0];
  if (!row?.success) {
    throw new Error(row?.message || "Internal routing failed");
  }

  return row;
}

export const internalRouteService = {
  fetchInvestorPositionsForRoute,
  executeInternalRoute,
};
