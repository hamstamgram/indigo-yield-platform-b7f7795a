/**
 * Investor Detail Service
 * Handles data fetching for investor management page
 */

import { supabase } from "@/integrations/supabase/client";

export interface InvestorDetailData {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  created_at: string | null;
  profile_id: string;
  phone: string | null;
  ib_parent_id: string | null;
}

export interface OpsIndicators {
  lastActivityDate: string | null;
  lastReportPeriod: string | null;
  pendingWithdrawals: number;
  ibParentName: string | null;
  hasFeeSchedule: boolean;
}

/**
 * Fetch investor details by ID
 */
export async function fetchInvestorDetail(investorId: string): Promise<InvestorDetailData | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", investorId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const fullName = `${data.first_name || ""} ${data.last_name || ""}`.trim();

  return {
    id: data.id,
    name: fullName,
    firstName: data.first_name || "",
    lastName: data.last_name || "",
    email: data.email,
    status: data.status || "active",
    created_at: data.created_at,
    profile_id: data.id,
    phone: data.phone || null,
    ib_parent_id: data.ib_parent_id || null,
  };
}

/**
 * Load operational indicators for an investor
 */
export async function loadOpsIndicators(
  investorId: string,
  ibParentId: string | null
): Promise<OpsIndicators> {
  // Fetch last transaction
  const { data: lastTx } = await supabase
    .from("transactions_v2")
    .select("tx_date")
    .eq("investor_id", investorId)
    .order("tx_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch pending withdrawals
  const { count: pendingCount } = await supabase
    .from("withdrawal_requests")
    .select("id", { count: "exact", head: true })
    .eq("investor_id", investorId)
    .eq("status", "pending");

  // Fetch last report
  const { data: lastReport } = await supabase
    .from("generated_statements")
    .select("period_id")
    .eq("investor_id", investorId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch IB parent name
  let ibParentName: string | null = null;
  if (ibParentId) {
    const { data: parentProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", ibParentId)
      .maybeSingle();
    if (parentProfile) {
      ibParentName = [parentProfile.first_name, parentProfile.last_name]
        .filter(Boolean)
        .join(" ") || null;
    }
  }

  // Check fee schedule
  const { data: feeSchedule } = await supabase
    .from("investor_fee_schedule")
    .select("id")
    .eq("investor_id", investorId)
    .limit(1);

  return {
    lastActivityDate: lastTx?.tx_date || null,
    lastReportPeriod: lastReport?.period_id || null,
    pendingWithdrawals: pendingCount || 0,
    ibParentName,
    hasFeeSchedule: (feeSchedule?.length || 0) > 0,
  };
}

export const investorDetailService = {
  fetchInvestorDetail,
  loadOpsIndicators,
};
