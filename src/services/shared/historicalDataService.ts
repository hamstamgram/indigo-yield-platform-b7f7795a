/**
 * Historical Data Service
 * Manages historical report templates and data generation
 */

import { supabase } from "@/integrations/supabase/client";

export interface HistoricalReportTemplate {
  id: string;
  investor_id: string;
  report_month: string;
  asset_code: string;
  opening_balance: number | null;
  closing_balance: number | null;
  additions: number | null;
  withdrawals: number | null;
  yield_earned: number | null;
  created_at: string;
  updated_at: string;
}

export interface BulkGenerateOptions {
  startMonth: string; // Format: 'YYYY-MM'
  endMonth: string; // Format: 'YYYY-MM'
  investorIds?: string[]; // If not provided, generates for all investors
  assetCodes?: string[]; // If not provided, generates for all assets
}

/**
 * Get all historical report templates with filtering
 */
export async function getHistoricalReports(filters?: {
  investorId?: string;
  assetCode?: string;
  startMonth?: string;
  endMonth?: string;
}): Promise<HistoricalReportTemplate[]> {
  try {
    let query = supabase
      .from("investor_fund_performance")
      .select(`
        *,
        period:statement_periods (
          period_end_date
        )
      `)
      .order("period(period_end_date)", { ascending: false });

    if (filters?.investorId) {
      query = query.eq("investor_id", filters.investorId); // V2: investor_id = profiles.id
    }

    if (filters?.assetCode) {
      query = query.eq("fund_name", filters.assetCode);
    }

    if (filters?.startMonth) {
      query = query.gte("period.period_end_date", filters.startMonth);
    }

    if (filters?.endMonth) {
      query = query.lte("period.period_end_date", filters.endMonth);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((r: any) => ({
      id: r.id,
      investor_id: r.investor_id, // V2: investor_id column
      report_month: r.period?.period_end_date,
      asset_code: r.fund_name,
      opening_balance: r.mtd_beginning_balance,
      closing_balance: r.mtd_ending_balance,
      additions: r.mtd_additions,
      withdrawals: r.mtd_redemptions,
      yield_earned: r.mtd_net_income,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  } catch (error) {
    console.error("Error fetching historical reports:", error);
    return [];
  }
}

/**
 * Get historical data for a specific entity.
 */
export async function getHistoricalData(entityId: string, type: "fund" | "investor") {
  if (type === "fund") {
    const { data, error } = await supabase
      .from("fund_daily_aum")
      .select("*")
      .eq("fund_id", entityId)
      .order("aum_date", { ascending: false });
    if (error) {
      console.error("Error fetching fund historical data:", error);
      return [];
    }
    return data;
  } else {
    // Join with statement_periods to order by period_end_date (effective date)
    const { data, error } = await supabase
      .from("investor_fund_performance")
      .select("*, period:statement_periods(period_end_date)")
      .eq("investor_id", entityId)
      .order("period(period_end_date)", { ascending: false });
    if (error) {
      console.error("Error fetching investor historical data:", error);
      return [];
    }
    return data;
  }
}

/**
 * Generate monthly report templates for missing periods
 */
export async function generateMissingTemplates(options: BulkGenerateOptions): Promise<{
  success: boolean;
  generated: number;
  errors: string[];
}> {
  try {
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

    // Generate templates for each combination
    for (const month of months) {
      for (const investorId of investors) {
        for (const assetCode of assets) {
          try {
            // Check if template already exists (V2)
            // Need to resolve period_id first. This logic is complex for bulk generation without period_id map.
            // Simplified: Check if record exists for user+fund+date(approx)
            // We need to fetch all periods first.
            
            // Optimization: Fetch all periods once
            const { data: periods } = await supabase.from("statement_periods").select("id, year, month");
            
            const [yStr, mStr] = month.split("-");
            const pYear = parseInt(yStr);
            const pMonth = parseInt(mStr);
            
            let periodId = periods?.find(p => p.year === pYear && p.month === pMonth)?.id;
            
            if (!periodId) {
                // Create period if missing (bulk)
                const date = new Date(pYear, pMonth - 1);
                const endDate = new Date(pYear, pMonth, 0).toISOString().split('T')[0];
                const { data: newPeriod } = await supabase.from("statement_periods").insert({
                    year: pYear,
                    month: pMonth,
                    period_name: date.toLocaleString('default', { month: 'long', year: 'numeric' }),
                    period_end_date: endDate,
                    status: 'FINALIZED',
                    created_by: (await supabase.auth.getUser()).data.user?.id
                }).select("id").single();
                periodId = newPeriod?.id;
            }

            if (periodId) {
                const { data: existing } = await supabase
                  .from("investor_fund_performance")
                  .select("id")
                  .eq("investor_id", investorId) // V2: investor_id = profiles.id
                  .eq("period_id", periodId)
                  .eq("fund_name", assetCode)
                  .maybeSingle();

                if (!existing) {
                  const { error: insertError } = await supabase
                    .from("investor_fund_performance")
                    .insert({
                      investor_id: investorId, // V2: investor_id = profiles.id
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
  } catch (error) {
    console.error("Error generating templates:", error);
    return {
      success: false,
      generated: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

/**
 * Update a historical report template
 */
export async function updateHistoricalReport(
  id: string,
  updates: Partial<
    Pick<
      HistoricalReportTemplate,
      "opening_balance" | "closing_balance" | "additions" | "withdrawals" | "yield_earned"
    >
  >
): Promise<boolean> {
  try {
    const v2Updates = {
        mtd_beginning_balance: updates.opening_balance,
        mtd_ending_balance: updates.closing_balance,
        mtd_additions: updates.additions,
        mtd_redemptions: updates.withdrawals,
        mtd_net_income: updates.yield_earned
    };
    // Remove undefined keys
    Object.keys(v2Updates).forEach(key => v2Updates[key as keyof typeof v2Updates] === undefined && delete v2Updates[key as keyof typeof v2Updates]);

    const { error } = await supabase.from("investor_fund_performance").update(v2Updates).eq("id", id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating historical report:", error);
    return false;
  }
}

/**
 * Delete historical report templates (bulk)
 */
export async function deleteHistoricalReports(ids: string[]): Promise<boolean> {
  try {
    const { error } = await supabase.from("investor_fund_performance").delete().in("id", ids);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting historical reports:", error);
    return false;
  }
}

/**
 * Get summary statistics for historical data
 */
export async function getHistoricalDataSummary(): Promise<{
  totalReports: number;
  latestMonth: string | null;
  earliestMonth: string | null;
  investorCount: number;
  assetCount: number;
}> {
  try {
    // V2: Use investor_id column
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

    const months = summary.map((r: any) => r.period?.period_end_date).sort();
    const uniqueInvestors = new Set(summary.map((r) => r.investor_id));
    const uniqueAssets = new Set(summary.map((r) => r.fund_name));

    return {
      totalReports: summary.length,
      latestMonth: months[months.length - 1],
      earliestMonth: months[0],
      investorCount: uniqueInvestors.size,
      assetCount: uniqueAssets.size,
    };
  } catch (error) {
    console.error("Error getting historical data summary:", error);
    return {
      totalReports: 0,
      latestMonth: null,
      earliestMonth: null,
      investorCount: 0,
      assetCount: 0,
    };
  }
}
