import { supabase } from "@/integrations/supabase/client";

export interface AssetBreakdown {
  asset: string;
  aum: number;
  earnings: number;
  principal: number;
  positionCount: number;
}

export interface UnifiedInvestorData {
  id: string;
  profileId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  status: string;
  kycStatus: string;
  amlStatus: string;
  feePercentage: number;
  onboardingDate: string;
  aumByAsset: AssetBreakdown[];
  positionCount: number;
  lastActivityDate: string;
  // Legacy aggregated values for backward compatibility (deprecated)
  totalAum: number;
  totalEarnings: number;
  totalPrincipal: number;
}

export interface UnifiedPositionData {
  id: string;
  investorId: string;
  fundId?: string;
  fundName: string;
  fundCode: string;
  asset: string;
  fundClass: string;
  shares: number;
  currentValue: number;
  costBasis: number;
  unrealizedPnl: number;
  realizedPnl: number;
  totalEarnings: number;
  inceptionDate: string;
  lastTransactionDate: string;
  lockUntilDate?: string;
  feeRate: number;
  aumPercentage: number;
}

export interface PositionHistoryData {
  date: string;
  balance: number;
  value: number;
  yieldApplied?: number;
  transactions?: number;
}

export interface ExpertInvestorSummary {
  investor: UnifiedInvestorData;
  positions: UnifiedPositionData[];
  performance: {
    totalReturn: number;
    totalReturnPercent: number;
    monthlyReturn: number;
    yearToDateReturn: number;
    inceptionReturn: number;
  };
  fees: {
    totalFeesCollected: number;
    monthlyFees: number;
    yearToDateFees: number;
  };
}

class ExpertInvestorService {
  
  /**
   * Get comprehensive investor data with all positions and performance metrics
   */
  async getInvestorExpertView(investorId: string): Promise<ExpertInvestorSummary> {
    try {
      // Get investor profile data
      const { data: investorData, error: investorError } = await supabase
        .from('investors')
        .select('*')
        .eq('id', investorId)
        .maybeSingle();

      if (!investorData) throw new Error('Investor not found');

      if (investorError) throw investorError;

      // Get profile data separately
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name, fee_percentage')
        .eq('id', investorData.profile_id || '')
        .maybeSingle();

      // Get unified position data from both positions and investor_positions
      const positions = await this.getUnifiedPositions(investorId);
      
      // Calculate performance metrics
      const performance = await this.calculatePerformanceMetrics(investorId, positions);
      
      // Calculate fee metrics
      const fees = await this.calculateFeeMetrics(investorId);

      // Calculate per-asset breakdowns
      const aumByAsset = this.calculateAssetBreakdowns(positions);

      // Build unified investor data
      const investor: UnifiedInvestorData = {
        id: investorData.id,
        profileId: investorData.profile_id || '',
        email: investorData.email,
        firstName: profileData?.first_name || '',
        lastName: profileData?.last_name || '',
        phone: investorData.phone || undefined,
        status: investorData.status || 'pending',
        kycStatus: investorData.kyc_status || 'pending',
        amlStatus: investorData.aml_status || 'pending',
        feePercentage: profileData?.fee_percentage || 0.02,
        onboardingDate: investorData.onboarding_date || investorData.created_at || '',
        aumByAsset,
        positionCount: positions.length,
        lastActivityDate: positions.length > 0 
          ? new Date(Math.max(...positions.map(p => new Date(p.lastTransactionDate).getTime()))).toISOString()
          : investorData.created_at || new Date().toISOString(),
        // Legacy aggregated values (deprecated - use aumByAsset instead)
        totalAum: positions.reduce((sum, p) => sum + p.currentValue, 0),
        totalEarnings: positions.reduce((sum, p) => sum + p.totalEarnings, 0),
        totalPrincipal: positions.reduce((sum, p) => sum + p.costBasis, 0),
      };

      return {
        investor,
        positions,
        performance,
        fees
      };

    } catch (error) {
      console.error('Error getting expert investor view:', error);
      throw error;
    }
  }

