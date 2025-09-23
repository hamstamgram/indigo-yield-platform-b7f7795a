/**
 * Fund Service - Enhanced fund management with investor allocation
 */

import { supabase } from '@/integrations/supabase/client';

export interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
  fund_class: string;
  status: string;
  inception_date: string;
  mgmt_fee_bps?: number;
  perf_fee_bps?: number;
  min_investment?: number;
  strategy?: string;
  created_at: string;
  updated_at: string;
}

export interface InvestorPosition {
  investor_id: string;
  fund_id: string;
  fund_class: string;
  shares: number;
  cost_basis: number;
  current_value: number;
  unrealized_pnl: number;
  realized_pnl: number;
  aum_percentage: number;
  last_transaction_date?: string;
}

/**
 * Get all active funds
 */
export async function getAllFunds(): Promise<Fund[]> {
  try {
    const { data, error } = await supabase
      .from('funds')
      .select('*')
      .eq('status', 'active')
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching funds:', error);
    return [];
  }
}

/**
 * Get fund by ID
 */
export async function getFundById(fundId: string): Promise<Fund | null> {
  try {
    const { data, error } = await supabase
      .from('funds')
      .select('*')
      .eq('id', fundId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching fund:', error);
    return null;
  }
}

/**
 * Add fund to investor portfolio
 */
export async function addFundToInvestor(
  investorId: string,
  fundId: string,
  initialInvestment: number = 0
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('add_fund_to_investor', {
      p_investor_id: investorId,
      p_fund_id: fundId,
      p_initial_investment: initialInvestment
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error adding fund to investor:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to add fund'
    };
  }
}

/**
 * Get investor positions by investor ID
 */
export async function getInvestorPositions(investorId: string): Promise<InvestorPosition[]> {
  try {
    const { data, error } = await supabase
      .from('investor_positions')
      .select(`
        *,
        fund:funds (
          id,
          code,
          name,
          asset,
          fund_class
        )
      `)
      .eq('investor_id', investorId)
      .order('current_value', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching investor positions:', error);
    return [];
  }
}

/**
 * Update investor position
 */
export async function updateInvestorPosition(
  investorId: string,
  fundId: string,
  updates: Partial<InvestorPosition>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('investor_positions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('investor_id', investorId)
      .eq('fund_id', fundId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error updating investor position:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update position'
    };
  }
}

/**
 * Get investor's available funds (funds they don't have positions in)
 */
export async function getAvailableFundsForInvestor(investorId: string): Promise<Fund[]> {
  try {
    // Get all active funds
    const { data: allFunds, error: fundsError } = await supabase
      .from('funds')
      .select('*')
      .eq('status', 'active');

    if (fundsError) throw fundsError;

    // Get investor's current positions
    const { data: positions, error: positionsError } = await supabase
      .from('investor_positions')
      .select('fund_id')
      .eq('investor_id', investorId);

    if (positionsError) throw positionsError;

    const existingFundIds = new Set(positions?.map(p => p.fund_id) || []);
    
    // Filter out funds where investor already has positions
    return (allFunds || []).filter(fund => !existingFundIds.has(fund.id));
  } catch (error) {
    console.error('Error fetching available funds:', error);
    return [];
  }
}

/**
 * Remove fund from investor portfolio
 */
export async function removeFundFromInvestor(
  investorId: string,
  fundId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('investor_positions')
      .delete()
      .eq('investor_id', investorId)
      .eq('fund_id', fundId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error removing fund from investor:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to remove fund'
    };
  }
}

/**
 * Get fund performance summary
 */
export async function getFundPerformanceSummary(fundId: string) {
  try {
    const { data: positions, error } = await supabase
      .from('investor_positions')
      .select('*')
      .eq('fund_id', fundId);

    if (error) throw error;

    const summary = {
      totalInvestors: positions?.length || 0,
      totalAUM: positions?.reduce((sum, p) => sum + (p.current_value || 0), 0) || 0,
      totalCostBasis: positions?.reduce((sum, p) => sum + (p.cost_basis || 0), 0) || 0,
      totalUnrealizedPnL: positions?.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0) || 0,
      totalRealizedPnL: positions?.reduce((sum, p) => sum + (p.realized_pnl || 0), 0) || 0
    };

    return summary;
  } catch (error) {
    console.error('Error fetching fund performance:', error);
    return {
      totalInvestors: 0,
      totalAUM: 0,
      totalCostBasis: 0,
      totalUnrealizedPnL: 0,
      totalRealizedPnL: 0
    };
  }
}