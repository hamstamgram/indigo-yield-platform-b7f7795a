/**
 * Report Query Service
 * Handles all report data fetching operations for admin
 */

import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";
import { sanitizeSearchInput } from "@/utils/searchSanitizer";
import { parseFinancial } from "@/utils/financial";
import Decimal from "decimal.js";

// ============================================================================
// Internal Types for Query Results
// ============================================================================

/** Profile row from profiles table */
interface ProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  status?: string;
}

/** Performance item with period join */
interface PerformanceItemRow {
  id: string;
  fund_name: string;
  created_at: string;
  period?: {
    year: number;
    month: number;
    period_end_date: string;
  } | null;
}

/** Full performance report row */
interface PerformanceReportRow {
  id: string;
  investor_id: string;
  fund_name: string;
  mtd_beginning_balance: number | null;
  mtd_additions: number | null;
  mtd_redemptions: number | null;
  mtd_net_income: number | null;
  mtd_ending_balance: number | null;
  mtd_rate_of_return: number | null;
  qtd_beginning_balance: number | null;
  qtd_additions: number | null;
  qtd_redemptions: number | null;
  qtd_net_income: number | null;
  qtd_ending_balance: number | null;
  qtd_rate_of_return: number | null;
  ytd_beginning_balance: number | null;
  ytd_additions: number | null;
  ytd_redemptions: number | null;
  ytd_net_income: number | null;
  ytd_ending_balance: number | null;
  ytd_rate_of_return: number | null;
  itd_beginning_balance: number | null;
  itd_additions: number | null;
  itd_redemptions: number | null;
  itd_net_income: number | null;
  itd_ending_balance: number | null;
  itd_rate_of_return: number | null;
}

export interface InvestorReportAsset {
  asset_code: string;
  opening_balance: string;
  closing_balance: string;
  additions: string;
  withdrawals: string;
  yield_earned: string;
  report_id: string;
  // Full performance data
  mtd_beginning_balance: string;
  mtd_additions: string;
  mtd_redemptions: string;
  mtd_net_income: string;
  mtd_ending_balance: string;
  mtd_rate_of_return: string;
  qtd_beginning_balance: string;
  qtd_additions: string;
  qtd_redemptions: string;
  qtd_net_income: string;
  qtd_ending_balance: string;
  qtd_rate_of_return: string;
  ytd_beginning_balance: string;
  ytd_additions: string;
  ytd_redemptions: string;
  ytd_net_income: string;
  ytd_ending_balance: string;
  ytd_rate_of_return: string;
  itd_beginning_balance: string;
  itd_additions: string;
  itd_redemptions: string;
  itd_net_income: string;
  itd_ending_balance: string;
  itd_rate_of_return: string;
}

export interface InvestorReportEmail {
  email: string;
  is_primary: boolean;
  verified: boolean;
}

export type DeliveryStatus = "missing" | "generated" | "sent" | "failed";

export interface InvestorReportSummary {
  investor_id: string;
  investor_name: string;
  investor_email: string;
  investor_emails: InvestorReportEmail[];
  assets: InvestorReportAsset[];
  total_value: string;
  total_yield: string;
  has_reports: boolean;
  report_count: number;
  delivery_status: DeliveryStatus;
  sent_at: string | null;
  statement_id: string | null;
}

export interface InvestorPerformanceReport {
  id: string;
  fund_name: string;
  period_end_date?: string;
  year?: number;
  month?: number;
  created_at: string;
}

export interface PerformanceReportDetail {
  id: string;
  asset_code: string;
  report_month: string | null;
  created_at: string;
  updated_at: string | null;
}

/**
 * Fetch investor performance reports for the current user
 */
export async function fetchInvestorPerformanceReports(
  searchTerm?: string
): Promise<{ id: string; asset_code: string; report_month: string; created_at: string }[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No user");

  const investorId = user.id;

  let query = supabase
    .from("investor_fund_performance")
    .select(
      `
      id,
      fund_name,
      period:statement_periods(period_end_date, year, month),
      created_at
    `
    )
    .eq("investor_id", investorId);

  if (searchTerm) {
    const safeSearch = sanitizeSearchInput(searchTerm);
    if (safeSearch) {
      query = query.ilike("fund_name", `%${safeSearch}%`);
    }
  }

  const { data, error } = await query
    .order("period(period_end_date)", { ascending: false })
    .limit(500);

  if (error) {
    logError("fetchInvestorPerformanceReports", error);
    return [];
  }

  return ((data || []) as PerformanceItemRow[]).map((item) => ({
    id: item.id,
    asset_code: item.fund_name,
    report_month: `${item.period?.year}-${String(item.period?.month).padStart(2, "0")}`,
    created_at: item.created_at,
  }));
}

