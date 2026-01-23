/**
 * Yield Reports Service
 * Handles investor performance reports and yield-related reporting
 * Split from yieldDistributionService for better maintainability
 */

import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";
import { getMonthEndDate } from "@/utils/dateUtils";

/**
 * Get investor performance records for a specific period
 */
export async function getInvestorPerformanceForPeriod(
  investorId: string,
  periodId: string
): Promise<any[]> {
  const { data, error } = await supabase
    .from("investor_fund_performance")
    .select("*")
    .eq("investor_id", investorId)
    .eq("period_id", periodId);

  if (error) throw new Error(`Failed to fetch performance: ${error.message}`);
  return data || [];
}

/**
 * Get investor fee schedule
 */
export async function getInvestorFeeSchedule(investorId: string): Promise<
  Array<{
    id: string;
    fund_id: string | null;
    fee_pct: number;
    effective_date: string;
  }>
> {
  const { data, error } = await supabase
    .from("investor_fee_schedule")
    .select("id, fund_id, fee_pct, effective_date")
    .eq("investor_id", investorId)
    .order("effective_date", { ascending: false });

  if (error) throw new Error(`Failed to fetch fee schedule: ${error.message}`);
  return data || [];
}

/** Monthly report with joined period data */
interface MonthlyReportWithPeriod {
  id: string;
  investor_id: string;
  period_id: string;
  fund_name: string;
  mtd_beginning_balance: number | null;
  mtd_additions: number | null;
  mtd_redemptions: number | null;
  mtd_net_income: number | null;
  mtd_ending_balance: number | null;
  mtd_rate_of_return: number | null;
  period: { period_end_date: string } | null;
}

/**
 * Get investor monthly reports (from investor_fund_performance)
 */
export async function getInvestorMonthlyReports(investorId: string): Promise<MonthlyReportWithPeriod[]> {
  // Note: Supabase JS v2 doesn't fully support order() on relation fields in TypeScript,
  // so we fetch and sort client-side for type safety
  const { data, error } = await supabase
    .from("investor_fund_performance")
    .select(
      `
      id,
      investor_id,
      period_id,
      fund_name,
      mtd_beginning_balance,
      mtd_additions,
      mtd_redemptions,
      mtd_net_income,
      mtd_ending_balance,
      mtd_rate_of_return,
      period:statement_periods (
        period_end_date
      )
    `
    )
    .eq("investor_id", investorId);

  if (error) throw new Error(`Failed to fetch monthly reports: ${error.message}`);
  
  // Client-side sort: by period_end_date DESC, then fund_name ASC
  const reports = (data || []) as unknown as MonthlyReportWithPeriod[];
  return reports.sort((a, b) => {
    const dateA = a.period?.period_end_date || "";
    const dateB = b.period?.period_end_date || "";
    if (dateB !== dateA) return dateB.localeCompare(dateA);
    return (a.fund_name || "").localeCompare(b.fund_name || "");
  });
}

/**
 * Create monthly report template for an investor
 */
export async function createMonthlyReportTemplate(
  investorId: string,
  year: number,
  month: number,
  assetCode: string = "USDT"
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if period exists
  let periodId: string;
  const { data: period } = await supabase
    .from("statement_periods")
    .select("id")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (period) {
    periodId = period.id;
  } else {
    // Create period if it doesn't exist
    const date = new Date(year, month - 1);
    const endDate = getMonthEndDate(year, month);
    const { data: newPeriod, error: createError } = await supabase
      .from("statement_periods")
      .insert({
        year,
        month,
        period_name: date.toLocaleString("default", { month: "long", year: "numeric" }),
        period_end_date: endDate,
        created_by: user?.id,
        status: "FINALIZED",
      })
      .select("id")
      .single();

    if (createError) throw new Error(`Failed to create period: ${createError.message}`);
    periodId = newPeriod.id;
  }

  // Insert performance record
  const result = await db.insert("investor_fund_performance", {
    investor_id: investorId,
    period_id: periodId,
    fund_name: assetCode,
    mtd_beginning_balance: 0,
    mtd_ending_balance: 0,
    mtd_additions: 0,
    mtd_redemptions: 0,
    mtd_net_income: 0,
  });

  if (result.error) throw new Error(`Failed to create template: ${result.error.userMessage}`);
}

/**
 * Update a monthly report field
 */
export async function updateMonthlyReportField(
  reportId: string,
  field: string,
  value: number
): Promise<void> {
  // Map legacy fields to V2 fields
  const fieldMap: Record<string, string> = {
    opening_balance: "mtd_beginning_balance",
    closing_balance: "mtd_ending_balance",
    additions: "mtd_additions",
    withdrawals: "mtd_redemptions",
    yield_earned: "mtd_net_income",
  };

  const v2Field = fieldMap[field] || field;

  const { error } = await supabase
    .from("investor_fund_performance")
    .update({ [v2Field]: value })
    .eq("id", reportId);

  if (error) throw new Error(`Failed to update report: ${error.message}`);
}
