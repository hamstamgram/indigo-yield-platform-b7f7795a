import { supabase } from "@/integrations/supabase/client";
import { parseFinancial } from "@/utils/financial";
import { db } from "@/lib/db/index";
import { logError } from "@/lib/logger";
import { rpc } from "@/lib/rpc/index";
import { investorDataService } from "@/services/investor/investorDataService";
import type { InvestorPositionDetail } from "@/services/investor/investorDataService";
import { requireAdmin } from "@/utils/authorizationHelper";

type WithdrawalStatus =
  | "pending"
  | "cancelled"
  | "processing"
  | "approved"
  | "completed"
  | "rejected";

export interface AdminInvestorSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  totalAum: number;
  status: string;
  onboardingDate: string | null;
  createdAt: string | null;
  lastStatementDate: string | null;
  isSystemAccount?: boolean;
  portfolioDetails: {
    assetBreakdown: Record<string, number>;
    performanceMetrics: {
      totalReturn: number;
      monthlyReturn: number;
      sharpeRatio: number;
    };
  };
}

export interface DashboardStats {
  totalAum: number;
  investorCount: number;
  pendingWithdrawals: number;
  interest24h: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const totalAum = await investorDataService.getTotalAUM();
    const investorCount = await investorDataService.getActiveInvestorCount();

    const { data: withdrawalRequests } = await supabase
      .from("withdrawal_requests")
      .select("requested_amount")
      .eq("status", "pending");

    const pendingWithdrawals =
      withdrawalRequests
        ?.reduce((sum, req) => sum.plus(parseFinancial(req.requested_amount)), parseFinancial(0))
        .toNumber() || 0;

    // Sum actual YIELD transactions from the last 24 hours
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const { data: recentYields } = await supabase
      .from("transactions_v2")
      .select("amount")
      .eq("type", "YIELD")
      .eq("is_voided", false)
      .gte("created_at", yesterday);

    const interest24h =
      recentYields
        ?.reduce((sum, tx) => sum.plus(parseFinancial(tx.amount)), parseFinancial(0))
        .toNumber() || 0;

    return {
      totalAum,
      investorCount,
      pendingWithdrawals,
      interest24h,
    };
  } catch (error) {
    logError("adminService.getDashboardStats", error);
    throw error;
  }
}

export async function getAllInvestorsWithSummary(): Promise<AdminInvestorSummary[]> {
  try {
    const { data, error } = await rpc.callNoArgs("get_all_investors_summary");

    if (error) {
      logError("adminService.getAllInvestorsWithSummary", error);
      throw error;
    }

    const investorSummaries = (data || []) as any[];

    return investorSummaries.map((summary) => ({
      id: summary.id,
      email: summary.email || "",
      firstName: summary.name?.split(" ")[0] || "",
      lastName: summary.name?.split(" ").slice(1).join(" ") || "",
      totalAum: parseFinancial(summary.totalAUM || 0).toNumber(),
      status: summary.status || "active",
      onboardingDate: summary.onboardingDate || null,
      createdAt: summary.createdAt || null,
      lastStatementDate: null,
      isSystemAccount: summary.account_type === "fees_account" || false,
      portfolioDetails: {
        assetBreakdown: summary.assetBreakdown || {},
        performanceMetrics: {
          totalReturn: parseFinancial(summary.totalEarned || 0).toNumber(),
          monthlyReturn: parseFinancial(summary.totalEarned || 0).toNumber() / 12,
          sharpeRatio:
            parseFinancial(summary.totalEarned || 0).toNumber() > 0
              ? Math.min(parseFinancial(summary.totalEarned || 0).toNumber() * 2, 3)
              : 0,
        },
      },
    }));
  } catch (error) {
    logError("adminService.getAllInvestorsWithSummary", error);
    throw error;
  }
}

export async function getInvestorPositions(investorId: string): Promise<InvestorPositionDetail[]> {
  await requireAdmin("view investor positions");
  return await investorDataService.getInvestorPositions(investorId);
}

