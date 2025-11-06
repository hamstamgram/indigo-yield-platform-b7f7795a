// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Position = Database['public']['Tables']['positions']['Row'];
type InvestorPosition = Database['public']['Tables']['investor_positions']['Row'];

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

export interface InvestorSummary {
  id: string;
  name: string;
  email: string;
  status: string;
  totalAUM: number;
  totalEarned: number;
  totalPrincipal: number;
  positionCount: number;
  kycStatus?: string;
  amlStatus?: string;
  onboardingDate?: string;
}

/**
 * Unified service for investor data management
 * Consolidates positions and investor_positions tables
 */
export class InvestorDataService {
  
  /**
   * Get consolidated investor positions from both tables
   */
  async getInvestorPositions(investorId: string): Promise<InvestorPositionDetail[]> {
    try {
      // Get positions from the main positions table
      const { data: positions, error: positionsError } = await supabase
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

      if (positionsError) {
        console.error('Error fetching positions:', positionsError);
        throw positionsError;
      }

      // Get fund-specific positions
      const { data: fundPositions, error: fundError } = await supabase
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

      if (fundError) {
        console.warn('Error fetching fund positions (may not exist):', fundError);
      }

      // Combine and deduplicate positions
      const combinedPositions: InvestorPositionDetail[] = [];
      const processedAssets = new Set<string>();

      // Process main positions first (primary source)
      positions?.forEach((pos: any) => {
        const fundPosition = fundPositions?.find(fp => fp.funds?.asset === pos.asset_code);
        
        combinedPositions.push({
          fundId: fundPosition?.fund_id || crypto.randomUUID(),
          fundName: fundPosition?.funds?.name || `${pos.asset_code} Holdings`,
          fundCode: fundPosition?.funds?.code || pos.asset_code,
          asset: pos.asset_code,
          fundClass: fundPosition?.fund_class || 'Standard',
          shares: Number(pos.current_balance),
          currentValue: Number(pos.current_balance),
          costBasis: Number(pos.principal) || 0,
          unrealizedPnl: Number(pos.total_earned) || 0,
          realizedPnl: 0,
          lastTransactionDate: pos.updated_at || pos.last_modified_at,
          lockUntilDate: fundPosition?.lock_until_date
        });

        processedAssets.add(pos.asset_code);
      });

      // Add fund positions not covered by main positions table
      fundPositions?.forEach((fp: any) => {
        if (!processedAssets.has(fp.funds?.asset)) {
          combinedPositions.push({
            fundId: fp.fund_id,
            fundName: fp.funds?.name || 'Unknown Fund',
            fundCode: fp.funds?.code || 'N/A',
            asset: fp.funds?.asset || 'Unknown',
            fundClass: fp.fund_class || fp.funds?.fund_class || 'Standard',
            shares: Number(fp.shares) || 0,
            currentValue: Number(fp.current_value) || 0,
            costBasis: Number(fp.cost_basis) || 0,
            unrealizedPnl: Number(fp.unrealized_pnl) || 0,
            realizedPnl: Number(fp.realized_pnl) || 0,
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

  /**
   * Get investor summary with consolidated data
   */
  async getInvestorSummary(investorId: string): Promise<InvestorSummary | null> {
    try {
      // Get investor profile
      const { data: investor, error: investorError } = await supabase
        .from('investors')
        .select('*')
        .eq('id', investorId)
        .single();

      if (investorError) {
        console.error('Error fetching investor:', investorError);
        throw investorError;
      }

      if (!investor) return null;

      // Get positions to calculate totals
      const positions = await this.getInvestorPositions(investorId);

      const totalAUM = positions.reduce((sum, pos) => sum + pos.currentValue, 0);
      const totalEarned = positions.reduce((sum, pos) => sum + pos.unrealizedPnl, 0);
      const totalPrincipal = positions.reduce((sum, pos) => sum + pos.costBasis, 0);

      return {
        id: investor.id,
        name: investor.name,
        email: investor.email,
        status: investor.status,
        totalAUM,
        totalEarned,
        totalPrincipal,
        positionCount: positions.length,
        kycStatus: investor.kyc_status,
        amlStatus: investor.aml_status,
        onboardingDate: investor.onboarding_date
      };
    } catch (error) {
      console.error('Error in getInvestorSummary:', error);
      throw error;
    }
  }

  /**
   * Get all investors with their position summaries
   */
  async getAllInvestorsWithSummary(): Promise<InvestorSummary[]> {
    try {
      const { data: investors, error } = await supabase
        .from('investors')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching investors:', error);
        throw error;
      }

      if (!investors) return [];

      // Get summaries for all investors
      const summaries = await Promise.all(
        investors.map(async (investor) => {
          try {
            const summary = await this.getInvestorSummary(investor.id);
            return summary;
          } catch (error) {
            console.warn(`Failed to get summary for investor ${investor.id}:`, error);
            // Return basic info if detailed summary fails
            return {
              id: investor.id,
              name: investor.name,
              email: investor.email,
              status: investor.status,
              totalAUM: 0,
              totalEarned: 0,
              totalPrincipal: 0,
              positionCount: 0,
              kycStatus: investor.kyc_status,
              amlStatus: investor.aml_status,
              onboardingDate: investor.onboarding_date
            };
          }
        })
      );

      return summaries.filter(Boolean) as InvestorSummary[];
    } catch (error) {
      console.error('Error in getAllInvestorsWithSummary:', error);
      throw error;
    }
  }

  /**
   * Get user's own positions (for investor dashboard)
   */
  async getUserPositions(userId: string): Promise<Position[]> {
    try {
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', userId)
        .gt('current_balance', 0);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user positions:', error);
      throw error;
    }
  }

  /**
   * Calculate total AUM across all investors
   */
  async getTotalAUM(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('positions')
        .select('current_balance')
        .gt('current_balance', 0);

      if (error) throw error;

      return data?.reduce((sum, pos) => sum + Number(pos.current_balance), 0) || 0;
    } catch (error) {
      console.error('Error calculating total AUM:', error);
      return 0;
    }
  }

  /**
   * Get investor count with active positions
   */
  async getActiveInvestorCount(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('positions')
        .select('user_id')
        .gt('current_balance', 0);

      if (error) throw error;

      // Count unique users
      const uniqueUsers = new Set(data?.map(pos => pos.user_id));
      return uniqueUsers.size;
    } catch (error) {
      console.error('Error getting active investor count:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const investorDataService = new InvestorDataService();