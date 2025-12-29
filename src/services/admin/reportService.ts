/**
 * Report Service
 * 
 * Consolidates all Supabase operations for report generation and management.
 * This service handles:
 * - Fetching active investors for report generation
 * - Fetching statement periods
 * - Fetching investor performance data
 * - Sending investor reports via edge functions
 * - Fetching data for PDF/Excel report generation
 */

import { supabase } from "@/integrations/supabase/client";
import type { InvestorRef } from "@/types/domains/investor";

/**
 * Historical data summary statistics
 */
export interface HistoricalDataSummary {
  totalReports: number;
  latestMonth: string | null;
  earliestMonth: string | null;
  investorCount: number;
  assetCount: number;
}

/**
 * Statement period reference
 */
export interface StatementPeriodRef {
  id: string;
  period_end_date: string;
  year: number;
  month: number;
}

/**
 * Investor performance data for reports
 */
export interface InvestorPerformanceData {
  id: string;
  investor_id: string;
  period_id: string;
  fund_name: string;
  mtd_beginning_balance: number | null;
  mtd_ending_balance: number | null;
  mtd_additions: number | null;
  mtd_redemptions: number | null;
  mtd_net_income: number | null;
  mtd_rate_of_return: number | null;
  qtd_beginning_balance: number | null;
  qtd_ending_balance: number | null;
  qtd_additions: number | null;
  qtd_redemptions: number | null;
  qtd_net_income: number | null;
  qtd_rate_of_return: number | null;
  ytd_beginning_balance: number | null;
  ytd_ending_balance: number | null;
  ytd_additions: number | null;
  ytd_redemptions: number | null;
  ytd_net_income: number | null;
  ytd_rate_of_return: number | null;
  itd_beginning_balance: number | null;
  itd_ending_balance: number | null;
  itd_additions: number | null;
  itd_redemptions: number | null;
  itd_net_income: number | null;
  itd_rate_of_return: number | null;
}

/**
 * Parameters for sending investor report email
 */
export interface SendReportParams {
  to: string;
  investorName: string;
  reportMonth: string;
  htmlContent: string;
}

/**
 * Bulk template generation options
 */
export interface BulkGenerateOptions {
  startMonth: string;
  endMonth: string;
  investorIds?: string[];
  assetCodes?: string[];
}

/**
 * Result from bulk template generation
 */
export interface GenerationResult {
  success: boolean;
  generated: number;
  errors: string[];
}

/**
 * Date range for queries
 */
interface DateRange {
  start: Date;
  end: Date;
}

