/**
 * AUM (Assets Under Management) Service
 * Handles fund AUM management and yield distribution
 */

import { supabase } from '@/integrations/supabase/client';

export interface FundAUM {
  id: string;
  fund_id: string;
  aum_date: string;
  total_aum: number;
  investor_count: number;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  fund?: {
    code: string;
    name: string;
    asset: string;
    fund_class: string;
  };
}

export interface YieldDistributionResult {
  success: boolean;
  application_id: string;
  fund_aum: number;
  total_yield_generated: number;
  investors_affected: number;
}

/**
 * Set daily AUM for a fund
 */
export async function setFundDailyAUM(
  fundId: string,
  aumAmount: number,
  aumDate?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('set_fund_daily_aum', {
      p_fund_id: fundId,
      p_aum_amount: aumAmount,
      p_aum_date: aumDate || new Date().toISOString().split('T')[0]
    });

    if (error) throw error;

    return { success: true, data: data as any };
  } catch (error) {
    console.error('Error setting fund daily AUM:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to set AUM'
    };
  }
}

/**
 * Get fund AUM history
 */
export async function getFundAUMHistory(
  fundId?: string,
  startDate?: string,
  endDate?: string
): Promise<FundAUM[]> {
  try {
    let query = supabase
      .from('fund_daily_aum')
      .select(`
        *,
        fund:funds (
          code,
          name,
          asset,
          fund_class
        )
      `)
      .order('aum_date', { ascending: false });

    if (fundId) {
      query = query.eq('fund_id', fundId);
    }

    if (startDate) {
      query = query.gte('aum_date', startDate);
    }

    if (endDate) {
      query = query.lte('aum_date', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching fund AUM history:', error);
    return [];
  }
}

/**
 * Apply daily yield to a fund
 */
export async function applyDailyYieldToFund(
  fundId: string,
  yieldPercentage: number,
  applicationDate?: string
): Promise<{ success: boolean; data?: YieldDistributionResult; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('apply_daily_yield_to_fund', {
      p_fund_id: fundId,
      p_daily_yield_percentage: yieldPercentage,
      p_application_date: applicationDate || new Date().toISOString().split('T')[0]
    });

    if (error) throw error;

    return { success: true, data: data as unknown as YieldDistributionResult };
  } catch (error) {
    console.error('Error applying daily yield:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to apply yield'
    };
  }
}

/**
 * Update investor AUM percentages for a fund
 */
export async function updateInvestorAUMPercentages(
  fundId: string,
  totalAUM?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('update_investor_aum_percentages', {
      p_fund_id: fundId,
      p_total_aum: totalAUM
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error updating AUM percentages:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update percentages'
    };
  }
}

/**
 * Get investor positions with AUM percentages for a fund
 */
export async function getFundInvestorPositions(fundId: string) {
  try {
    const { data, error } = await supabase
      .from('investor_positions')
      .select(`
        *,
        investor:investors (
          name,
          email,
          profile:profiles (
            first_name,
            last_name
          )
        )
      `)
      .eq('fund_id', fundId)
      .gt('current_value', 0)
      .order('current_value', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching fund investor positions:', error);
    return [];
  }
}

/**
 * Get all funds with their latest AUM data
 */
export async function getAllFundsWithAUM() {
  try {
    const { data: funds, error: fundsError } = await supabase
      .from('funds')
      .select('*')
      .eq('status', 'active')
      .order('name');

    if (fundsError) throw fundsError;

    // Get latest AUM for each fund
    const fundsWithAUM = await Promise.all(
      (funds || []).map(async (fund) => {
        // First try to get from fund_daily_aum table
        const { data: aumData } = await supabase
          .from('fund_daily_aum')
          .select('*')
          .eq('fund_id', fund.id)
          .order('aum_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        // If no AUM data exists, calculate from investor positions
        if (!aumData) {
          const { data: positions } = await supabase
            .from('investor_positions')
            .select('current_value, investor_id')
            .eq('fund_id', fund.id)
            .gt('current_value', 0);

          const totalAUM = positions?.reduce((sum, pos) => sum + (pos.current_value || 0), 0) || 0;
          const investorCount = positions?.length || 0;

          return {
            ...fund,
            latest_aum: totalAUM,
            latest_aum_date: null,
            investor_count: investorCount
          };
        }

        return {
          ...fund,
          latest_aum: aumData.total_aum || 0,
          latest_aum_date: aumData.aum_date,
          investor_count: aumData.investor_count || 0
        };
      })
    );

    return fundsWithAUM;
  } catch (error) {
    console.error('Error fetching funds with AUM:', error);
    return [];
  }
}