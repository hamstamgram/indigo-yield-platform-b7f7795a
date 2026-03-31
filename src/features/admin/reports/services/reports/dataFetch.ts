import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";
import { sanitizeSearchInput } from "@/utils/searchSanitizer";
import type { InvestorReportSummary, PerformanceReportDetail, DeliveryStatus } from "./types";

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
    .limit(2000);

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
  // Resolve Period ID
  const [yearStr, monthStr] = selectedMonth.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);

  const { data: period, error: periodError } = await supabase
    .from("statement_periods")
    .select("id")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (periodError) throw periodError;

  if (!period) {
    const { data: investors, error: profileError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .eq("is_admin", false)
      .neq("account_type", "fees_account")
      .order("first_name");

    if (profileError) throw profileError;

    const reports = (investors || []).map((investor) => ({
      investor_id: investor.id,
      investor_name: `${investor.first_name || ""} ${investor.last_name || ""}`.trim() || "Unknown",
      investor_email: investor.email,
      investor_emails: [{ email: investor.email, is_primary: true, verified: true }],
      assets: [],
      total_value: "0",
      total_yield: "0",
      has_reports: false,
      report_count: 0,
      delivery_status: "missing" as DeliveryStatus,
      sent_at: null,
      statement_id: null,
    }));

    return { reports, periodId: "" };
  }

  // Call the new high-performance RPC
  const { data, error } = await supabase.rpc("get_investor_reports_v2" as any, {
    p_period_id: period.id,
  });

  if (error) {
    logError("fetchAdminInvestorReports.rpc", error, { periodId: period.id });
    throw error;
  }

  return { reports: (data as unknown as InvestorReportSummary[]) || [], periodId: period.id };
}

/**
 * Fetch latest performance data for an investor and asset
 */
export async function fetchLatestPerformance(
  investorId: string,
  assetCode: string
): Promise<{
  MTD: any;
  QTD: any;
  YTD: any;
  ITD: any;
} | null> {
  const { data: allPerformance, error: perfError } = await supabase
    .from("investor_fund_performance")
    .select(
      `
      *,
      period:statement_periods(period_end_date)
    `
    )
    .eq("investor_id", investorId)
    .eq("fund_name", assetCode)
    .limit(2000);

  if (perfError) {
    logError("fetchLatestPerformance", perfError, { investorId, assetCode });
    return null;
  }
  if (!allPerformance || allPerformance.length === 0) return null;

  const sorted = [...allPerformance].sort((a, b) => {
    const dateA = (a.period as any)?.period_end_date || "";
    const dateB = (b.period as any)?.period_end_date || "";
    return dateB.localeCompare(dateA);
  });

  const latest = sorted[0];

  return {
    MTD: {
      beginning_balance: String(latest.mtd_beginning_balance || "0"),
      additions: String(latest.mtd_additions || "0"),
      withdrawals: String(latest.mtd_redemptions || "0"),
      net_income: String(latest.mtd_net_income || "0"),
      ending_balance: String(latest.mtd_ending_balance || "0"),
      rate_of_return: String(latest.mtd_rate_of_return || "0"),
    },
    QTD: {
      beginning_balance: String(latest.qtd_beginning_balance || "0"),
      additions: String(latest.qtd_additions || "0"),
      withdrawals: String(latest.qtd_redemptions || "0"),
      net_income: String(latest.qtd_net_income || "0"),
      ending_balance: String(latest.qtd_ending_balance || "0"),
      rate_of_return: String(latest.qtd_rate_of_return || "0"),
    },
    YTD: {
      beginning_balance: String(latest.ytd_beginning_balance || "0"),
      additions: String(latest.ytd_additions || "0"),
      withdrawals: String(latest.ytd_redemptions || "0"),
      net_income: String(latest.ytd_net_income || "0"),
      ending_balance: String(latest.ytd_ending_balance || "0"),
      rate_of_return: String(latest.ytd_rate_of_return || "0"),
    },
    ITD: {
      beginning_balance: String(latest.itd_beginning_balance || "0"),
      additions: String(latest.itd_additions || "0"),
      withdrawals: String(latest.itd_redemptions || "0"),
      net_income: String(latest.itd_net_income || "0"),
      ending_balance: String(latest.itd_ending_balance || "0"),
      rate_of_return: String(latest.itd_rate_of_return || "0"),
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
    .limit(2000);

  if (error) throw error;

  return ((data || []) as ProfileRow[]).map((p) => ({
    id: p.id,
    name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email,
    email: p.email,
  }));
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
  reports: any[];
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
      const period = s.period as any;
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
      const investor = s.investor as any;
      const period = s.period as any;
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