  /**
   * Get all investors with simplified summary for master table
   */
  async getAllInvestorsExpertSummary(): Promise<UnifiedInvestorData[]> {
    try {
      const { data, error } = await supabase
        .from('investors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // OPTIMIZED: Batch fetch all profile data and positions at once to avoid N+1 queries
      // Extract all profile IDs and investor IDs
      const profileIds = (data || []).map(inv => inv.profile_id).filter(Boolean) as string[];
      const investorIds = (data || []).map(inv => inv.id);

      // Batch fetch all profiles in one query
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, fee_percentage')
        .in('id', profileIds);

      // Create a map for O(1) lookup
      const profileMap = new Map(
        (profilesData || []).map(profile => [profile.id, profile])
      );

      // Batch fetch all positions with fund data in one query using JOIN
      const { data: allPositions } = await supabase
        .from('investor_positions')
        .select(`
          *,
          funds!inner(
            name,
            code,
            asset,
            inception_date
          )
        `)
        .in('investor_id', investorIds);

      // Group positions by investor_id for O(1) lookup
      const positionsByInvestor = new Map<string, any[]>();
      (allPositions || []).forEach(position => {
        const existing = positionsByInvestor.get(position.investor_id) || [];
        existing.push(position);
        positionsByInvestor.set(position.investor_id, existing);
      });

      // Now map investors with their data (no additional queries needed)
      const investorsWithSummary = (data || []).map((investor) => {
        const profileData = profileMap.get(investor.profile_id || '');
        const rawPositions = positionsByInvestor.get(investor.id) || [];

        // Transform raw positions to unified format
        const positions = rawPositions.map(this.transformPosition);
        const aumByAsset = this.calculateAssetBreakdowns(positions);

        return {
          id: investor.id,
          profileId: investor.profile_id || '',
          email: investor.email,
          firstName: profileData?.first_name || '',
          lastName: profileData?.last_name || '',
          phone: investor.phone || undefined,
          status: investor.status || 'pending',
          kycStatus: investor.kyc_status || 'pending',
          amlStatus: investor.aml_status || 'pending',
          feePercentage: profileData?.fee_percentage || 0.02,
          onboardingDate: investor.onboarding_date || investor.created_at || '',
          aumByAsset,
          positionCount: positions.length,
          lastActivityDate: positions.length > 0
            ? new Date(Math.max(...positions.map(p => new Date(p.lastTransactionDate).getTime()))).toISOString()
            : investor.created_at || new Date().toISOString(),
          // Legacy aggregated values (deprecated)
          totalAum: positions.reduce((sum, p) => sum + p.currentValue, 0),
          totalEarnings: positions.reduce((sum, p) => sum + p.totalEarnings, 0),
          totalPrincipal: positions.reduce((sum, p) => sum + p.costBasis, 0),
        } as UnifiedInvestorData;
      });

      return investorsWithSummary;
    } catch (error) {
      console.error('Error getting all investors expert summary:', error);
      throw error;
    }
  }

  /**
   * Calculate per-asset breakdowns from positions
   */
  private calculateAssetBreakdowns(positions: UnifiedPositionData[]): AssetBreakdown[] {
    const assetMap = new Map<string, AssetBreakdown>();

    positions.forEach(pos => {
      const existing = assetMap.get(pos.asset) || {
        asset: pos.asset,
        aum: 0,
        earnings: 0,
        principal: 0,
        positionCount: 0
      };

      existing.aum += pos.currentValue;
      existing.earnings += pos.totalEarnings;
      existing.principal += pos.costBasis;
      existing.positionCount += 1;

      assetMap.set(pos.asset, existing);
    });

    return Array.from(assetMap.values()).sort((a, b) => b.aum - a.aum);
  }

  /**
   * Transform raw position data from database to UnifiedPositionData
   * Used for batch processing to avoid N+1 queries
   * Handles nested funds object from JOIN query
   */
  private transformPosition = (pos: any): UnifiedPositionData => {
    // Extract fund data from nested object (from JOIN query)
    const fundData = pos.funds || {};

    return {
      id: `${pos.fund_id}-${pos.investor_id}`,
      investorId: pos.investor_id,
      fundId: pos.fund_id,
      fundName: fundData.name || 'Unknown Fund',
      fundCode: fundData.code || 'UNK',
      asset: fundData.asset || 'UNKNOWN',
      fundClass: pos.fund_class || 'Standard',
      shares: pos.shares || 0,
      currentValue: pos.current_value || 0,
      costBasis: pos.cost_basis || 0,
      unrealizedPnl: pos.unrealized_pnl || 0,
      realizedPnl: pos.realized_pnl || 0,
      totalEarnings: (pos.unrealized_pnl || 0) + (pos.realized_pnl || 0),
      inceptionDate: fundData.inception_date || pos.updated_at || new Date().toISOString(),
      lastTransactionDate: pos.last_transaction_date || pos.updated_at || new Date().toISOString(),
      lockUntilDate: pos.lock_until_date || undefined,
      feeRate: 0.02,
      aumPercentage: pos.aum_percentage || 0
    };
  }

  /**
   * Get unified position data combining positions table and investor_positions
   */
  private async getUnifiedPositions(investorId: string): Promise<UnifiedPositionData[]> {
    try {
      // Get investor_positions (fund-based positions)
      const { data: fundPositions } = await supabase
        .from('investor_positions')
        .select('*')
        .eq('investor_id', investorId);

      // Get legacy positions data
      const { data: legacyPositions } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', investorId)
        .gt('current_balance', 0);

      const unifiedPositions: UnifiedPositionData[] = [];

      // Process fund positions
      if (fundPositions) {
        for (const pos of fundPositions) {
          // Get fund data separately
          const { data: fundData } = await supabase
            .from('funds')
            .select('name, code, asset, inception_date')
            .eq('id', pos.fund_id)
            .single();

          unifiedPositions.push({
            id: `${pos.fund_id}-${pos.investor_id}`, // Composite key since no id field
            investorId,
            fundId: pos.fund_id,
            fundName: fundData?.name || 'Unknown Fund',
            fundCode: fundData?.code || 'UNK',
            asset: fundData?.asset || 'UNKNOWN',
            fundClass: pos.fund_class || 'Standard',
            shares: pos.shares || 0,
            currentValue: pos.current_value || 0,
            costBasis: pos.cost_basis || 0,
            unrealizedPnl: pos.unrealized_pnl || 0,
            realizedPnl: pos.realized_pnl || 0,
            totalEarnings: (pos.unrealized_pnl || 0) + (pos.realized_pnl || 0),
            inceptionDate: fundData?.inception_date || pos.updated_at || new Date().toISOString(),
            lastTransactionDate: pos.last_transaction_date || pos.updated_at || new Date().toISOString(),
            lockUntilDate: pos.lock_until_date || undefined,
            feeRate: 0.02,
            aumPercentage: pos.aum_percentage || 0
          });
        }
      }

      // Process legacy positions
      if (legacyPositions) {
        for (const pos of legacyPositions) {
          if (!unifiedPositions.find(up => up.asset === pos.asset_code)) {
            unifiedPositions.push({
              id: pos.id,
              investorId,
              fundName: `${pos.asset_code} Legacy Position`,
              fundCode: pos.asset_code,
              asset: pos.asset_code,
              fundClass: 'Legacy',
              shares: pos.current_balance,
              currentValue: pos.current_balance,
              costBasis: pos.principal || 0,
              unrealizedPnl: pos.total_earned || 0,
              realizedPnl: 0,
              totalEarnings: pos.total_earned || 0,
              inceptionDate: pos.updated_at,
              lastTransactionDate: pos.last_modified_at || pos.updated_at,
              feeRate: 0.02,
              aumPercentage: 0
            });
          }
        }
      }

      return unifiedPositions;
    } catch (error) {
      console.error('Error getting unified positions:', error);
      throw error;
    }
  }

  /**
   * Calculate performance metrics for investor
   */
  private async calculatePerformanceMetrics(_investorId: string, positions: UnifiedPositionData[]) {
    const totalInvested = positions.reduce((sum, p) => sum + p.costBasis, 0);
    const totalValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
    const totalReturn = totalValue - totalInvested;
    const totalReturnPercent = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

    return {
      totalReturn,
      totalReturnPercent,
      monthlyReturn: totalReturnPercent / 12,
      yearToDateReturn: totalReturnPercent,
      inceptionReturn: totalReturnPercent
    };
  }

  /**
   * Calculate fee metrics for investor
   */
  private async calculateFeeMetrics(investorId: string) {
    try {
      const { data: feeData } = await supabase
        .from('platform_fees_collected')
        .select('fee_amount, fee_month')
        .eq('investor_id', investorId);

      const totalFeesCollected = feeData?.reduce((sum, fee) => sum + Number(fee.fee_amount), 0) || 0;
      
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      
      const yearToDateFees = feeData?.filter(fee => 
        new Date(fee.fee_month).getFullYear() === currentYear
      ).reduce((sum, fee) => sum + Number(fee.fee_amount), 0) || 0;

      const monthlyFees = feeData?.filter(fee => {
        const feeDate = new Date(fee.fee_month);
        return feeDate.getFullYear() === currentYear && feeDate.getMonth() === currentMonth;
      }).reduce((sum, fee) => sum + Number(fee.fee_amount), 0) || 0;

      return {
        totalFeesCollected,
        monthlyFees,
        yearToDateFees
      };
    } catch (error) {
      console.error('Error calculating fee metrics:', error);
      return {
        totalFeesCollected: 0,
        monthlyFees: 0,
        yearToDateFees: 0
      };
    }
  }

  /**
   * Update investor fee percentage
   */
  async updateInvestorFeePercentage(investorId: string, feePercentage: number): Promise<boolean> {
    try {
      const { data: investor, error: investorError } = await supabase
        .from('investors')
        .select('profile_id')
        .eq('id', investorId)
        .maybeSingle();

      if (!investor) throw new Error('Investor not found');

      if (investorError) throw investorError;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ fee_percentage: feePercentage })
        .eq('id', investor?.profile_id || '');

      if (updateError) throw updateError;
      return true;
    } catch (error) {
      console.error('Error updating investor fee percentage:', error);
      throw error;
    }
  }

  /**
   * Update position value for an investor
   */
  async updatePositionValue(fundId: string, investorId: string, newValue: number, isLegacy: boolean = false): Promise<boolean> {
    try {
      if (isLegacy) {
        // For legacy positions, use the position id directly
        const { error } = await supabase
          .from('positions')
          .update({ current_balance: newValue })
          .eq('id', fundId); // fundId is actually position id for legacy
        if (error) throw error;
      } else {
        // For investor_positions, use composite key
        const { error } = await supabase
          .from('investor_positions')
          .update({ current_value: newValue })
          .eq('fund_id', fundId)
          .eq('investor_id', investorId);
        if (error) throw error;
      }
      return true;
    } catch (error) {
      console.error('Error updating position value:', error);
      throw error;
    }
  }

  /**
   * Get position history for charting
   */
  async getPositionHistory(investorId: string, _asset: string, days: number = 30): Promise<PositionHistoryData[]> {
    try {
      const { data, error } = await supabase
        .from('portfolio_history')
        .select('date, balance, usd_value, yield_applied')
        .eq('user_id', investorId)
        .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;

      return data?.map(d => ({
        date: d.date,
        balance: d.balance,
        value: d.usd_value || d.balance,
        yieldApplied: d.yield_applied || undefined
      })) || [];
    } catch (error) {
      console.error('Error getting position history:', error);
      return [];
    }
  }
}

export const expertInvestorService = new ExpertInvestorService();