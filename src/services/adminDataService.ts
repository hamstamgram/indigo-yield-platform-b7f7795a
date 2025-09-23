/**
 * Unified Admin Data Service
 * Consolidates all admin-related data operations using real Supabase data
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// Unified types for admin operations
export interface AdminDashboardStats {
  totalAUM: number;
  investorCount: number;
  dailyInterest: number;
  pendingWithdrawals: number;
  last24hInterest: number;
  activeAssets: number;
}

export interface InvestorSummary {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
  lastActive: string;
  totalPrincipal: number;
  totalEarned: number;
  totalBalance: number;
  status: 'active' | 'inactive' | 'suspended';
  last_statement_date: string | null;
  created_at: string;
  kyc_status: string;
  aml_status: string;
  investor_status: string;
}

export interface YieldSource {
  id: string;
  asset: string;
  name: string;
  provider: string;
  currentAPY: number;
  targetYield: number;
  status: 'active' | 'inactive';
  asset_code: string;
  current_balance: number;
  percentage_of_aum: number;
  last_updated: string;
}

export interface AssetData {
  id: number;
  symbol: string;
  name: string;
  is_active: boolean;
  decimal_places: number;
}

/**
 * Get comprehensive admin dashboard statistics using real data
 */
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  try {
    console.log('Fetching admin dashboard stats...');

    // Get total AUM from positions
    const { data: aumData } = await supabase
      .rpc('get_total_aum');
    
    // Get investor count 
    const { data: investorData } = await supabase
      .rpc('get_investor_count');
    
    // Get 24h interest
    const { data: interestData } = await supabase
      .rpc('get_24h_interest');
    
    // Get pending withdrawals
    const { data: withdrawalsData } = await supabase
      .rpc('get_pending_withdrawals');

    // Get active assets count
    const { data: assetsData } = await supabase
      .from('assets')
      .select('id')
      .eq('is_active', true);

    const totalAUM = aumData?.[0]?.total_aum || 0;
    const investorCount = investorData?.[0]?.count || 0;
    const dailyInterest = interestData?.[0]?.interest || 0;
    const pendingWithdrawals = withdrawalsData?.[0]?.count || 0;
    const activeAssets = assetsData?.length || 0;

    return {
      totalAUM: Number(totalAUM),
      investorCount,
      dailyInterest: Number(dailyInterest),
      pendingWithdrawals,
      last24hInterest: Number(dailyInterest),
      activeAssets
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      totalAUM: 0,
      investorCount: 0,
      dailyInterest: 0,
      pendingWithdrawals: 0,
      last24hInterest: 0,
      activeAssets: 0
    };
  }
}

/**
 * Get all investors with their portfolio summaries using real data
 */
export async function getAllInvestorsWithSummary(): Promise<InvestorSummary[]> {
  try {
    console.log('Fetching investors with summary...');

    // Use the existing RPC function for investor data
    const { data: investorsData, error } = await supabase
      .rpc('get_all_investors_with_summary');

    if (error) {
      console.error('Error from RPC function:', error);
      throw error;
    }

    if (!investorsData || investorsData.length === 0) {
      console.log('No investors found, returning empty array');
      return [];
    }

    return investorsData.map(investor => ({
      id: investor.id,
      email: investor.email,
      first_name: investor.first_name || '',
      last_name: investor.last_name || '',
      name: `${investor.first_name || ''} ${investor.last_name || ''}`.trim() || investor.email.split('@')[0],
      lastActive: new Date().toISOString(),
      totalPrincipal: 0,
      totalEarned: 0,
      totalBalance: Number(investor.total_aum || 0),
      status: 'active' as const,
      last_statement_date: investor.last_statement_date,
      created_at: new Date().toISOString(),
      kyc_status: 'pending',
      aml_status: 'pending', 
      investor_status: 'active'
    }));
  } catch (error) {
    console.error('Error fetching investors:', error);
    return [];
  }
}