export async function getWithdrawalRequests(status?: WithdrawalStatus): Promise<any[]> {
  try {
    let query = supabase
      .from("withdrawal_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    logError("adminService.getWithdrawalRequests", error);
    throw error;
  }
}

export async function getFundPerformanceData(fundId?: string): Promise<any[]> {
  try {
    // In V6, we use the first-principles dynamic snapshot
    const { data: aumData, error: aumError } = await rpc.call("get_funds_aum_snapshot", {
      p_as_of_date: new Date().toISOString().split("T")[0],
    });

    if (aumError) throw aumError;

    const filteredAum = fundId
      ? (aumData as any[]).filter((r) => r.fund_id === fundId)
      : (aumData as any[]);

    const { data: funds } = await supabase
      .from("funds")
      .select("id, code, name, asset, inception_date");

    const fundMap = new Map<string, any>();
    (funds || []).forEach((f) => fundMap.set(f.id, f));

    return (filteredAum || []).map((row) => {
      const meta = fundMap.get(row.fund_id) || {};
      return {
        ...row,
        total_aum: row.aum_value,
        aum_date: row.as_of_date,
        fund_code: meta.code,
        fund_name: meta.name,
        fund_asset: meta.asset,
        inception_date: meta.inception_date,
      };
    });
  } catch (error) {
    logError("adminService.getFundPerformanceData", error);
    throw error;
  }
}

export async function getTransactionHistory(_userId?: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from("transactions_v2")
      .select("*")
      .eq("is_voided", false)
      .order("tx_date", { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  } catch (error) {
    logError("adminService.getTransactionHistory", error);
    throw error;
  }
}

export async function createInvestor(investorData: {
  email: string;
  name: string;
  phone?: string;
  entity_type?: string;
}): Promise<string> {
  try {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", investorData.email)
      .maybeSingle();
    if (existing) throw new Error("Investor with this email already exists.");

    throw new Error("To add an investor, please use the 'Invite Investor' feature.");
  } catch (error) {
    logError("adminService.createInvestor", error);
    throw error;
  }
}

export async function updateInvestorStatus(investorId: string, status: string): Promise<void> {
  try {
    const result = await db.update("profiles", { status }, { column: "id", value: investorId });
    if (result.error) throw new Error(result.error.message || result.error.userMessage);
  } catch (error) {
    logError("adminService.updateInvestorStatus", error);
    throw error;
  }
}

export async function bulkUpdateInvestors(
  investorIds: string[],
  updates: Record<string, any>
): Promise<void> {
  try {
    const result = await db.updateIn("profiles", updates, "id", investorIds);
    if (result.error) throw new Error(result.error.message || result.error.userMessage);
  } catch (error) {
    logError("adminService.bulkUpdateInvestors", error);
    throw error;
  }
}

export async function getInvestorAnalytics(timeRange: string = "30d"): Promise<any> {
  try {
    const totalAUM = await investorDataService.getTotalAUM();
    const investorCount = await investorDataService.getActiveInvestorCount();

    return {
      totalAUM,
      investorCount,
      growthRate: 0,
      avgPositionSize: totalAUM / Math.max(investorCount, 1),
      timeRange,
    };
  } catch (error) {
    logError("adminService.getInvestorAnalytics", error);
    throw error;
  }
}

export async function exportInvestorData(format: "csv" | "json" = "json"): Promise<any> {
  try {
    const investors = await getAllInvestorsWithSummary();

    if (format === "csv") {
      const headers = ["ID", "Name", "Email", "Total AUM", "Status"];
      const csvData = investors.map((inv) => [
        inv.id,
        `${inv.firstName} ${inv.lastName}`,
        inv.email,
        inv.totalAum,
        inv.status,
      ]);

      return { headers, data: csvData };
    }

    return investors;
  } catch (error) {
    logError("adminService.exportInvestorData", error);
    throw error;
  }
}

export async function performHealthCheck(): Promise<any> {
  try {
    const totalAUM = await investorDataService.getTotalAUM();
    const investorCount = await investorDataService.getActiveInvestorCount();

    return {
      status: "healthy",
      totalAUM,
      investorCount,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    logError("adminService.performHealthCheck", error);
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
      lastChecked: new Date().toISOString(),
    };
  }
}

export async function backupData(): Promise<string> {
  try {
    const investors = await getAllInvestorsWithSummary();
    const backup = {
      timestamp: new Date().toISOString(),
      version: "2.0",
      data: { investors },
    };

    return JSON.stringify(backup, null, 2);
  } catch (error) {
    logError("adminService.backupData", error);
    throw error;
  }
}

// Plain object singleton for adminInvestorService.method() pattern
export const adminInvestorService = {
  getDashboardStats,
  getAllInvestorsWithSummary,
  getInvestorPositions,
  getWithdrawalRequests,
  getFundPerformance: getFundPerformanceData,
  getTransactionHistory,
  createInvestor,
  updateInvestorStatus,
  bulkUpdateInvestors,
  getInvestorAnalytics,
  exportInvestorData,
  performHealthCheck,
  backupData,
};
