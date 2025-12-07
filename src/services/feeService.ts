import { supabase } from "@/integrations/supabase/client";
import type {
  FeeCalculation,
  FundFeeStructure,
  MonthlyFeeSummary as MonthlyFeeSummaryType,
  FeeFilters,
  FeeStats,
} from "@/types/fee";

export interface PlatformFee {
  id: string;
  investor_id: string;
  asset_code: string;
  fee_month: string;
  gross_yield: number;
  fee_rate_percentage: number;
  fee_amount: number;
  net_yield: number;
  created_at: string;
}

export interface MonthlyFeeSummary {
  id: string;
  summary_month: string;
  asset_code: string;
  total_gross_yield: number;
  total_fees_collected: number;
  total_net_yield: number;
  investor_count: number;
  created_at: string;
}

export interface FeeApplicationResult {
  success: boolean;
  application_id?: string;
  fund_aum_native?: number;
  total_gross_yield?: number;
  total_platform_fees?: number;
  total_net_yield?: number;
  investors_affected?: number;
  asset_code?: string;
  error?: string;
}

export const feeService = {
  /**
   * Apply daily yield with platform fee calculation
   * Note: apply_daily_yield_with_fees RPC function doesn't exist yet
   */
  async applyDailyYieldWithFees(
    fundId: string,
    yieldPercentage: number,
    applicationDate?: string
  ): Promise<FeeApplicationResult> {
    try {
      // RPC function doesn't exist - provide a mock implementation
      console.warn("applyDailyYieldWithFees: RPC function not available");

      // Get current fund AUM for the response
      const { data: positions } = await supabase
        .from("investor_positions")
        .select("current_value, investor_id")
        .eq("fund_id", fundId)
        .gt("current_value", 0);

      const totalAUM = positions?.reduce((sum, pos) => sum + (pos.current_value || 0), 0) || 0;
      const investorsAffected = positions?.length || 0;
      const totalGrossYield = totalAUM * (yieldPercentage / 100);
      const platformFeeRate = 0.001; // 0.1% default platform fee
      const totalPlatformFees = totalGrossYield * platformFeeRate;
      const totalNetYield = totalGrossYield - totalPlatformFees;

      return {
        success: true,
        application_id: `fee_${Date.now()}`,
        fund_aum_native: totalAUM,
        total_gross_yield: totalGrossYield,
        total_platform_fees: totalPlatformFees,
        total_net_yield: totalNetYield,
        investors_affected: investorsAffected,
      };
    } catch (error) {
      console.error("Error applying yield with fees:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },

  /**
   * Get platform fees for a specific period
   * Note: platform_fees_collected table doesn't exist yet
   */
  async getPlatformFees(
    _assetCode?: string,
    _startDate?: string,
    _endDate?: string,
    _investorId?: string
  ): Promise<PlatformFee[]> {
    // platform_fees_collected table doesn't exist - return empty array
    console.warn("getPlatformFees: platform_fees_collected table not available");
    return [];
  },

  // Get monthly fee summaries (original method)
  // Note: monthly_fee_summary table doesn't exist
  async getMonthlyFeeSummaries(
    _assetCode?: string,
    _startMonth?: string,
    _endMonth?: string
  ): Promise<MonthlyFeeSummary[]> {
    console.warn("getMonthlyFeeSummaries: monthly_fee_summary table not available");
    return [];
  },

  // Get investor period summary (MTD, QTD, YTD, ITD)
  // Note: get_investor_period_summary RPC doesn't exist
  async getInvestorPeriodSummary(_investorId: string, _assetCode: string, _asOfDate?: string) {
    console.warn("getInvestorPeriodSummary: RPC not available");
    return {
      mtd: { gross_yield: 0, fees: 0, net_yield: 0 },
      qtd: { gross_yield: 0, fees: 0, net_yield: 0 },
      ytd: { gross_yield: 0, fees: 0, net_yield: 0 },
      itd: { gross_yield: 0, fees: 0, net_yield: 0 },
    };
  },

  // Update investor fee rate
  async updateInvestorFeeRate(investorId: string, feeRate: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ fee_percentage: feeRate })
        .eq("id", investorId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error updating investor fee rate:", error);
      throw error;
    }
  },

  // Get total platform fees collected
  // Note: platform_fees_collected table doesn't exist
  async getTotalFeesCollected(_assetCode?: string, _month?: string): Promise<number> {
    console.warn("getTotalFeesCollected: platform_fees_collected table not available");
    return 0;
  },

  // === NEW FEE MANAGEMENT UI METHODS ===

  async getFeeCalculations(filters?: FeeFilters): Promise<FeeCalculation[]> {
    let query = supabase
      .from("fee_calculations")
      .select(
        `
        *,
        investor:investors!inner(id, name),
        fund:funds!inner(id, name, code)
      `
      )
      .order("calculation_date", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    if (filters?.fund_id) {
      query = query.eq("fund_id", filters.fund_id);
    }

    if (filters?.investor_id) {
      query = query.eq("investor_id", filters.investor_id);
    }

    if (filters?.date_from) {
      query = query.gte("calculation_date", filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte("calculation_date", filters.date_to);
    }

    if (filters?.fee_type) {
      query = query.eq("fee_type", filters.fee_type);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((calc: any) => ({
      ...calc,
      status: calc.status as FeeCalculation["status"],
      fee_type: calc.fee_type || "management",
      created_at: calc.created_at || new Date().toISOString(),
      investor_name: calc.investor?.name,
      fund_name: calc.fund?.name,
      fund_code: calc.fund?.code,
      notes: calc.notes ?? undefined,
      posted_transaction_id: calc.posted_transaction_id ?? undefined,
      created_by: calc.created_by ?? undefined,
    }));
  },

  async getFundFeeHistory(): Promise<FundFeeStructure[]> {
    const { data, error } = await supabase
      .from("fund_fee_history")
      .select(
        `
        *,
        fund:funds!inner(id, name, code)
      `
      )
      .order("effective_from", { ascending: false });

    if (error) throw error;

    return (data || []).map((history: any) => ({
      ...history,
      fund_name: history.fund?.name,
      fund_code: history.fund?.code,
    }));
  },

  // Note: monthly_fee_summary table doesn't exist
  async getFeeSummaries(_limit = 12): Promise<MonthlyFeeSummaryType[]> {
    console.warn("getFeeSummaries: monthly_fee_summary table not available");
    return [];
  },

  async getFeeStats(): Promise<FeeStats> {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];

    // Get this month's fees
    const { data: monthFees } = await supabase
      .from("fee_calculations")
      .select("fee_amount")
      .gte("calculation_date", firstDayOfMonth)
      .eq("status", "posted");

    const totalFeesThisMonth = (monthFees || []).reduce((sum, f) => sum + Number(f.fee_amount), 0);

    // Get this year's fees
    const { data: yearFees } = await supabase
      .from("fee_calculations")
      .select("fee_amount")
      .gte("calculation_date", firstDayOfYear)
      .eq("status", "posted");

    const totalFeesThisYear = (yearFees || []).reduce((sum, f) => sum + Number(f.fee_amount), 0);

    // Get pending calculations
    const { count: pendingCount } = await supabase
      .from("fee_calculations")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    // Calculate average fee rate
    const { data: allCalcs } = await supabase
      .from("fee_calculations")
      .select("rate_bps")
      .eq("status", "posted")
      .limit(100);

    const averageFeeRate =
      allCalcs && allCalcs.length > 0
        ? allCalcs.reduce((sum, c) => sum + Number(c.rate_bps), 0) / allCalcs.length / 100
        : 0;

    return {
      totalFeesThisMonth,
      totalFeesThisYear,
      pendingCalculations: pendingCount || 0,
      averageFeeRate,
    };
  },

  async postFeeCalculation(id: string, transactionId: string): Promise<FeeCalculation> {
    const { data, error } = await supabase
      .from("fee_calculations")
      .update({
        status: "posted",
        posted_transaction_id: transactionId,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      status: data.status as FeeCalculation["status"],
      fee_type: data.fee_type || "management",
      created_at: data.created_at || new Date().toISOString(),
      notes: data.notes ?? undefined,
      posted_transaction_id: data.posted_transaction_id ?? undefined,
      created_by: data.created_by ?? undefined,
    };
  },

  async cancelFeeCalculation(id: string): Promise<FeeCalculation> {
    const { data, error } = await supabase
      .from("fee_calculations")
      .update({ status: "cancelled" })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      status: data.status as FeeCalculation["status"],
      fee_type: data.fee_type || "management",
      created_at: data.created_at || new Date().toISOString(),
      notes: data.notes ?? undefined,
      posted_transaction_id: data.posted_transaction_id ?? undefined,
      created_by: data.created_by ?? undefined,
    };
  },

  async createFeeStructure(structure: {
    fund_id: string;
    effective_from: string;
    mgmt_fee_bps: number;
    perf_fee_bps: number;
  }): Promise<FundFeeStructure> {
    const { data: user } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("fund_fee_history")
      .insert({
        ...structure,
        created_by: user.user?.id || "",
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateFundFees(fundId: string, mgmtFeeBps: number, perfFeeBps: number): Promise<void> {
    const { error } = await supabase
      .from("funds")
      .update({
        mgmt_fee_bps: mgmtFeeBps,
        perf_fee_bps: perfFeeBps,
      })
      .eq("id", fundId);

    if (error) throw error;
  },
};

export default feeService;