export const reportService = {
  // ==================
  // QUERIES
  // ==================

  /**
   * Get active investors for report generation
   */
  async getActiveInvestors(): Promise<InvestorRef[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .eq("status", "active")
      .eq("is_admin", false)
      .order("first_name");

    if (error) throw error;

    return (data || []).map((p) => ({
      id: p.id,
      name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email,
      email: p.email,
    }));
  },

  /**
   * Get statement period by year and month
   */
  async getStatementPeriod(year: number, month: number): Promise<StatementPeriodRef | null> {
    const { data, error } = await supabase
      .from("statement_periods")
      .select("id, period_end_date, year, month")
      .eq("year", year)
      .eq("month", month)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Get investor performance data for a specific period
   */
  async getInvestorPerformanceForPeriod(
    investorId: string,
    periodId: string
  ): Promise<InvestorPerformanceData[]> {
    const { data, error } = await (supabase as any)
      .from("investor_fund_performance")
      .select("*")
      .eq("investor_id", investorId)
      .eq("period_id", periodId);

    if (error) throw error;
    return data || [];
  },

  /**
   * Get historical data summary statistics
   */
  async getHistoricalDataSummary(): Promise<HistoricalDataSummary> {
    const { data: summary } = await supabase
      .from("investor_fund_performance")
      .select("fund_name, investor_id, period:statement_periods(period_end_date)");

    if (!summary || summary.length === 0) {
      return {
        totalReports: 0,
        latestMonth: null,
        earliestMonth: null,
        investorCount: 0,
        assetCount: 0,
      };
    }

    const months = summary.map((r: any) => r.period?.period_end_date).filter(Boolean).sort();
    const uniqueInvestors = new Set(summary.map((r) => r.investor_id));
    const uniqueAssets = new Set(summary.map((r) => r.fund_name));

    return {
      totalReports: summary.length,
      latestMonth: months[months.length - 1] || null,
      earliestMonth: months[0] || null,
      investorCount: uniqueInvestors.size,
      assetCount: uniqueAssets.size,
    };
  },

  /**
   * Get investor positions for report generation
   */
  async getInvestorPositions(investorId: string) {
    const { data, error } = await supabase
      .from("investor_positions")
      .select("*, funds(name, code, asset)")
      .eq("investor_id", investorId);

    if (error) throw error;
    return data || [];
  },

  /**
   * Get investor transactions for a date range
   */
  async getInvestorTransactions(investorId: string, dateRange: DateRange) {
    const { data, error } = await supabase
      .from("transactions_v2")
      .select("*")
      .eq("investor_id", investorId)
      .gte("tx_date", dateRange.start.toISOString().split("T")[0])
      .lte("tx_date", dateRange.end.toISOString().split("T")[0])
      .order("tx_date", { ascending: false })
      .order("id", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get investor performance statements for a date range
   */
  async getInvestorPerformanceStatements(investorId: string, dateRange: DateRange) {
    const { data, error } = await (supabase as any)
      .from("investor_fund_performance")
      .select(`
        *,
        period:statement_periods(period_end_date, year, month)
      `)
      .eq("investor_id", investorId)
      .gte("period.period_end_date", dateRange.start.toISOString().split("T")[0])
      .lte("period.period_end_date", dateRange.end.toISOString().split("T")[0])
      .order("period(period_end_date)", { ascending: false })
      .limit(12);

    if (error) throw error;
    return data || [];
  },

  // ==================
  // MUTATIONS
  // ==================

  /**
   * Send investor report via edge function
   */
  async sendInvestorReport(params: SendReportParams): Promise<void> {
    const { error } = await supabase.functions.invoke("send-investor-report", {
      body: params,
    });

    if (error) throw error;
  },

  /**
   * Generate missing historical templates
   */
  async generateMissingTemplates(options: BulkGenerateOptions): Promise<GenerationResult> {
    const { startMonth, endMonth, investorIds, assetCodes } = options;

    // Get all investors if not specified
    let investors = investorIds;
    if (!investors) {
      const { data: investorData } = await supabase
        .from("profiles")
        .select("id")
        .eq("status", "active")
        .eq("is_admin", false);

      investors = investorData?.map((i) => i.id) || [];
    }

    // Get all asset codes if not specified
    let assets = assetCodes;
    if (!assets) {
      const { data: assetData } = await supabase
        .from("assets")
        .select("symbol")
        .eq("is_active", true);

      assets = assetData?.map((a) => a.symbol) || [];
    }

    // Generate date range
    const months: string[] = [];
    const start = new Date(startMonth + "-01");
    const end = new Date(endMonth + "-01");

    for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      months.push(`${year}-${month}-01`);
    }

    let generated = 0;
    const errors: string[] = [];

    // Fetch all periods once for efficiency
    const { data: periods } = await supabase.from("statement_periods").select("id, year, month");
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData.user?.id;

    // Generate templates for each combination
    for (const month of months) {
      for (const investorId of investors) {
        for (const assetCode of assets) {
          try {
            const [yStr, mStr] = month.split("-");
            const pYear = parseInt(yStr);
            const pMonth = parseInt(mStr);

            let periodId = periods?.find((p) => p.year === pYear && p.month === pMonth)?.id;

            if (!periodId) {
              // Create period if missing
              const date = new Date(pYear, pMonth - 1);
              const endDate = new Date(pYear, pMonth, 0).toISOString().split("T")[0];
              const { data: newPeriod } = await supabase
                .from("statement_periods")
                .insert({
                  year: pYear,
                  month: pMonth,
                  period_name: date.toLocaleString("default", { month: "long", year: "numeric" }),
                  period_end_date: endDate,
                  status: "FINALIZED",
                  created_by: currentUserId,
                })
                .select("id")
                .single();
              periodId = newPeriod?.id;
            }

            if (periodId) {
              const { data: existing } = await supabase
                .from("investor_fund_performance")
                .select("id")
                .eq("investor_id", investorId)
                .eq("period_id", periodId)
                .eq("fund_name", assetCode)
                .maybeSingle();

              if (!existing) {
                const { error: insertError } = await supabase
                  .from("investor_fund_performance")
                  .insert({
                    investor_id: investorId,
                    period_id: periodId,
                    fund_name: assetCode,
                    mtd_beginning_balance: 0,
                    mtd_ending_balance: 0,
                    mtd_additions: 0,
                    mtd_redemptions: 0,
                    mtd_net_income: 0,
                  });

                if (insertError) {
                  errors.push(
                    `Failed to create template for ${investorId}/${assetCode}/${month}: ${insertError.message}`
                  );
                } else {
                  generated++;
                }
              }
            }
          } catch (error) {
            errors.push(`Error processing ${investorId}/${assetCode}/${month}: ${error}`);
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      generated,
      errors,
    };
  },
};

export default reportService;
