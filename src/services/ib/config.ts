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
}

// ============ Functions ============

/**
 * Get IB configuration for an investor
 */
export async function getInvestorIBConfig(investorId: string): Promise<IBConfig | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, ib_parent_id, ib_percentage")
    .eq("id", investorId)
    .maybeSingle();

  if (error || !data) {
    logError("ib.getInvestorIBConfig", error, { investorId });
    return null;
  }

  return {
    investorId: data.id,
    ibParentId: data.ib_parent_id,
    ibPercentage: data.ib_percentage || 0,
  };
}

/**
 * Update IB configuration for an investor
 */
export async function updateInvestorIBConfig(
  investorId: string,
  ibParentId: string | null,
  ibPercentage: number
): Promise<{ success: boolean; error?: string }> {
  // Validate percentage
  if (ibPercentage < 0 || ibPercentage > 100) {
    return { success: false, error: "IB percentage must be between 0 and 100" };
  }

  // Prevent self-referencing
  if (ibParentId === investorId) {
    return { success: false, error: "An investor cannot be their own IB parent" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      ib_parent_id: ibParentId,
      ib_percentage: ibPercentage,
    })
    .eq("id", investorId);

  if (error) {
    logError("ib.updateInvestorIBConfig", error, { investorId });
    return { success: false, error: error.message };
  }

  return { success: true };
}
