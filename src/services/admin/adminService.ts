import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db/index";
import { logError } from "@/lib/logger";
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

class AdminInvestorService {
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      // Use unified data service for consistency
      const totalAum = await investorDataService.getTotalAUM();
      const investorCount = await investorDataService.getActiveInvestorCount();

      // Get pending withdrawals
      const { data: withdrawalRequests } = await supabase
        .from("withdrawal_requests")
        .select("requested_amount")
        .eq("status", "pending");

      const pendingWithdrawals =
        withdrawalRequests?.reduce((sum, req) => sum + Number(req.requested_amount), 0) || 0;

      // Calculate 24h interest (simplified calculation)
      const interest24h = totalAum * 0.0001; // 0.01% daily interest example

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

  async getAllInvestorsWithSummary(): Promise<AdminInvestorSummary[]> {
    try {
      // Use unified data service
      const investorSummaries = await investorDataService.getAllInvestorsWithSummary();

      // Convert to V2 format for compatibility
      return investorSummaries.map((summary) => ({
        id: summary.id,
        email: summary.email,
        firstName: summary.name.split(" ")[0] || "",
        lastName: summary.name.split(" ").slice(1).join(" ") || "",
        totalAum: summary.totalAUM,
        status: summary.status,
        onboardingDate: summary.onboardingDate || null,
        createdAt: summary.createdAt || null,
        lastStatementDate: null,
        isSystemAccount: summary.isSystemAccount || false,
        portfolioDetails: {
          assetBreakdown: summary.assetBreakdown || {},
          performanceMetrics: {
            totalReturn: summary.totalEarned,
            monthlyReturn: summary.totalEarned / 12,
            sharpeRatio: summary.totalEarned > 0 ? Math.min(summary.totalEarned * 2, 3) : 0,
          },
        },
      }));
    } catch (error) {
      logError("adminService.getAllInvestorsWithSummary", error);
      throw error;
    }
  }

  async getInvestorPositions(investorId: string): Promise<InvestorPositionDetail[]> {
    // Require admin access to view any investor's positions
    await requireAdmin("view investor positions");

    // Use unified data service
    return await investorDataService.getInvestorPositions(investorId);
  }

  // Get withdrawal requests with investor details
  async getWithdrawalRequests(status?: WithdrawalStatus): Promise<any[]> {
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

  // Get fund performance data
  async getFundPerformance(fundId?: string): Promise<any[]> {
    try {
      // Fetch latest AUM snapshots from fund_daily_aum
      let aumQuery = supabase
        .from("fund_daily_aum")
        .select("fund_id, total_aum, as_of_date, aum_date, created_at")
        .eq("is_voided", false)
        .order("as_of_date", { ascending: false })
        .limit(30);

      if (fundId) {
        aumQuery = aumQuery.eq("fund_id", fundId);
      }

      const [{ data: aumData, error: aumError }, { data: funds }] = await Promise.all([
        aumQuery,
        supabase.from("funds").select("id, code, name, asset, inception_date"),
      ]);

      if (aumError) throw aumError;

      const fundMap = new Map<string, any>();
      (funds || []).forEach((f) => fundMap.set(f.id, f));

      return (aumData || []).map((row) => {
        const meta = fundMap.get(row.fund_id) || {};
        return {
          ...row,
          fund_code: meta.code,
          fund_name: meta.name,
          fund_asset: meta.asset,
          inception_date: meta.inception_date,
        };
      });
    } catch (error) {
      logError("adminService.getFundPerformance", error);
      throw error; // Throw instead of silently returning empty array
    }
  }

  // Get transaction history
  async getTransactionHistory(_userId?: string): Promise<any[]> {
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

  // Create new investor (Now creates a Profile directly)
  async createInvestor(investorData: {
    email: string;
    name: string;
    phone?: string;
    entity_type?: string;
  }): Promise<string> {
    try {
      // Check if profile exists
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", investorData.email)
        .maybeSingle();
      if (existing) throw new Error("Investor with this email already exists.");

      // We cannot create a profile without an auth user easily via client SDK
      // unless we use a specific edge function or if we are just mocking "invite".
      // But assuming this is an admin tool, we might need to use the admin invite function.

      // For now, we assume this is inserting into the 'profiles' table if policies allow,
      // but typically profiles are created via Auth Triggers.
      // If we are migrating away from 'investors' table which was likely a manual entry table,
      // we should use the 'invite_user_by_email' or insert into profiles if we have a trigger handling auth.

      // Updated logic: Update profile if exists, else error (must invite)
      throw new Error("To add an investor, please use the 'Invite Investor' feature.");
    } catch (error) {
      logError("adminService.createInvestor", error);
      throw error;
    }
  }

  // Update investor status
  async updateInvestorStatus(investorId: string, status: string): Promise<void> {
    try {
      const result = await db.update("profiles", { status }, { column: "id", value: investorId });

      if (result.error) throw new Error(result.error.userMessage);
    } catch (error) {
      logError("adminService.updateInvestorStatus", error);
      throw error;
    }
  }

  // ...

  // Bulk operations
  async bulkUpdateInvestors(investorIds: string[], updates: Record<string, any>): Promise<void> {
    try {
      const result = await db.updateIn("profiles", updates, "id", investorIds);

      if (result.error) throw new Error(result.error.userMessage);
    } catch (error) {
      logError("adminService.bulkUpdateInvestors", error);
      throw error;
    }
  }

  // Analytics methods
  async getInvestorAnalytics(timeRange: string = "30d"): Promise<any> {
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

  // Export data methods
  async exportInvestorData(format: "csv" | "json" = "json"): Promise<any> {
    try {
      const investors = await this.getAllInvestorsWithSummary();

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

  // System health checks
  async performHealthCheck(): Promise<any> {
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

  // Backup and restore
  async backupData(): Promise<string> {
    try {
      const investors = await this.getAllInvestorsWithSummary();
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
}

// Export singleton instance
export const adminInvestorService = new AdminInvestorService();
