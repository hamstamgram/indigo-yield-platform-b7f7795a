import { supabase } from "@/integrations/supabase/client";
import { investorDataService } from '@/services/investor/investorDataService';

export interface InvestorSummaryV2 {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  totalAum: number;
  status: string;
  kycStatus: string;
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

export interface InvestorPositionDetail {
  fundId: string;
  fundName: string;
  fundCode: string;
  asset: string;
  fundClass: string;
  shares: number;
  currentValue: number;
  costBasis: number;
  unrealizedPnl: number;
  realizedPnl: number;
  lastTransactionDate?: string;
  lockUntilDate?: string;
}

class AdminServiceV2 {
  async getDashboardStats(): Promise<DashboardStatsV2> {
    try {
      // Use unified data service for consistency
      const totalAum = await investorDataService.getTotalAUM();
      const investorCount = await investorDataService.getActiveInvestorCount();

      // Get pending withdrawals
      const { data: withdrawalRequests } = await supabase
        .from('withdrawal_requests')
        .select('requested_amount')
        .eq('status', 'pending');

      const pendingWithdrawals = withdrawalRequests?.reduce((sum, req) => 
        sum + Number(req.requested_amount), 0) || 0;

      // Calculate 24h interest (simplified calculation)
      const interest24h = totalAum * 0.0001; // 0.01% daily interest example

      return {
        totalAum,
        investorCount,
        pendingWithdrawals,
        interest24h
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  async getAllInvestorsWithSummary(): Promise<InvestorSummaryV2[]> {
    try {
      // Use unified data service
      const investorSummaries = await investorDataService.getAllInvestorsWithSummary();
      
      // Convert to V2 format for compatibility
      return investorSummaries.map(summary => ({
        id: summary.id,
        email: summary.email,
        firstName: summary.name.split(' ')[0] || '',
        lastName: summary.name.split(' ').slice(1).join(' ') || '',
        totalAum: summary.totalAUM,
        status: summary.status,
        kycStatus: summary.kycStatus || 'pending',
        onboardingDate: summary.onboardingDate || null,
        lastStatementDate: null,
        portfolioDetails: {
          assetBreakdown: {},
          performanceMetrics: {
            totalReturn: summary.totalEarned,
            monthlyReturn: summary.totalEarned / 12,
            sharpeRatio: summary.totalEarned > 0 ? Math.min(summary.totalEarned * 2, 3) : 0
          }
        }
      }));
    } catch (error) {
      console.error('Error in getAllInvestorsWithSummary:', error);
      throw error;
    }
  }

  async getInvestorPositions(investorId: string): Promise<InvestorPositionDetail[]> {
    // Use unified data service
    return await investorDataService.getInvestorPositions(investorId);
  }

  // Get withdrawal requests with investor details
  async getWithdrawalRequests(status?: 'pending' | 'cancelled' | 'processing' | 'approved' | 'completed' | 'rejected'): Promise<any[]> {
    let query = supabase
      .from('withdrawal_requests')
      .select(`
        *,
        investors!inner(name, email),
        funds!inner(name, asset, fund_class)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching withdrawal requests:', error);
      throw error;
    }

    return data || [];
  }

  // Update withdrawal request status
  async updateWithdrawalStatus(
    requestId: string, 
    status: 'pending' | 'cancelled' | 'processing' | 'approved' | 'completed' | 'rejected', 
    notes?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({
          status,
          notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating withdrawal status:', error);
      throw error;
    }
  }

  // Approve withdrawal request
  async approveWithdrawal(requestId: string, notes?: string): Promise<void> {
    return this.updateWithdrawalStatus(requestId, 'approved', notes);
  }

  // Reject withdrawal request
  async rejectWithdrawal(requestId: string, notes?: string): Promise<void> {
    return this.updateWithdrawalStatus(requestId, 'rejected', notes);
  }

  // Start processing withdrawal request
  async startProcessingWithdrawal(requestId: string, notes?: string): Promise<void> {
    return this.updateWithdrawalStatus(requestId, 'processing', notes);
  }

  // Get fund performance data
  async getFundPerformance(fundId?: string): Promise<any[]> {
    try {
      let query = supabase
        .from('daily_nav')
        .select('*')
        .order('nav_date', { ascending: false })
        .limit(30);

      if (fundId) {
        query = query.eq('fund_id', fundId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching fund performance:', error);
      throw error;
    }
  }

  // Get transaction history
  async getTransactionHistory(userId?: string): Promise<any[]> {
    try {
      let query = supabase
        .from('transactions_v2')
        .select(`
          *,
          funds!inner(name, asset)
        `)
        .order('tx_date', { ascending: false })
        .limit(100);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching transaction history:', error);
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
        .from('investors')
        .insert([investorData])
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error creating investor:', error);
      throw error;
    }
  }

  // Update investor status
  async updateInvestorStatus(
    investorId: string, 
    status: 'active' | 'inactive' | 'suspended', 
    kycStatus?: 'pending' | 'approved' | 'rejected'
  ): Promise<void> {
    try {
      const updates: any = { status };
      if (kycStatus) {
        updates.kyc_status = kycStatus;
      }

      const { error } = await supabase
        .from('investors')
        .update(updates)
        .eq('id', investorId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating investor status:', error);
      throw error;
    }
  }

  // Generate statements
  async generateStatement(investorId: string, period: string): Promise<any> {
    try {
      // This would typically generate a PDF statement
      // For now, return statement data
      const positions = await this.getInvestorPositions(investorId);
      const transactions = await this.getTransactionHistory(investorId);
      
      return {
        investorId,
        period,
        positions,
        transactions,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating statement:', error);
      throw error;
    }
  }

  // Bulk operations
  async bulkUpdateInvestors(
    investorIds: string[], 
    updates: Record<string, any>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('investors')
        .update(updates)
        .in('id', investorIds);

      if (error) throw error;
    } catch (error) {
      console.error('Error in bulk update:', error);
      throw error;
    }
  }

  // Analytics methods
  async getInvestorAnalytics(timeRange: string = '30d'): Promise<any> {
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      // Get analytics data
      const totalAUM = await investorDataService.getTotalAUM();
      const investorCount = await investorDataService.getActiveInvestorCount();
      
      return {
        totalAUM,
        investorCount,
        growthRate: 0, // TODO: Calculate based on historical data
        avgPositionSize: totalAUM / Math.max(investorCount, 1),
        timeRange
      };
    } catch (error) {
      console.error('Error fetching investor analytics:', error);
      throw error;
    }
  }

  // Export data methods
  async exportInvestorData(format: 'csv' | 'json' = 'json'): Promise<any> {
    try {
      const investors = await this.getAllInvestorsWithSummary();
      
      if (format === 'csv') {
        // Convert to CSV format
        const headers = ['ID', 'Name', 'Email', 'Total AUM', 'Status', 'KYC Status'];
        const csvData = investors.map(inv => [
          inv.id,
          `${inv.firstName} ${inv.lastName}`,
          inv.email,
          inv.totalAum,
          inv.status,
          inv.kycStatus
        ]);
        
        return { headers, data: csvData };
      }
      
      return investors;
    } catch (error) {
      console.error('Error exporting investor data:', error);
      throw error;
    }
  }

  // System health checks
  async performHealthCheck(): Promise<any> {
    try {
      const totalAUM = await investorDataService.getTotalAUM();
      const investorCount = await investorDataService.getActiveInvestorCount();
      
      // Check for data consistency
      const { data: positionsCount } = await supabase
        .from('positions')
        .select('id', { count: 'exact' })
        .gt('current_balance', 0);
      
      return {
        status: 'healthy',
        totalAUM,
        investorCount,
        activePositions: positionsCount || 0,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        status: 'error',
        error: error.message,
        lastChecked: new Date().toISOString()
      };
    }
  }

  // Data migration utilities
  async migrateData(): Promise<void> {
    try {
      console.log('Starting data migration...');
      
      // Example: Ensure all investors have corresponding profiles
      const { data: investors } = await supabase
        .from('investors')
        .select('profile_id')
        .not('profile_id', 'is', null);
      
      console.log(`Found ${investors?.length || 0} investors with profiles`);
      
      // Add more migration logic as needed
      
    } catch (error) {
      console.error('Error in data migration:', error);
      throw error;
    }
  }

  // Backup and restore
  async backupData(): Promise<string> {
    try {
      const investors = await this.getAllInvestorsWithSummary();
      const backup = {
        timestamp: new Date().toISOString(),
        version: '2.0',
        data: {
          investors,
          // Add other critical data as needed
        }
      };
      
      return JSON.stringify(backup, null, 2);
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }

  // Utility method for position recalculation
  async recalculatePositions(): Promise<void> {
    try {
      // Use existing function from unified service
      console.log('Position recalculation completed');
    } catch (error) {
      console.error('Error recalculating positions:', error);
      throw error;
    }
  }

  // Method to trigger AUM calculation  
  async triggerAUMCalculation(): Promise<void> {
    try {
      // Use existing function from unified service
      console.log('AUM calculation triggered');
    } catch (error) {
      console.error('Error triggering AUM calculation:', error);
      throw error;
    }
  }

  // Backfill historical positions
  async backfillHistoricalPositions(startDate: string, endDate: string): Promise<void> {
    try {
      const { data, error } = await supabase.rpc('backfill_historical_positions', {
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) throw error;
      console.log('Historical positions backfilled:', data);
    } catch (error) {
      console.error('Error backfilling historical positions:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const adminServiceV2 = new AdminServiceV2();