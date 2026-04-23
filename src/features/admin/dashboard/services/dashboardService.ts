/**
 * Dashboard Service
 * Handles data fetching for dashboard widgets
 */

import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc/index";
import { format } from "date-fns";
import { formatFinancialDisplay } from "@/utils/financial";
import type { FundWithAUM, ActivityItem, PendingItem } from "@/types/domains";

/**
 * Fetch funds with their current AUM calculated from the transaction ledger
 * (source of truth) via the get_funds_with_aum RPC.
 */
export async function fetchFundsWithAUM(fundIds: string[]): Promise<FundWithAUM[]> {
  if (!fundIds || fundIds.length === 0) return [];

  const { data, error, success } = await rpc.callNoArgs("get_funds_with_aum");

  if (!success || error) {
    throw new Error(error?.userMessage || "Failed to fetch funds with AUM");
  }

  const idSet = new Set(fundIds);

  return (data || [])
    .filter((f: any) => idSet.has(f.fund_id))
    .map((f: any) => ({
      id: f.fund_id,
      name: f.fund_name,
      asset: f.asset,
      currentAUM: String(f.total_aum),
    }));
}

/**
 * Fetch recent activities (transactions + withdrawal requests)
 */
export async function fetchRecentActivities(): Promise<ActivityItem[]> {
  // Fetch recent transactions
  const { data: transactions, error: txError } = await supabase
    .from("transactions_v2")
    .select(
      `
      id,
      type,
      amount,
      asset,
      created_at,
      profile:profiles!fk_transactions_v2_investor(first_name, last_name, email)
    `
    )
    .eq("is_voided", false)
    .order("created_at", { ascending: false })
    .limit(10);

  if (txError) throw txError;

  // Fetch recent withdrawal requests
  const { data: withdrawals, error: wdError } = await supabase
    .from("withdrawal_requests")
    .select(
      `
      id,
      requested_amount,
      status,
      request_date,
      profile:profiles!fk_withdrawal_requests_profile(first_name, last_name, email),
      fund:funds(asset)
    `
    )
    .order("request_date", { ascending: false })
    .limit(5);

  if (wdError) throw wdError;

  const activityItems: ActivityItem[] = [];

  // Map transactions
  transactions?.forEach((t: any) => {
    const investorName = t.profile
      ? `${t.profile.first_name || ""} ${t.profile.last_name || ""}`.trim() || t.profile.email
      : "Unknown";

    let type: ActivityItem["type"] = "transaction";
    let title = "Transaction";

    const txType = (t.type || "").toUpperCase();
    if (txType === "DEPOSIT" || txType === "ADDITION") {
      type = "deposit";
      title = "Deposit";
    } else if (txType === "WITHDRAWAL") {
      type = "withdrawal";
      title = "Withdrawal";
    } else if (txType === "YIELD" || txType === "INCOME" || txType === "INTEREST") {
      type = "yield";
      title = "Yield Applied";
    } else if (txType === "ADJUSTMENT") {
      type = "adjustment";
      title = "Adjustment";
    }

    activityItems.push({
      id: t.id,
      type,
      title,
      description: investorName,
      timestamp: new Date(t.created_at),
      metadata: {
        amount: t.amount,
        asset: t.asset,
        investorName,
      },
    });
  });

  // Map withdrawal requests
  withdrawals?.forEach((w: any) => {
    const investorName = w.profile
      ? `${w.profile.first_name || ""} ${w.profile.last_name || ""}`.trim() || w.profile.email
      : "Unknown";

    activityItems.push({
      id: `wr-${w.id}`,
      type: "withdrawal",
      title: `Withdrawal ${w.status === "pending" ? "Requested" : w.status}`,
      description: investorName,
      timestamp: new Date(w.request_date),
      metadata: {
        amount: w.requested_amount,
        asset: w.fund?.asset,
        investorName,
      },
    });
  });

  // Sort by timestamp and take top 15
  activityItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return activityItems.slice(0, 15);
}

/**
 * Fetch pending action items (withdrawals + missing reports)
 */
export async function fetchPendingItems(): Promise<PendingItem[]> {
  // Fetch pending withdrawals
  const { data: withdrawals, error: wdError } = await supabase
    .from("withdrawal_requests")
    .select(
      `
      id,
      requested_amount,
      request_date,
      profile:profiles!fk_withdrawal_requests_profile(first_name, last_name, email),
      fund:funds(asset, name)
    `
    )
    .eq("status", "pending")
    .order("request_date", { ascending: false })
    .limit(5);

  if (wdError) throw wdError;

  const pendingItems: PendingItem[] = [];

  // Add withdrawals
  withdrawals?.forEach((w: any) => {
    const investorName = w.profile
      ? `${w.profile.first_name || ""} ${w.profile.last_name || ""}`.trim() || w.profile.email
      : "Unknown";

    pendingItems.push({
      id: w.id,
      type: "withdrawal",
      title: `Withdrawal Request`,
      subtitle: `${investorName} - ${w.fund?.name || "Unknown Fund"}`,
      amount: `${formatFinancialDisplay(String(w.requested_amount || 0), 4)} ${w.fund?.asset || ""}`,
      timestamp: new Date(w.request_date),
      priority: "high",
    });
  });

  // Check for eligible investors without reports this month
  const currentMonth = format(new Date(), "yyyy-MM");
  const [yearStr, monthStr] = currentMonth.split("-");

  // Get investors with active ledger balances (eligible for reports)
  const { data: eligibleInvestorsResult } = await supabase.rpc(
    "get_funds_with_aum"
  );

  const totalInvestorCount = eligibleInvestorsResult?.reduce(
    (sum: number, f: any) => sum + (Number(f.investor_count) || 0), 0
  ) || 0;

  const { data: periods } = await supabase
    .from("statement_periods")
    .select("id")
    .eq("year", parseInt(yearStr))
    .eq("month", parseInt(monthStr))
    .maybeSingle();

  if (periods && totalInvestorCount > 0) {
    // Count unique investors with reports for this period
    const { data: reportData } = await supabase
      .from("investor_fund_performance")
      .select("investor_id")
      .eq("period_id", periods.id);

    const reportedInvestors = new Set(reportData?.map((r) => r.investor_id) || []).size;
    const missingReports = totalInvestorCount - reportedInvestors;

    if (missingReports > 0) {
      pendingItems.push({
        id: "reports-needed",
        type: "report",
        title: `Reports Pending`,
        subtitle: `${missingReports} eligible investor${missingReports > 1 ? "s" : ""} need ${currentMonth} reports`,
        timestamp: new Date(),
        priority: "medium",
      });
    }
  }

  return pendingItems;
}
