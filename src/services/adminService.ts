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
  name?: string;
  lastActive?: string;
  totalPrincipal: string;
  totalEarned: string;
  status: 'active' | 'inactive' | 'suspended';
  total_balance: number;
  last_statement_date: string | null;
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const [investorsResult, withdrawalsResult] = await Promise.all([
      supabase.rpc('get_all_non_admin_profiles'),
      supabase.from('withdrawal_requests').select('id').eq('status', 'pending')
    ]);

    return {
      totalAUM: 0,
      investorCount: investorsResult.data?.length || 0,
      dailyInterest: 0,
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
      name: `${investor.first_name || ''} ${investor.last_name || ''}`.trim() || 'Unknown',
      lastActive: new Date().toISOString(),
      totalPrincipal: '0',
      totalEarned: '0', 
      status: 'active' as const,
      total_balance: 0,
      last_statement_date: null
    }));
  } catch (error) {
    console.error('Error getting investors:', error);
    return [];
  }
}

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

export async function listInvestors() {
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

export async function getInvestorPortfolioSummary(investorId: string) {
  // Mock data to avoid Supabase type complexity
  return {
    total_aum: 0,
    portfolio_count: 0,
    last_statement_date: null
  };
}

export async function getRecentTransactions(limit = 10) {
  // Mock data to avoid Supabase type complexity
  return [];
}

export async function listYieldSources() {
  return [];
}

export async function updateYieldSource(id: string, data: any) {
  return true;
}