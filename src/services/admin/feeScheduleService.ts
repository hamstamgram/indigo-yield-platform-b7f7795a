import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db/index";
import { getTodayString } from "@/utils/dateUtils";
import { logError } from "@/lib/logger";

export interface FeeScheduleRow {
  fund_code: string;
  fee_pct: number;
  effective_date: string;
}

export interface FeeHistoryRow {
  id: string;
  fee_type: string | null;
  calculation_date: string;
  fee_amount: number;
}

export async function getInvestorFeeSchedule(investorId: string): Promise<FeeScheduleRow[]> {
  const { data, error } = await supabase
    .from("investor_fee_schedule")
    .select("fee_pct, effective_date, fund_id, funds(code)")
    .eq("investor_id", investorId)
    .order("effective_date", { ascending: false });

  if (error) {
    logError("feeScheduleService.getInvestorFeeSchedule", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    fund_code: row.funds?.code || row.fund_id,
    fee_pct: Number(row.fee_pct || 0),
    effective_date: row.effective_date as string,
  }));
}

export async function getInvestorFeeHistory(
  investorId: string,
  limit = 50
): Promise<FeeHistoryRow[]> {
  const { data, error } = await supabase
    .from("fee_allocations")
    .select("id, purpose, period_end, fee_amount")
    .eq("investor_id", investorId)
    .eq("is_voided", false)
    .order("period_end", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    fee_type: row.purpose,
    calculation_date: row.period_end,
    fee_amount: row.fee_amount,
  }));
}

export async function updateFeeRateForAllFunds(
  investorId: string,
  fundIds: string[],
  newRatePct: number
): Promise<void> {
  if (isNaN(newRatePct) || newRatePct < 0 || newRatePct > 100) {
    throw new Error("Invalid fee rate. Must be between 0% and 100%");
  }

  const today = getTodayString();

  for (const fundId of fundIds) {
    const result = await db.upsert(
      "investor_fee_schedule",
      {
        investor_id: investorId,
        fund_id: fundId,
        fee_pct: newRatePct,
        effective_date: today,
      },
      { onConflict: "investor_id,fund_id,effective_date" }
    );
    if (result.error) {
      throw new Error(result.error.userMessage);
    }
  }
}

export async function addFeeEntry(params: {
  investorId: string;
  fundId: string | null;
  feePct: number;
  effectiveDate: string;
  endDate?: string | null;
}): Promise<void> {
  const result = await db.insert("investor_fee_schedule", {
    investor_id: params.investorId,
    fund_id: params.fundId,
    fee_pct: params.feePct,
    effective_date: params.effectiveDate,
    ...(params.endDate ? { end_date: params.endDate } : {}),
  });

  if (result.error) {
    throw new Error(result.error.userMessage);
  }
}

export async function deleteFeeEntry(entryId: string): Promise<void> {
  const result = await db.delete("investor_fee_schedule", { column: "id", value: entryId });

  if (result.error) {
    throw new Error(result.error.userMessage);
  }
}

export async function getFeeScheduleWithFunds(investorId: string): Promise<
  Array<{
    id: string;
    investor_id: string;
    fund_id: string | null;
    fee_pct: number;
    effective_date: string;
    end_date?: string | null;
    fund?: { name: string } | null;
  }>
> {
  const { data, error } = await supabase
    .from("investor_fee_schedule")
    .select("*, fund:funds(name)")
    .eq("investor_id", investorId)
    .order("effective_date", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Upsert global fee (fund_id=NULL) for an investor.
 * This replaces the old profiles.fee_pct column.
 */
export async function upsertGlobalFee(investorId: string, feePct: number): Promise<void> {
  if (isNaN(feePct) || feePct < 0 || feePct > 100) {
    throw new Error("Invalid fee rate. Must be between 0% and 100%");
  }

  // Find existing global entry (fund_id IS NULL)
  const { data: existing } = await supabase
    .from("investor_fee_schedule")
    .select("id")
    .eq("investor_id", investorId)
    .is("fund_id", null)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Update existing global entry
    const { error } = await supabase
      .from("investor_fee_schedule")
      .update({ fee_pct: feePct, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    // Create new global entry
    const result = await db.insert("investor_fee_schedule", {
      investor_id: investorId,
      fund_id: null,
      fee_pct: feePct,
      effective_date: "2024-01-01",
    });
    if (result.error) throw new Error(result.error.userMessage);
  }
}

/**
 * Get global fee (fund_id=NULL) for an investor.
 * Returns null if no global fee is set.
 */
export async function getGlobalFee(investorId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from("investor_fee_schedule")
    .select("fee_pct")
    .eq("investor_id", investorId)
    .is("fund_id", null)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logError("feeScheduleService.getGlobalFee", error);
    return null;
  }
  return data ? Number(data.fee_pct) : null;
}

// Plain object singleton for feeScheduleService.method() pattern
export const feeScheduleService = {
  getInvestorFeeSchedule,
  getInvestorFeeHistory,
  updateFeeRateForAllFunds,
  addFeeEntry,
  deleteFeeEntry,
  getFeeScheduleWithFunds,
  upsertGlobalFee,
  getGlobalFee,
};
