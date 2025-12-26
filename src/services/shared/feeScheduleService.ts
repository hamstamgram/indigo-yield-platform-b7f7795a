import { supabase } from "@/integrations/supabase/client";

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
      console.error("getInvestorFeeSchedule", error);
      return [];
    }

    return (data || []).map((row: any) => ({
      fund_code: row.funds?.code || row.fund_id,
      fee_pct: Number(row.fee_pct || 0),
      effective_date: row.effective_date as string,
    }));
  }

  /**
   * Get fee history for an investor
   */
  async getInvestorFeeHistory(investorId: string, limit = 50): Promise<FeeHistoryRow[]> {
    const { data, error } = await supabase
      .from("fee_calculations")
      .select("id, fee_type, calculation_date, fee_amount")
      .eq("investor_id", investorId)
      .order("calculation_date", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data as FeeHistoryRow[]) || [];
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

    const today = new Date().toISOString().split("T")[0];

    for (const fundId of fundIds) {
      const { error } = await supabase.from("investor_fee_schedule").upsert(
        {
          investor_id: investorId,
          fund_id: fundId,
          fee_pct: newRatePct,
          effective_date: today,
        },
        { onConflict: "investor_id,fund_id,effective_date" }
      );
      if (error) throw error;
    }
  }
}

export const feeScheduleService = new FeeScheduleService();