/**
 * Fetch performance report detail by ID
 */
export async function fetchPerformanceReportById(
  id: string
): Promise<PerformanceReportDetail | null> {
  if (!id) throw new Error("No ID provided");

  const { data, error } = await supabase
    .from("investor_fund_performance")
    .select(
      `
      *,
      period:statement_periods (
        period_end_date
      )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;
  if (error) throw error;

  return {
    id: data.id,
    asset_code: data.fund_name,
    report_month: data.period?.period_end_date,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/**
 * Fetch all admin investor reports for a selected month
 */
export async function fetchAdminInvestorReports(
  selectedMonth: string
): Promise<{ reports: InvestorReportSummary[]; periodId: string }> {
  // Fetch all investors (profiles) - exclude fees_account and admin
  const { data: investors, error: investorsError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, account_type")
    .eq("is_admin", false)
    .neq("account_type", "fees_account")
    .order("first_name")
    .limit(500);

  if (investorsError) throw investorsError;

  if (!investors || investors.length === 0) {
    return { reports: [], periodId: "" };
  }

  // Fetch investor emails from investor_emails table
  const investorIds = (investors as ProfileRow[]).map((inv) => inv.id);
  const { data: investorEmailsData } = await supabase
    .from("investor_emails")
    .select("investor_id, email, is_primary, verified")
    .in("investor_id", investorIds)
    .limit(500);

  // Build email lookup, starting with profile email as fallback
  const emailsByInvestor: Record<string, InvestorReportEmail[]> = {};
  (investors as ProfileRow[]).forEach((inv) => {
    emailsByInvestor[inv.id] = [
      {
        email: inv.email,
        is_primary: true,
        verified: true,
      },
    ];
  });

  // Add additional emails from investor_emails table (if any)
  if (investorEmailsData && investorEmailsData.length > 0) {
    for (const emailRecord of investorEmailsData) {
      const existing = emailsByInvestor[emailRecord.investor_id] || [];
      if (!existing.some((e) => e.email === emailRecord.email)) {
        existing.push({
          email: emailRecord.email,
          is_primary: emailRecord.is_primary,
          verified: emailRecord.verified,
        });
      }
      emailsByInvestor[emailRecord.investor_id] = existing;
    }
  }

  // Resolve Period ID
  const [yearStr, monthStr] = selectedMonth.split("-");
  const { data: period } = await supabase
    .from("statement_periods")
    .select("id")
    .eq("year", parseInt(yearStr))
    .eq("month", parseInt(monthStr))
    .maybeSingle();

  if (!period) {
    // No period, return empty reports but with investor structures
    const emptyInvestorReports: InvestorReportSummary[] = (investors as ProfileRow[]).map(
      (investor) => ({
        investor_id: investor.id,
        investor_name:
          `${investor.first_name || ""} ${investor.last_name || ""}`.trim() || "Unknown",
        investor_email: investor.email,
        investor_emails: emailsByInvestor[investor.id] || [],
        assets: [],
        total_value: "0",
        total_yield: "0",
        has_reports: false,
        report_count: 0,
        delivery_status: "missing" as DeliveryStatus,
        sent_at: null,
        statement_id: null,
      })
    );
    return { reports: emptyInvestorReports, periodId: "" };
  }

  // Fetch monthly reports (V2)
  const { data: monthlyReports, error: reportsError } = await supabase
    .from("investor_fund_performance")
    .select("*")
    .eq("period_id", period.id)
    .order("investor_id, fund_name")
    .limit(500);

  if (reportsError) throw reportsError;

  // Fetch generated statements for this period (delivery status tracking)
  const { data: statements } = await supabase
    .from("generated_statements")
    .select("id, investor_id")
    .eq("period_id", period.id)
    .limit(500);

  const statementByInvestor: Record<string, string> = {};
  for (const stmt of statements || []) {
    statementByInvestor[stmt.investor_id] = stmt.id;
  }

  // Fetch delivery records for this period
  const { data: deliveries } = await supabase
    .from("statement_email_delivery")
    .select("investor_id, status, sent_at")
    .eq("period_id", period.id)
    .limit(500);

  const deliveryByInvestor: Record<string, { status: string; sent_at: string | null }> = {};
  for (const del of deliveries || []) {
    deliveryByInvestor[del.investor_id] = { status: del.status, sent_at: del.sent_at };
  }

  // Group reports by investor
  const reportsByInvestor = ((monthlyReports || []) as PerformanceReportRow[]).reduce(
    (acc: Record<string, PerformanceReportRow[]>, report) => {
      const key = report.investor_id;
      if (!key) return acc;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(report);
      return acc;
    },
    {}
  );

  // Build investor report summaries
  const investorReports: InvestorReportSummary[] = (investors as ProfileRow[]).map((investor) => {
    const investorPerf = reportsByInvestor[investor.id] || [];
    const hasReports = investorPerf.length > 0;

    const assets: InvestorReportAsset[] = investorPerf.map((report) => ({
      asset_code: report.fund_name,
      opening_balance: String(report.mtd_beginning_balance || "0"),
      closing_balance: String(report.mtd_ending_balance || "0"),
      additions: String(report.mtd_additions || "0"),
      withdrawals: String(report.mtd_redemptions || "0"),
      yield_earned: String(report.mtd_net_income || "0"),
      report_id: report.id,
      mtd_beginning_balance: String(report.mtd_beginning_balance || "0"),
      mtd_additions: String(report.mtd_additions || "0"),
      mtd_redemptions: String(report.mtd_redemptions || "0"),
      mtd_net_income: String(report.mtd_net_income || "0"),
      mtd_ending_balance: String(report.mtd_ending_balance || "0"),
      mtd_rate_of_return: String(report.mtd_rate_of_return || "0"),
      qtd_beginning_balance: String(report.qtd_beginning_balance || "0"),
      qtd_additions: String(report.qtd_additions || "0"),
      qtd_redemptions: String(report.qtd_redemptions || "0"),
      qtd_net_income: String(report.qtd_net_income || "0"),
      qtd_ending_balance: String(report.qtd_ending_balance || "0"),
      qtd_rate_of_return: String(report.qtd_rate_of_return || "0"),
      ytd_beginning_balance: String(report.ytd_beginning_balance || "0"),
      ytd_additions: String(report.ytd_additions || "0"),
      ytd_redemptions: String(report.ytd_redemptions || "0"),
      ytd_net_income: String(report.ytd_net_income || "0"),
      ytd_ending_balance: String(report.ytd_ending_balance || "0"),
      ytd_rate_of_return: String(report.ytd_rate_of_return || "0"),
      itd_beginning_balance: String(report.itd_beginning_balance || "0"),
      itd_additions: String(report.itd_additions || "0"),
      itd_redemptions: String(report.itd_redemptions || "0"),
      itd_net_income: String(report.itd_net_income || "0"),
      itd_ending_balance: String(report.itd_ending_balance || "0"),
      itd_rate_of_return: String(report.itd_rate_of_return || "0"),
    }));

    const total_value = assets
      .reduce((sum, asset) => sum.plus(parseFinancial(asset.closing_balance)), new Decimal(0))
      .toString();
    const total_yield = assets
      .reduce((sum, asset) => sum.plus(parseFinancial(asset.yield_earned)), new Decimal(0))
      .toString();

    const investorEmails = emailsByInvestor[investor.id] || [];
    if (investorEmails.length === 0 && investor.email) {
      investorEmails.push({
        email: investor.email,
        is_primary: true,
        verified: false,
      });
    }

    const primaryEmail = investorEmails.find((e) => e.is_primary)?.email || investor.email;
    const fullName = `${investor.first_name || ""} ${investor.last_name || ""}`.trim();

    // Determine delivery status
    const delivery = deliveryByInvestor[investor.id];
    const statementId = statementByInvestor[investor.id] || null;
    let delivery_status: DeliveryStatus = "missing";
    let sent_at: string | null = null;

    if (delivery?.status === "SENT") {
      delivery_status = "sent";
      sent_at = delivery.sent_at;
    } else if (delivery?.status === "FAILED") {
      delivery_status = "failed";
    } else if (hasReports || statementId) {
      delivery_status = "generated";
    }

    return {
      investor_id: investor.id,
      investor_name: fullName || "Unknown",
      investor_email: primaryEmail,
      investor_emails: investorEmails,
      assets,
      total_value,
      total_yield,
      has_reports: hasReports,
      report_count: assets.length,
      delivery_status,
      sent_at,
      statement_id: statementId,
    };
  });

  return { reports: investorReports, periodId: period.id };
}

/**
 * Generate fund performance reports for a period
 */
export async function generateFundPerformanceReports(
  periodYear: number,
  periodMonth: number
): Promise<{ message: string; recordsCreated: number }> {
  const { data, error } = await supabase.functions.invoke("generate-fund-performance", {
    body: {
      periodYear,
      periodMonth,
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Fetch latest performance data for an investor and asset
 */
export async function fetchLatestPerformance(
  investorId: string,
  assetCode: string
): Promise<{
  MTD: {
    beginning_balance: string;
    additions: string;
    withdrawals: string;
    net_income: string;
    ending_balance: string;
    rate_of_return: string;
  };
  QTD: {
    beginning_balance: string;
    additions: string;
    withdrawals: string;
    net_income: string;
    ending_balance: string;
    rate_of_return: string;
  };
  YTD: {
    beginning_balance: string;
    additions: string;
    withdrawals: string;
    net_income: string;
    ending_balance: string;
    rate_of_return: string;
  };
  ITD: {
    beginning_balance: string;
    additions: string;
    withdrawals: string;
    net_income: string;
    ending_balance: string;
    rate_of_return: string;
  };
} | null> {
  // Note: Supabase JS v2 doesn't fully support order() on relation fields in TypeScript,
  // so we fetch without ordering and sort client-side for type safety
  const { data: allPerformance, error: perfError } = await supabase
    .from("investor_fund_performance")
    .select(
      `
      id,
      fund_name,
      mtd_beginning_balance,
      mtd_additions,
      mtd_redemptions,
      mtd_net_income,
      mtd_ending_balance,
      mtd_rate_of_return,
      qtd_beginning_balance,
      qtd_additions,
      qtd_redemptions,
      qtd_net_income,
      qtd_ending_balance,
      qtd_rate_of_return,
      ytd_beginning_balance,
      ytd_additions,
      ytd_redemptions,
      ytd_net_income,
      ytd_ending_balance,
      ytd_rate_of_return,
      itd_beginning_balance,
      itd_additions,
      itd_redemptions,
      itd_net_income,
      itd_ending_balance,
      itd_rate_of_return,
      period:statement_periods(period_end_date)
    `
    )
    .eq("investor_id", investorId)
    .eq("fund_name", assetCode)
    .limit(500);

  if (perfError) {
    logError("fetchLatestPerformance", perfError, { investorId, assetCode });
    return null;
  }
  if (!allPerformance || allPerformance.length === 0) return null;

  // Sort by period_end_date descending and take the latest
  type PerformanceWithPeriod = (typeof allPerformance)[number];
  const sorted = [...allPerformance].sort((a, b) => {
    const dateA = (a.period as { period_end_date: string } | null)?.period_end_date || "";
    const dateB = (b.period as { period_end_date: string } | null)?.period_end_date || "";
    return dateB.localeCompare(dateA);
  });
  const latestPerformance = sorted[0] as PerformanceWithPeriod;

  return {
    MTD: {
      beginning_balance: String(latestPerformance.mtd_beginning_balance || "0"),
      additions: String(latestPerformance.mtd_additions || "0"),
      withdrawals: String(latestPerformance.mtd_redemptions || "0"),
      net_income: String(latestPerformance.mtd_net_income || "0"),
      ending_balance: String(latestPerformance.mtd_ending_balance || "0"),
      rate_of_return: String(latestPerformance.mtd_rate_of_return || "0"),
    },
    QTD: {
      beginning_balance: String(latestPerformance.qtd_beginning_balance || "0"),
      additions: String(latestPerformance.qtd_additions || "0"),
      withdrawals: String(latestPerformance.qtd_redemptions || "0"),
      net_income: String(latestPerformance.qtd_net_income || "0"),
      ending_balance: String(latestPerformance.qtd_ending_balance || "0"),
      rate_of_return: String(latestPerformance.qtd_rate_of_return || "0"),
    },
    YTD: {
      beginning_balance: String(latestPerformance.ytd_beginning_balance || "0"),
      additions: String(latestPerformance.ytd_additions || "0"),
      withdrawals: String(latestPerformance.ytd_redemptions || "0"),
      net_income: String(latestPerformance.ytd_net_income || "0"),
      ending_balance: String(latestPerformance.ytd_ending_balance || "0"),
      rate_of_return: String(latestPerformance.ytd_rate_of_return || "0"),
    },
    ITD: {
      beginning_balance: String(latestPerformance.itd_beginning_balance || "0"),
      additions: String(latestPerformance.itd_additions || "0"),
      withdrawals: String(latestPerformance.itd_redemptions || "0"),
      net_income: String(latestPerformance.itd_net_income || "0"),
      ending_balance: String(latestPerformance.itd_ending_balance || "0"),
      rate_of_return: String(latestPerformance.itd_rate_of_return || "0"),
    },
  };
}

/**
 * Fetch active investors for statement generation
 */
export async function fetchActiveInvestorsForStatements(): Promise<
  { id: string; name: string; email: string }[]
> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, status")
    .eq("status", "active")
    .eq("is_admin", false)
    .order("first_name")
    .limit(500);

  if (error) throw error;

  return ((data || []) as ProfileRow[]).map((p) => ({
    id: p.id,
    name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email,
    email: p.email,
  }));
}
/**
 * Send a report email for an investor via the send-report-mailersend Edge Function
 */
export async function sendReportEmail(
  investorId: string,
  periodId: string
): Promise<{ success: boolean; delivery_id?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke("send-report-mailersend", {
    body: {
      investor_id: investorId,
      period_id: periodId,
      delivery_mode: "email_html",
    },
  });

  if (error) {
    logError("sendReportEmail", error, { investorId, periodId });
    return { success: false, error: error.message };
  }

  return { success: true, delivery_id: data?.delivery_id };
}

/**
 * Fetch all historical reports with delivery status
 */
export async function fetchHistoricalReports(filters?: {
  month?: string;
  investorId?: string;
  fundName?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  reports: Array<{
    id: string;
    investor_id: string;
    investor_name: string;
    period_month: string;
    fund_names: string[];
    delivery_status: DeliveryStatus;
    sent_at: string | null;
    created_at: string;
  }>;
  total: number;
}> {
  const page = filters?.page ?? 0;
  const pageSize = filters?.pageSize ?? 20;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("generated_statements")
    .select(
      `
      id,
      investor_id,
      period_id,
      fund_names,
      created_at,
      investor:profiles!generated_statements_investor_id_fkey(first_name, last_name),
      period:statement_periods!generated_statements_period_id_fkey(year, month, period_end_date)
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters?.investorId) {
    query = query.eq("investor_id", filters.investorId);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  // Fetch delivery records for these statements
  const statementIds = (data || []).map((s) => s.id);
  const { data: deliveries } =
    statementIds.length > 0
      ? await supabase
          .from("statement_email_delivery")
          .select("statement_id, status, sent_at")
          .in("statement_id", statementIds)
      : { data: [] };

  const deliveryByStatement: Record<string, { status: string; sent_at: string | null }> = {};
  for (const del of deliveries || []) {
    deliveryByStatement[del.statement_id] = { status: del.status, sent_at: del.sent_at };
  }

  const reports = (data || [])
    .filter((s) => {
      const period = s.period as { year: number; month: number; period_end_date: string } | null;
      if (filters?.month && period) {
        const monthStr = `${period.year}-${String(period.month).padStart(2, "0")}`;
        if (monthStr !== filters.month) return false;
      }
      if (filters?.fundName) {
        const names = (s.fund_names || []) as string[];
        if (!names.some((n) => n.toLowerCase().includes(filters.fundName!.toLowerCase())))
          return false;
      }
      return true;
    })
    .map((s) => {
      const investor = s.investor as { first_name: string | null; last_name: string | null } | null;
      const period = s.period as { year: number; month: number; period_end_date: string } | null;
      const delivery = deliveryByStatement[s.id];

      let delivery_status: DeliveryStatus = "generated";
      if (delivery?.status === "SENT") delivery_status = "sent";
      else if (delivery?.status === "FAILED") delivery_status = "failed";

      return {
        id: s.id,
        investor_id: s.investor_id,
        investor_name: investor
          ? `${investor.first_name || ""} ${investor.last_name || ""}`.trim() || "Unknown"
          : "Unknown",
        period_month: period
          ? `${period.year}-${String(period.month).padStart(2, "0")}`
          : "Unknown",
        fund_names: (s.fund_names || []) as string[],
        delivery_status,
        sent_at: delivery?.sent_at || null,
        created_at: s.created_at,
      };
    });

  return { reports, total: count || 0 };
}

/**
 * Delete a performance report record with audit trail
 */
export async function deletePerformanceReport(id: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: report } = await supabase
    .from("investor_fund_performance")
    .select("id, investor_id, fund_name, period_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("investor_fund_performance").delete().eq("id", id);
  if (error) throw error;

  await supabase.from("audit_log").insert({
    actor_user: user?.id ?? null,
    action: "PERFORMANCE_REPORT_DELETED",
    entity: "investor_fund_performance",
    entity_id: id,
    old_values: report
      ? {
          investor_id: report.investor_id,
          fund_name: report.fund_name,
          period_id: report.period_id,
        }
      : null,
    new_values: null,
  });
}
