import { supabase } from "@/integrations/supabase/client";
import { investorDataService } from "@/services/investor/investorDataService";
import type { InvestorPositionDetail } from "@/services/investor/investorDataService";

type WithdrawalStatus =
  | "pending"
  | "cancelled"
  | "processing"
  | "approved"
  | "completed"
  | "rejected";

export interface InvestorSummaryV2 {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  totalAum: number;
  status: string;
  onboardingDate: string | null;
  lastStatementDate: string | null;
  portfolioDetails: {
    assetBreakdown: Record<string, number>;
    performanceMetrics: {
      totalReturn: number;
      monthlyReturn: number;
      sharpeRatio: number;
    };
  };
}

export interface DashboardStatsV2 {
  totalAum: number;
  investorCount: number;
  pendingWithdrawals: number;
  interest24h: number;
}

class AdminServiceV2 {
  async getDashboardStats(): Promise<DashboardStatsV2> {
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
      console.error("Error fetching dashboard stats:", error);
      throw error;
    }
  }

  async getAllInvestorsWithSummary(): Promise<InvestorSummaryV2[]> {
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
        lastStatementDate: null,
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
      console.error("Error in getAllInvestorsWithSummary:", error);
      throw error;
    }
  }

  async getInvestorPositions(investorId: string): Promise<InvestorPositionDetail[]> {
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
      console.error("Error fetching withdrawal requests:", error);
      throw error;
    }
  }

  // Update withdrawal request status
  async updateWithdrawalStatus(
    requestId: string,
    status: WithdrawalStatus,
    notes?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from("withdrawal_requests")
        .update({
          status,
          notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating withdrawal status:", error);
      throw error;
    }
  }

  // Approve withdrawal request
  async approveWithdrawal(requestId: string, amount?: number, notes?: string): Promise<void> {
    try {
      const updates: Record<string, any> = {
        status: "approved" as WithdrawalStatus,
        notes,
        updated_at: new Date().toISOString(),
      };

      if (amount !== undefined) {
        updates.approved_amount = amount;
      }

      const { error } = await supabase
        .from("withdrawal_requests")
        .update(updates)
        .eq("id", requestId);

      if (error) throw error;
    } catch (error) {
      console.error("Error approving withdrawal:", error);
      throw error;
    }
  }

  // Reject withdrawal request
  async rejectWithdrawal(requestId: string, reason?: string, notes?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("withdrawal_requests")
        .update({
          status: "rejected" as WithdrawalStatus,
          rejection_reason: reason,
          notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;
    } catch (error) {
      console.error("Error rejecting withdrawal:", error);
      throw error;
    }
  }

  // Start processing withdrawal request
  async startProcessingWithdrawal(
    requestId: string,
    amount?: number,
    txHash?: string,
    settlementDate?: string,
    notes?: string
  ): Promise<void> {
    try {
      const updates: Record<string, any> = {
        status: "processing" as WithdrawalStatus,
        notes,
        updated_at: new Date().toISOString(),
      };

      if (amount !== undefined) {
        updates.processed_amount = amount;
      }
      if (txHash) {
        updates.transaction_hash = txHash;
      }
      if (settlementDate) {
        updates.settlement_date = settlementDate;
      }

      const { error } = await supabase
        .from("withdrawal_requests")
        .update(updates)
        .eq("id", requestId);

      if (error) throw error;
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      throw error;
    }
  }

  // Get fund performance data
  // Note: fund_daily_aum table doesn't exist yet - using funds table as fallback
  async getFundPerformance(fundId?: string): Promise<any[]> {
    try {
      let query = supabase
        .from("funds")
        .select("id, code, name, asset, nav, aum, inception_date, updated_at")
        .order("updated_at", { ascending: false })
        .limit(30);

      if (fundId) {
        query = query.eq("id", fundId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching fund performance:", error);
      return [];
    }
  }

  // Get transaction history
  async getTransactionHistory(_userId?: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("transactions_v2")
        .select("*")
        .order("tx_date", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching transaction history:", error);
      throw error;
    }
  }

  // Create new investor
  async createInvestor(investorData: {
    email: string;
    name: string;
    phone?: string;
    entity_type?: string;
  }): Promise<string> {
    try {
      const { data, error } = await supabase
        .from("investors")
        .insert([investorData])
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Failed to create investor");
      return data.id;
    } catch (error) {
      console.error("Error creating investor:", error);
      throw error;
    }
  }

  // Update investor status
  async updateInvestorStatus(investorId: string, status: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("investors")
        .update({ status })
        .eq("id", investorId);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating investor status:", error);
      throw error;
    }
  }

  // Generate statements
  async generateStatement(investorId: string, period: string): Promise<any> {
    try {
      const positions = await this.getInvestorPositions(investorId);
      const transactions = await this.getTransactionHistory(investorId);

      return {
        investorId,
        period,
        positions,
        transactions,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error generating statement:", error);
      throw error;
    }
  }

  // Bulk operations
  async bulkUpdateInvestors(investorIds: string[], updates: Record<string, any>): Promise<void> {
    try {
      const { error } = await supabase.from("investors").update(updates).in("id", investorIds);

      if (error) throw error;
    } catch (error) {
      console.error("Error in bulk update:", error);
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
      console.error("Error fetching investor analytics:", error);
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
      console.error("Error exporting investor data:", error);
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
      console.error("Health check failed:", error);
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
      console.error("Error creating backup:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const adminServiceV2 = new AdminServiceV2();
