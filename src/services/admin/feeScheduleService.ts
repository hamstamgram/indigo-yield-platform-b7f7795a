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

class FeeScheduleService {
  /**
   * Get fee schedule for an investor
   */
  async getInvestorFeeSchedule(investorId: string): Promise<FeeScheduleRow[]> {
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

  /**
   * Get fee history for an investor from fee_allocations
   */
  async getInvestorFeeHistory(investorId: string, limit = 50): Promise<FeeHistoryRow[]> {
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

  /**
   * Update fee rate for all investor positions
   */
  async updateFeeRateForAllFunds(
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

  /**
   * Add a new fee schedule entry
   */
  async addFeeEntry(params: {
    investorId: string;
    fundId: string | null;
    feePct: number;
    effectiveDate: string;
  }): Promise<void> {
    const result = await db.insert("investor_fee_schedule", {
      investor_id: params.investorId,
      fund_id: params.fundId,
      fee_pct: params.feePct,
      effective_date: params.effectiveDate,
    });

    if (result.error) {
      throw new Error(result.error.userMessage);
    }
  }

  /**
   * Delete a fee schedule entry
   */
  async deleteFeeEntry(entryId: string): Promise<void> {
    const result = await db.delete("investor_fee_schedule", { column: "id", value: entryId });

    if (result.error) {
      throw new Error(result.error.userMessage);
    }
  }

  /**
   * Get fee schedule with fund info
   */
  async getFeeScheduleWithFunds(investorId: string): Promise<
    Array<{
      id: string;
      investor_id: string;
      fund_id: string | null;
      fee_pct: number;
      effective_date: string;
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
}

export const feeScheduleService = new FeeScheduleService();
