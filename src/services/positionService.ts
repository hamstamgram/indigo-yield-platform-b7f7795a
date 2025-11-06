/**
 * Position Service - Handles CRUD operations for investor positions
 */
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AssetCode = Database['public']['Enums']['asset_code'];

export interface Position {
  user_id: string;
  asset_code: string;
  current_balance: number;
  principal: number;
  total_earned: number;
}

export interface InvestorPositionDetail {
  investor_id: string;
  fund_id: string;
  fund_class: string | null;
  shares: number;
  cost_basis: number;
  current_value: number;
  unrealized_pnl: number | null;
  realized_pnl: number | null;
}

/**
 * Update investor position balance (for admin use)
 */
export async function updateInvestorPosition(
  investorId: string,
  fundId: string,
  updates: Partial<InvestorPositionDetail>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('investor_positions')
      .update({
        ...updates,
        last_modified_at: new Date().toISOString(),
        last_modified_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq('investor_id', investorId)
      .eq('fund_id', fundId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating investor position:', error);
    return false;
  }
}

/**
 * Create new investor position
 */
export async function createInvestorPosition(
  investorId: string,
  fundId: string,
  shares: number,
  costBasis: number
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('investor_positions')
      .insert({
        investor_id: investorId,
        fund_id: fundId,
        shares,
        cost_basis: costBasis,
        current_value: costBasis, // Initialize as cost basis
        last_modified_by: (await supabase.auth.getUser()).data.user?.id
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error creating investor position:', error);
    return false;
  }
}

/**
 * Delete investor position
 */
export async function deleteInvestorPosition(
  investorId: string,
  fundId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('investor_positions')
      .delete()
      .eq('investor_id', investorId)
      .eq('fund_id', fundId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting investor position:', error);
    return false;
  }
}

/**
 * Get all positions for an investor
 */
export async function getInvestorPositions(investorId: string): Promise<InvestorPositionDetail[]> {
  try {
    const { data, error } = await supabase
      .from('investor_positions')
      .select(`
        *,
        funds:fund_id (
          id,
          code,
          name,
          asset,
          fund_class
        )
      `)
      .eq('investor_id', investorId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching investor positions:', error);
    return [];
  }
}

/**
 * Update fee percentage for investor
 */
export async function updateInvestorFeePercentage(
  investorId: string,
  feePercentage: number
): Promise<boolean> {
  try {
    // Update the profiles table fee_percentage field
    const { error } = await supabase
      .from('profiles')
      .update({ fee_percentage: feePercentage })
      .eq('id', investorId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating fee percentage:', error);
    return false;
  }
}

/**
 * Add asset to investor portfolio
 */
export async function addAssetToInvestor(
  investorId: string,
  assetId: number,
  initialBalance: number = 0
): Promise<boolean> {
  try {
    // Get the asset details
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('symbol')
      .eq('id', assetId)
      .maybeSingle();

    if (!asset) throw new Error('Asset not found');

    if (assetError) throw assetError;

    // Create or update position in the positions table
    const { error: positionError } = await supabase
      .from('positions')
      .upsert({
        user_id: investorId,
        asset_code: asset.symbol,
        current_balance: initialBalance,
        principal: initialBalance,
        total_earned: 0
      })
      .select();

    if (positionError) throw positionError;
    return true;
  } catch (error) {
    console.error('Error adding asset to investor:', error);
    return false;
  }
}

/**
 * Remove asset from investor portfolio
 */
export async function removeAssetFromInvestor(
  investorId: string,
  assetSymbol: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('positions')
      .delete()
      .eq('user_id', investorId)
      .eq('asset_code', assetSymbol as AssetCode);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error removing asset from investor:', error);
    return false;
  }
}

/**
 * Get portfolio summary for display
 */
export async function getInvestorPortfolioSummary(investorId: string): Promise<Record<string, { balance: number; usd_value: number }>> {
  try {
    const { data, error } = await supabase
      .from('positions')
      .select(`
        asset_code,
        current_balance,
        assets!inner (
          symbol,
          name
        )
      `)
      .eq('user_id', investorId);

    if (error) throw error;

    const summary: Record<string, { balance: number; usd_value: number }> = {};
    
    if (data) {
      data.forEach((position: any) => {
        summary[position.asset_code] = {
          balance: Number(position.current_balance) || 0,
          usd_value: Number(position.current_balance) || 0 // TODO: Get actual USD price
        };
      });
    }

    return summary;
  } catch (error) {
    console.error('Error getting portfolio summary:', error);
    return {};
  }
}