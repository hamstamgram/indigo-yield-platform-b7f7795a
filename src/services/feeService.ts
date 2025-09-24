import { supabase } from '@/integrations/supabase/client';

export interface PlatformFee {
  id: string;
  investor_id: string;
  asset_code: string;
  fee_month: string;
  gross_yield: number;
  fee_rate_percentage: number;
  fee_amount: number;
  net_yield: number;
  created_at: string;
}

export interface MonthlyFeeSummary {
  id: string;
  summary_month: string;
  asset_code: string;
  total_gross_yield: number;
  total_fees_collected: number;
  total_net_yield: number;
  investor_count: number;
  created_at: string;
}

export interface FeeApplicationResult {
  success: boolean;
  application_id?: string;
  fund_aum_native?: number;
  total_gross_yield?: number;
  total_platform_fees?: number;
  total_net_yield?: number;
  investors_affected?: number;
  asset_code?: string;
  error?: string;
}

export const feeService = {
  // Apply daily yield with platform fee calculation
  async applyDailyYieldWithFees(
    fundId: string,
    yieldPercentage: number,
    applicationDate?: string
  ): Promise<FeeApplicationResult> {
    try {
      const { data, error } = await supabase.rpc('apply_daily_yield_with_fees', {
        p_fund_id: fundId,
        p_daily_yield_percentage: yieldPercentage,
        p_application_date: applicationDate || new Date().toISOString().split('T')[0]
      });

      if (error) throw error;

      // Type assertion for the result data
      const result = data as any;

      return {
        success: true,
        application_id: result?.application_id,
        fund_aum_native: result?.fund_aum_native,
        total_gross_yield: result?.total_gross_yield,
        total_platform_fees: result?.total_platform_fees,
        total_net_yield: result?.total_net_yield,
        investors_affected: result?.investors_affected,
        asset_code: result?.asset_code
      };
    } catch (error) {
      console.error('Error applying yield with fees:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  },

  // Get platform fees for a specific period
  async getPlatformFees(
    assetCode?: string,
    startDate?: string,
    endDate?: string,
    investorId?: string
  ): Promise<PlatformFee[]> {
    try {
      let query = supabase
        .from('platform_fees_collected')
        .select('*')
        .order('fee_month', { ascending: false });

      if (assetCode) {
        query = query.eq('asset_code', assetCode);
      }

      if (investorId) {
        query = query.eq('investor_id', investorId);
      }

      if (startDate) {
        query = query.gte('fee_month', startDate);
      }

      if (endDate) {
        query = query.lte('fee_month', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data?.map(fee => ({
        ...fee,
        gross_yield: parseFloat(fee.gross_yield?.toString() || '0'),
        fee_rate_percentage: parseFloat(fee.fee_rate_percentage?.toString() || '0'),
        fee_amount: parseFloat(fee.fee_amount?.toString() || '0'),
        net_yield: parseFloat(fee.net_yield?.toString() || '0')
      })) || [];
    } catch (error) {
      console.error('Error fetching platform fees:', error);
      throw error;
    }
  },

  // Get monthly fee summaries
  async getMonthlyFeeSummaries(
    assetCode?: string,
    startMonth?: string,
    endMonth?: string
  ): Promise<MonthlyFeeSummary[]> {
    try {
      let query = supabase
        .from('monthly_fee_summary')
        .select('*')
        .order('summary_month', { ascending: false });

      if (assetCode) {
        query = query.eq('asset_code', assetCode);
      }

      if (startMonth) {
        query = query.gte('summary_month', startMonth);
      }

      if (endMonth) {
        query = query.lte('summary_month', endMonth);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data?.map(summary => ({
        ...summary,
        total_gross_yield: parseFloat(summary.total_gross_yield?.toString() || '0'),
        total_fees_collected: parseFloat(summary.total_fees_collected?.toString() || '0'),
        total_net_yield: parseFloat(summary.total_net_yield?.toString() || '0')
      })) || [];
    } catch (error) {
      console.error('Error fetching monthly fee summaries:', error);
      throw error;
    }
  },

  // Get investor period summary (MTD, QTD, YTD, ITD)
  async getInvestorPeriodSummary(
    investorId: string,
    assetCode: string,
    asOfDate?: string
  ) {
    try {
      const { data, error } = await supabase.rpc('get_investor_period_summary', {
        p_investor_id: investorId,
        p_asset_code: assetCode,
        p_as_of_date: asOfDate || new Date().toISOString().split('T')[0]
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching investor period summary:', error);
      throw error;
    }
  },

  // Update investor fee rate
  async updateInvestorFeeRate(investorId: string, feeRate: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ fee_percentage: feeRate })
        .eq('id', investorId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating investor fee rate:', error);
      throw error;
    }
  },

  // Get total platform fees collected
  async getTotalFeesCollected(assetCode?: string, month?: string): Promise<number> {
    try {
      let query = supabase
        .from('platform_fees_collected')
        .select('fee_amount');

      if (assetCode) {
        query = query.eq('asset_code', assetCode);
      }

      if (month) {
        query = query.gte('fee_month', `${month}-01`);
        const nextMonth = new Date(new Date(month).getFullYear(), new Date(month).getMonth() + 1, 1);
        query = query.lt('fee_month', nextMonth.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data?.reduce((sum, fee) => sum + parseFloat(fee.fee_amount?.toString() || '0'), 0) || 0;
    } catch (error) {
      console.error('Error fetching total fees collected:', error);
      return 0;
    }
  }
};

export default feeService;