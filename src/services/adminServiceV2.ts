import { supabase } from "@/integrations/supabase/client";

export interface InvestorSummaryV2 {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  totalAum: number;
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
      // Get total AUM from actual positions
      const { data: positions } = await supabase
        .from('positions')
        .select('current_balance, asset_code')
        .gt('current_balance', 0);

      const totalAum = positions?.reduce((sum, pos) => sum + Number(pos.current_balance), 0) || 0;

      // Get actual investor count (non-admin profiles with positions)
      const { data: investors } = await supabase
        .from('profiles')
        .select(`
          id,
          positions!inner (
            current_balance
          )
        `)
        .eq('is_admin', false)
        .gt('positions.current_balance', 0);

      const investorCount = investors?.length || 0;

      // Get pending withdrawals from withdrawal_requests
      const { data: withdrawals } = await supabase
        .from('withdrawal_requests')
        .select('id')
        .in('status', ['pending', 'approved']);

      const pendingWithdrawals = withdrawals?.length || 0;

      // Calculate estimated daily yield (7.2% APY on total AUM)
      const interest24h = totalAum * 0.072 / 365;

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
      // Step 1: Get all non-admin profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          created_at
        `)
        .eq('is_admin', false)
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      if (!profiles || profiles.length === 0) {
        return [];
      }

      const userIds = profiles.map(p => p.id);

      // Step 2: Get all positions for these users
      const { data: positions, error: positionsError } = await supabase
        .from('positions')
        .select(`
          user_id,
          asset_code,
          current_balance,
          total_earned,
          principal
        `)
        .in('user_id', userIds)
        .gt('current_balance', 0);

      if (positionsError) {
        console.error('Error fetching positions:', positionsError);
        // Don't throw - some users might not have positions yet
      }

      // Step 3: Get investor data if available
      const { data: investors, error: investorsError } = await supabase
        .from('investors')
        .select(`
          profile_id,
          status,
          kyc_status,
          onboarding_date
        `)
        .in('profile_id', userIds);

      if (investorsError) {
        console.error('Error fetching investors:', investorsError);
        // Don't throw - some profiles might not have investor records yet
      }

      // Step 4: Combine all data manually
      return profiles.map((profile: any) => {
        // Get positions for this profile
        const userPositions = positions?.filter(pos => pos.user_id === profile.id) || [];
        
        // Get investor data for this profile
        const investorData = investors?.find(inv => inv.profile_id === profile.id);

        // Calculate total AUM from actual positions
        const totalAum = userPositions.reduce((sum: number, pos: any) => 
          sum + Number(pos.current_balance || 0), 0);

        // Create asset breakdown from real positions
        const assetBreakdown: Record<string, number> = {};
        userPositions.forEach((pos: any) => {
          if (pos.current_balance > 0) {
            assetBreakdown[pos.asset_code] = Number(pos.current_balance);
          }
        });

        // Calculate performance metrics from real data
        const totalEarned = userPositions.reduce((sum: number, pos: any) => 
          sum + Number(pos.total_earned || 0), 0);
        const totalPrincipal = userPositions.reduce((sum: number, pos: any) => 
          sum + Number(pos.principal || 0), 0);
        
        const totalReturn = totalPrincipal > 0 ? totalEarned / totalPrincipal : 0;

        return {
          id: profile.id,
          email: profile.email,
          firstName: profile.first_name,
          lastName: profile.last_name,
          totalAum,
          status: investorData?.status || 'active',
          kycStatus: investorData?.kyc_status || 'pending',
          onboardingDate: investorData?.onboarding_date || null,
          lastStatementDate: null, // Will be populated when statements are implemented
          portfolioDetails: {
            assetBreakdown,
            performanceMetrics: {
              totalReturn,
              monthlyReturn: totalReturn / 12, // Approximation
              sharpeRatio: totalReturn > 0 ? Math.min(totalReturn * 2, 3) : 0
            }
          }
        };
      });
    } catch (error) {
      console.error('Error in getAllInvestorsWithSummary:', error);
      throw error;
    }
  }

  async getInvestorPositions(investorId: string): Promise<InvestorPositionDetail[]> {
    try {
      // Get positions from the actual positions table
      const { data: positions, error } = await supabase
        .from('positions')
        .select(`
          asset_code,
          current_balance,
          total_earned,
          principal,
          updated_at,
          last_modified_at
        `)
        .eq('user_id', investorId)
        .gt('current_balance', 0);

      if (error) {
        console.error('Error fetching investor positions:', error);
        throw error;
      }

      // Also get investor_positions data if available for fund-specific information
      const { data: fundPositions } = await supabase
        .from('investor_positions')
        .select(`
          *,
          funds (
            name,
            code,
            asset,
            fund_class
          )
        `)
        .eq('investor_id', investorId);

      // Combine both data sources
      const combinedPositions: InvestorPositionDetail[] = [];

      // Add positions from positions table
      positions?.forEach((pos: any) => {
        const fundPosition = fundPositions?.find(fp => fp.funds?.asset === pos.asset_code);
        
        combinedPositions.push({
          fundId: fundPosition?.fund_id || crypto.randomUUID(),
          fundName: fundPosition?.funds?.name || `${pos.asset_code} Position`,
          fundCode: fundPosition?.funds?.code || pos.asset_code,
          asset: pos.asset_code,
          fundClass: fundPosition?.fund_class || 'Standard',
          shares: pos.current_balance,
          currentValue: pos.current_balance,
          costBasis: pos.principal || 0,
          unrealizedPnl: pos.total_earned || 0,
          realizedPnl: 0,
          lastTransactionDate: pos.updated_at || pos.last_modified_at,
          lockUntilDate: fundPosition?.lock_until_date
        });
      });

      // Add any fund positions not covered by positions table
      fundPositions?.forEach((fp: any) => {
        if (!positions?.find(p => p.asset_code === fp.funds?.asset)) {
          combinedPositions.push({
            fundId: fp.fund_id,
            fundName: fp.funds?.name || 'Unknown Fund',
            fundCode: fp.funds?.code || 'N/A',
            asset: fp.funds?.asset || 'Unknown',
            fundClass: fp.fund_class || fp.funds?.fund_class,
            shares: fp.shares,
            currentValue: fp.current_value,
            costBasis: fp.cost_basis,
            unrealizedPnl: fp.unrealized_pnl,
            realizedPnl: fp.realized_pnl,
            lastTransactionDate: fp.last_transaction_date,
            lockUntilDate: fp.lock_until_date
          });
        }
      });

      return combinedPositions;
    } catch (error) {
      console.error('Error in getInvestorPositions:', error);
      throw error;
    }
  }

  // Get withdrawal requests with investor details
  async getWithdrawalRequests(status?: string): Promise<any[]> {
    let query = supabase
      .from('withdrawal_requests')
      .select(`
        *,
        investors!inner(name, email),
        funds!inner(name, asset, fund_class)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status as any);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  // Get recent transactions across all investors
  async getRecentTransactions(limit: number = 50): Promise<any[]> {
    const { data, error } = await supabase
      .from('transactions_v2')
      .select(`
        *,
        portfolios_v2!inner(
          name,
          profiles!inner(first_name, last_name, email)
        ),
        assets_v2!inner(name, symbol)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  // Create a new investor profile
  async createInvestorProfile(profileData: {
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
  }): Promise<any> {
    const { data, error } = await supabase.rpc('create_investor_profile', {
      p_email: profileData.email,
      p_first_name: profileData.first_name,
      p_last_name: profileData.last_name,
      p_phone: profileData.phone || null,
      p_send_invite: true
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return data as any;
  }

  // Update investor status
  async updateInvestorStatus(investorId: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('investors')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', investorId);

    if (error) throw error;
  }

  // Approve withdrawal request
  async approveWithdrawal(
    requestId: string, 
    approvedAmount?: number, 
    adminNotes?: string
  ): Promise<void> {
    const { error } = await supabase.rpc('approve_withdrawal', {
      p_request_id: requestId,
      p_approved_amount: approvedAmount || null,
      p_admin_notes: adminNotes || null
    });

    if (error) throw error;
  }

  // Reject withdrawal request
  async rejectWithdrawal(
    requestId: string, 
    reason: string, 
    adminNotes?: string
  ): Promise<void> {
    const { error } = await supabase.rpc('reject_withdrawal', {
      p_request_id: requestId,
      p_reason: reason,
      p_admin_notes: adminNotes || null
    });

    if (error) throw error;
  }

  // Start processing withdrawal
  async startProcessingWithdrawal(
    requestId: string,
    processedAmount?: number,
    txHash?: string,
    settlementDate?: string,
    adminNotes?: string
  ): Promise<void> {
    const { error } = await supabase.rpc('start_processing_withdrawal', {
      p_request_id: requestId,
      p_processed_amount: processedAmount || null,
      p_tx_hash: txHash || null,
      p_settlement_date: settlementDate ? new Date(settlementDate).toISOString().split('T')[0] : null,
      p_admin_notes: adminNotes || null
    });

    if (error) throw error;
  }

  // Complete withdrawal
  async completeWithdrawal(
    requestId: string,
    txHash?: string,
    adminNotes?: string
  ): Promise<void> {
    const { error } = await supabase.rpc('complete_withdrawal', {
      p_request_id: requestId,
      p_tx_hash: txHash || null,
      p_admin_notes: adminNotes || null
    });

    if (error) throw error;
  }

  // Generate statement for investor
  async generateStatement(
    investorId: string, 
    year: number, 
    month: number
  ): Promise<any> {
    const { data, error } = await supabase.rpc('generate_statement_data', {
      p_investor_id: investorId,
      p_period_year: year,
      p_period_month: month
    });

    if (error) throw error;
    return data;
  }

  // Get audit logs for admin actions
  async getAuditLogs(limit: number = 100): Promise<any[]> {
    const { data, error } = await supabase
      .from('audit_log')
      .select(`
        *,
        profiles!inner(first_name, last_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  // Backfill historical data
  async backfillHistoricalData(startDate?: string, endDate?: string): Promise<any> {
    const { data, error } = await supabase.rpc('backfill_historical_positions', {
      p_start_date: startDate || '2024-06-01',
      p_end_date: endDate || new Date().toISOString().split('T')[0]
    });

    if (error) throw error;
    return data;
  }

  // Get historical position data
  async getHistoricalPositionData(
    userId?: string,
    assetCode?: string,
    startDate?: string,
    endDate?: string
  ): Promise<any[]> {
    const { data, error } = await supabase.rpc('get_historical_position_data', {
      p_user_id: userId || null,
      p_asset_code: assetCode || null,
      p_start_date: startDate || '2024-06-01',
      p_end_date: endDate || new Date().toISOString().split('T')[0]
    });

    if (error) throw error;
    return data || [];
  }
}

export const adminServiceV2 = new AdminServiceV2();