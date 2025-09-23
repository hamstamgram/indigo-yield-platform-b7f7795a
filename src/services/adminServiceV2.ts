import { supabase } from "@/integrations/supabase/client";

export interface InvestorSummaryV2 {
  id: string;
  profile_id: string;
  name: string;
  email: string;
  first_name?: string;
  last_name?: string;
  total_aum: number;
  positions_count: number;
  last_transaction_date?: string;
  status: string;
  created_at: string;
  kyc_status: string;
  aml_status: string;
}

export interface DashboardStatsV2 {
  total_aum: number;
  total_investors: number;
  pending_withdrawals: number;
  daily_yield_generated: number;
  active_positions: number;
  total_yield_distributed: number;
}

export interface InvestorPositionDetail {
  investor_id: string;
  fund_id: string;
  fund_name: string;
  fund_class: string;
  asset: string;
  shares: number;
  cost_basis: number;
  current_value: number;
  unrealized_pnl: number;
  realized_pnl: number;
  last_transaction_date?: string;
}

class AdminServiceV2 {
  // Get comprehensive dashboard statistics
  async getDashboardStats(): Promise<DashboardStatsV2> {
    // Execute multiple queries in parallel for efficiency
    const [
      aumResult,
      investorsResult, 
      withdrawalsResult,
      positionsResult,
      yieldResult
    ] = await Promise.all([
      // Total AUM from investor positions
      supabase
        .from('investor_positions')
        .select('current_value'),
      
      // Total unique investors
      supabase
        .from('investors')
        .select('id', { count: 'exact', head: true }),
      
      // Pending withdrawals
      supabase
        .from('withdrawal_requests')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'approved']),
      
      // Active positions count
      supabase
        .from('investor_positions')
        .select('investor_id', { count: 'exact', head: true })
        .gt('current_value', 0),
      
      // Recent yield applications (last 30 days)
      supabase
        .from('daily_yield_applications')
        .select('total_yield_generated')
        .gte('application_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    ]);

    const totalAUM = aumResult.data?.reduce((sum, pos) => sum + Number(pos.current_value), 0) || 0;
    const totalYieldDistributed = yieldResult.data?.reduce((sum, app) => sum + Number(app.total_yield_generated), 0) || 0;

    return {
      total_aum: totalAUM,
      total_investors: investorsResult.count || 0,
      pending_withdrawals: withdrawalsResult.count || 0,
      daily_yield_generated: totalYieldDistributed / 30, // Average daily yield
      active_positions: positionsResult.count || 0,
      total_yield_distributed: totalYieldDistributed
    };
  }

  // Get all investors with comprehensive summary data
  async getAllInvestorsWithSummary(): Promise<InvestorSummaryV2[]> {
    const { data, error } = await supabase
      .from('investors')
      .select(`
        id,
        profile_id,
        name,
        email,
        status,
        kyc_status,
        aml_status,
        created_at,
        profiles!inner(first_name, last_name, email),
        investor_positions(
          current_value,
          last_transaction_date
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(investor => ({
      id: investor.id,
      profile_id: investor.profile_id,
      name: investor.name,
      email: investor.email,
      first_name: investor.profiles.first_name,
      last_name: investor.profiles.last_name,
      status: investor.status,
      kyc_status: investor.kyc_status,
      aml_status: investor.aml_status,
      created_at: investor.created_at,
      total_aum: investor.investor_positions.reduce((sum: number, pos: any) => sum + Number(pos.current_value), 0),
      positions_count: investor.investor_positions.length,
      last_transaction_date: investor.investor_positions.reduce((latest: string | null, pos: any) => {
        if (!pos.last_transaction_date) return latest;
        if (!latest) return pos.last_transaction_date;
        return pos.last_transaction_date > latest ? pos.last_transaction_date : latest;
      }, null)
    }));
  }

  // Get detailed positions for a specific investor
  async getInvestorPositions(investorId: string): Promise<InvestorPositionDetail[]> {
    const { data, error } = await supabase
      .from('investor_positions')
      .select(`
        investor_id,
        fund_id,
        fund_class,
        shares,
        cost_basis,
        current_value,
        unrealized_pnl,
        realized_pnl,
        last_transaction_date,
        funds!inner(name, asset)
      `)
      .eq('investor_id', investorId);

    if (error) throw error;

    return data.map(position => ({
      investor_id: position.investor_id,
      fund_id: position.fund_id,
      fund_name: position.funds.name,
      fund_class: position.fund_class,
      asset: position.funds.asset,
      shares: Number(position.shares),
      cost_basis: Number(position.cost_basis),
      current_value: Number(position.current_value),
      unrealized_pnl: Number(position.unrealized_pnl),
      realized_pnl: Number(position.realized_pnl),
      last_transaction_date: position.last_transaction_date
    }));
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
}

export const adminServiceV2 = new AdminServiceV2();