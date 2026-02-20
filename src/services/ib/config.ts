/**
 * IB Config Service
 * Handles IB configuration CRUD operations for investors
 */

import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";

// ============ Types ============

export interface IBConfig {
  investorId: string;
  ibParentId: string | null;
  ibPercentage: number;
  ibCommissionSource: "manual" | "investor_fee";
}

// ============ Functions ============

/**
 * Get IB configuration for an investor
 */
export async function getInvestorIBConfig(investorId: string): Promise<IBConfig | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, ib_parent_id, ib_commission_source")
    .eq("id", investorId)
    .maybeSingle();

  if (error || !data) {
    logError("ib.getInvestorIBConfig", error, { investorId });
    return null;
  }

  // IB percentage now comes from ib_commission_schedule, not profiles
  // Fetch from schedule table
  const { data: schedule } = await supabase
    .from("ib_commission_schedule")
    .select("ib_percentage")
    .eq("investor_id", investorId)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    investorId: data.id,
    ibParentId: data.ib_parent_id,
    ibPercentage: schedule?.ib_percentage || 0,
    ibCommissionSource: (data.ib_commission_source as "manual" | "investor_fee") || "manual",
  };
}

/**
 * Update IB configuration for an investor
 */
export async function updateInvestorIBConfig(
  investorId: string,
  ibParentId: string | null,
  ibPercentage: number,
  ibCommissionSource: "manual" | "investor_fee" = "manual"
): Promise<{ success: boolean; error?: string }> {
  // Validate percentage
  if (ibPercentage < 0 || ibPercentage > 100) {
    return { success: false, error: "IB percentage must be between 0 and 100" };
  }

  // Prevent self-referencing
  if (ibParentId === investorId) {
    return { success: false, error: "An investor cannot be their own IB parent" };
  }

  // DEPRECATED: profiles.ib_percentage - use ib_commission_schedule instead
  // Only update ib_parent_id (and ib_commission_source for historical compatibility)
  const { error } = await supabase
    .from("profiles")
    .update({
      ib_parent_id: ibParentId,
      ib_commission_source: ibCommissionSource,
    })
    .eq("id", investorId);

  if (error) {
    logError("ib.updateInvestorIBConfig", error, { investorId });
    return { success: false, error: error.message };
  }

  return { success: true };
}
