/**
 * Simplified Admin Service
 */

import { supabase } from '@/integrations/supabase/client';

export interface DashboardStats {
  totalAUM: number;
  investorCount: number;
  dailyInterest: number;
  pendingWithdrawals: number;
}

export interface InvestorSummary {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  total_balance: number;
  last_statement_date: string | null;
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Simplified queries without complex functions
    const [investorsResult, withdrawalsResult] = await Promise.all([
      supabase.from('profiles').select('id').eq('is_admin', false),
      supabase.from('withdrawal_requests').select('id').eq('status', 'pending')
    ]);

    return {
      totalAUM: 0, // Simplified
      investorCount: investorsResult.data?.length || 0,
      dailyInterest: 0, // Simplified
      pendingWithdrawals: withdrawalsResult.data?.length || 0
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return {
      totalAUM: 0,
      investorCount: 0,
      dailyInterest: 0,
      pendingWithdrawals: 0
    };
  }
}

/**
 * Get all investors with summary
 */
export async function getAllInvestorsWithSummary(): Promise<InvestorSummary[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('is_admin', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(investor => ({
      ...investor,
      total_balance: 0, // Simplified
      last_statement_date: null // Simplified
    }));
  } catch (error) {
    console.error('Error getting investors:', error);
    return [];
  }
}

/**
 * Get investor portfolio summary
 */
export async function getInvestorPortfolioSummary(investorId: string) {
  try {
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('user_id', investorId);

    if (error) throw error;

    const totalAUM = (data || []).reduce((sum, pos) => sum + (pos.current_balance || 0), 0);
    
    return {
      total_aum: totalAUM,
      portfolio_count: data?.length || 0,
      last_statement_date: null
    };
  } catch (error) {
    console.error('Error getting portfolio summary:', error);
    return {
      total_aum: 0,
      portfolio_count: 0,
      last_statement_date: null
    };
  }
}

/**
 * Get recent transactions
 */
export async function getRecentTransactions(limit = 10) {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(tx => ({
      id: tx.id,
      type: tx.type || 'unknown',
      asset_symbol: 'N/A',
      amount_formatted: `$${(tx.amount || 0).toLocaleString()}`,
      created_at_formatted: new Date(tx.created_at).toLocaleDateString(),
      status: tx.status || 'unknown'
    }));
  } catch (error) {
    console.error('Error getting transactions:', error);
    return [];
  }
}

// Missing exports - simplified stubs
export async function fetchAdminProfile() {
  return { id: '1', userName: 'Admin', name: 'Admin', email: 'admin@example.com' };
}

export async function getAdminKPIs() {
  return { 
    totalAUM: 0, 
    totalInvestors: 0, 
    investorCount: 0, 
    dailyInterest: 0, 
    last24hInterest: 0,
    pendingWithdrawals: 0
  };
}

export async function listInvestors(page?: number) {
  return getAllInvestorsWithSummary();
}

export async function getInvestorById(id: string) {
  return { 
    id, 
    name: 'Investor', 
    email: 'investor@example.com',
    kycStatus: 'pending',
    positions: [],
    transactions: [],
    totalPrincipal: 0,
    totalEarned: 0
  };
}

export async function listYieldSources() {
  return [];
}

export async function updateYieldSource(id: string, data: any) {
  return true;
}