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

  // 1. Update ib_parent_id and commission source in profiles
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      ib_parent_id: ibParentId,
      ib_commission_source: ibCommissionSource,
    })
    .eq("id", investorId);

  if (profileError) {
    logError("ib.updateInvestorIBConfig.profile", profileError, { investorId });
    return { success: false, error: profileError.message };
  }

  // 2. Persist IB percentage to schedule table
  const today = new Date().toISOString().slice(0, 10);
  const { error: scheduleError } = await supabase.from("ib_commission_schedule").upsert(
    {
      investor_id: investorId,
      ib_percentage: ibPercentage,
      effective_date: today,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "investor_id,effective_date" }
  );

  if (scheduleError) {
    logError("ib.updateInvestorIBConfig.schedule", scheduleError, { investorId });
    // Still return success if profile was updated, or should we treat as failure?
    // Given the new architecture, the schedule is critical, so we fail.
    return {
      success: false,
      error: `Failed to update commission schedule: ${scheduleError.message}`,
    };
  }

  return { success: true };
}