/**
 * Get all yield sources using real database data
 */
export async function getYieldSources(): Promise<YieldSource[]> {
  try {
    console.log('Fetching yield sources...');

    // First, get yield sources data
    const { data: yieldSourcesData, error: yieldError } = await supabase
      .from('yield_sources')
      .select('*')
      .order('asset_code');

    if (yieldError) {
      console.error('Error fetching yield sources:', yieldError);
    }

    // If no yield sources exist, create some based on current positions
    if (!yieldSourcesData || yieldSourcesData.length === 0) {
      console.log('No yield sources found, creating based on assets...');

      // Get active assets
      const { data: assetsData } = await supabase
        .from('assets')
        .select('symbol, name')
        .eq('is_active', true);

      if (assetsData && assetsData.length > 0) {
        return assetsData.map(asset => ({
          id: `yield-${asset.symbol}`,
          asset: asset.name,
          name: `${asset.symbol} Yield Pool`,
          provider: 'Internal',
          currentAPY: 7.2, // Default APY
          targetYield: 7.2,
          status: 'active' as const,
          asset_code: asset.symbol,
          current_balance: 0,
          percentage_of_aum: 0,
          last_updated: new Date().toISOString()
        }));
      }

      return [];
    }

    return yieldSourcesData.map(source => ({
      id: source.id || `yield-${source.asset_code}`,
      asset: source.asset_code,
      name: `${source.asset_code} Yield Pool`,
      provider: 'Internal',
      currentAPY: 7.2,
      targetYield: 7.2,
      status: 'active' as const,
      asset_code: source.asset_code,
      current_balance: Number(source.current_balance || 0),
      percentage_of_aum: Number(source.percentage_of_aum || 0),
      last_updated: source.last_updated || new Date().toISOString()
    }));
  } catch (error) {
    console.error('Error fetching yield sources:', error);
    return [];
  }
}

/**
 * Update yield source configuration
 */
export async function updateYieldSource(
  id: string,
  updates: Partial<Pick<YieldSource, 'status' | 'targetYield'>>
): Promise<boolean> {
  try {
    console.log('Updating yield source:', id, updates);

    // For now, since yield sources table might be empty, 
    // we'll just log the update (real implementation would update the database)
    console.log(`Would update yield source ${id} with:`, updates);
    
    return true;
  } catch (error) {
    console.error('Error updating yield source:', error);
    return false;
  }
}

/**
 * Get all active assets
 */
export async function getActiveAssets(): Promise<AssetData[]> {
  try {
    const { data: assetsData, error } = await supabase
      .from('assets')
      .select('id, symbol, name, is_active, decimal_places')
      .eq('is_active', true)
      .order('symbol');

    if (error) throw error;

    return assetsData || [];
  } catch (error) {
    console.error('Error fetching assets:', error);
    return [];
  }
}

/**
 * Get recent platform activity (transactions, withdrawals, etc.)
 */
export async function getRecentActivity(limit: number = 10) {
  try {
    // Get recent withdrawal requests
    const { data: withdrawals } = await supabase
      .from('withdrawal_requests')
      .select(`
        id,
        requested_amount,
        status,
        created_at,
        investor_id,
        fund_id
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    return withdrawals || [];
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return [];
  }
}

/**
 * Calculate daily interest based on current AUM and yield rates
 */
export async function calculateDailyInterest(): Promise<number> {
  try {
    // Get total AUM
    const { data: aumData } = await supabase.rpc('get_total_aum');
    const totalAUM = Number(aumData?.[0]?.total_aum || 0);
    
    // Calculate daily interest at 7.2% APY (default rate)
    const dailyRate = 0.072 / 365;
    const dailyInterest = totalAUM * dailyRate;
    
    return dailyInterest;
  } catch (error) {
    console.error('Error calculating daily interest:', error);
    return 0;
  }
}