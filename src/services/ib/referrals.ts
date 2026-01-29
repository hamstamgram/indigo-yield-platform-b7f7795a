/**
 * IB Referrals Service
 * Handles IB referral queries and available IB parent lookups
 */

import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";

// ============ Types ============

export interface IBReferral {
  id: string;
  emailMasked: string | null;
  firstName: string | null;
  lastName: string | null;
  ibPercentage: number;
}

export interface AvailableIBParent {
  id: string;
  emailMasked: string | null;
  name: string;
}

// ============ Functions ============

/**
 * Get all investors that have this investor as their IB parent
 */
export async function getIBReferrals(ibInvestorId: string): Promise<IBReferral[]> {
  const { data, error } = await supabase.rpc("get_ib_referrals", {
    p_ib_id: ibInvestorId,
    p_limit: 1000,
    p_offset: 0,
  });

  if (error) {
    logError("ib.getIBReferrals", error, { ibInvestorId });
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    emailMasked: row.email_masked,
    firstName: row.first_name,
    lastName: row.last_name,
    ibPercentage: Number(row.ib_percentage || 0),
  }));
}

/**
 * Get all investors who can be IB parents (must have IB role, excluding the investor themselves)
 */
export async function getAvailableIBParents(investorId: string): Promise<AvailableIBParent[]> {
  const { data, error } = await supabase.rpc("get_ib_parent_candidates", {
    p_exclude_id: investorId,
  });

  if (error) {
    logError("ib.getAvailableIBParents.profiles", error, { investorId });
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    emailMasked: row.email_masked,
    name: `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.email_masked,
  }));
}
