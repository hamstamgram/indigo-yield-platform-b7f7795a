import { supabase } from "@/integrations/supabase/client";

export interface YieldRate {
  id: string;
  asset_id: number;
  asset_symbol: string;
  daily_yield_percentage: number;
  annual_yield_percentage: number;
  date: string;
  entered_by: string;
  created_at: string;
}

export interface YieldApplication {
  id: string;
  application_date: string;
  asset_code: string;
  total_aum: number;
  daily_yield_percentage: number;
  total_yield_generated: number;
  investors_affected: number;
  applied_by: string;
  applied_at: string;
}

export interface YieldDistribution {
  id: string;
  application_date: string;
  user_id: string;
  asset_code: string;
  balance_before: number;
  yield_amount: number;
  balance_after: number;
  percentage_owned: number;
  daily_yield_application_id: string;
}

class YieldService {
  // Get current yield rates for all assets
  async getCurrentYieldRates(): Promise<YieldRate[]> {
    const { data, error } = await supabase
      .from('yield_rates')
      .select(`
        id,
        asset_id,
        daily_yield_percentage,
        date,
        entered_by,
        created_at,
        assets!inner(symbol)
      `)
      .eq('date', new Date().toISOString().split('T')[0])
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(rate => ({
      ...rate,
      asset_symbol: rate.assets.symbol,
      annual_yield_percentage: rate.daily_yield_percentage * 365
    }));
  }

  // Get yield history for a specific asset
  async getYieldHistory(assetCode: string, days: number = 30): Promise<YieldRate[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('yield_rates')
      .select(`
        id,
        asset_id,
        daily_yield_percentage,
        date,
        entered_by,
        created_at,
        assets!inner(symbol)
      `)
      .eq('assets.symbol', assetCode as any)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) throw error;

    return data.map(rate => ({
      ...rate,
      asset_symbol: rate.assets.symbol as string,
      annual_yield_percentage: rate.daily_yield_percentage * 365
    }));
  }

  // Update or create yield rate for an asset
  async setYieldRate(assetId: number, dailyRate: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('yield_rates')
      .upsert({
        asset_id: assetId,
        daily_yield_percentage: dailyRate,
        date: today,
        entered_by: (await supabase.auth.getUser()).data.user?.id,
        is_api_sourced: false
      }, {
        onConflict: 'asset_id,date'
      });

    if (error) throw error;
  }

  // Apply daily yield to all positions for a specific asset
  async applyDailyYield(assetCode: string, dailyYieldPercentage: number): Promise<any> {
    const { data, error } = await supabase.rpc('apply_daily_yield', {
      p_asset_code: assetCode,
      p_daily_yield_percentage: dailyYieldPercentage,
      p_application_date: new Date().toISOString().split('T')[0]
    });

    if (error) throw error;
    return data as any;
  }

  // Get yield application history
  async getYieldApplications(limit: number = 50): Promise<YieldApplication[]> {
    const { data, error } = await supabase
      .from('daily_yield_applications')
      .select('*')
      .order('applied_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  // Get yield distribution logs for a specific application
  async getYieldDistributions(applicationId: string): Promise<YieldDistribution[]> {
    const { data, error } = await supabase
      .from('yield_distribution_log')
      .select('*')
      .eq('daily_yield_application_id', applicationId)
      .order('yield_amount', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Calculate total AUM for an asset
  async getTotalAUM(assetCode?: string): Promise<number> {
    let query = supabase
      .from('yield_sources')
      .select('current_balance');

    if (assetCode) {
      query = query.eq('asset_code', assetCode);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.reduce((total, source) => total + Number(source.current_balance), 0);
  }

  // Get yield sources (for admin view)
  async getYieldSources(assetCode?: string): Promise<any[]> {
    let query = supabase
      .from('yield_sources')
      .select(`
        *,
        profiles!inner(first_name, last_name, email)
      `);

    if (assetCode) {
      query = query.eq('asset_code', assetCode);
    }

    const { data, error } = await query.order('current_balance', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Recalculate AUM percentages for an asset
  async recalculateAUMPercentages(assetCode: string): Promise<void> {
    const { error } = await supabase.rpc('recalculate_aum_percentages', {
      p_asset_code: assetCode
    });

    if (error) throw error;
  }

  // Check if yield distribution is enabled
  async isYieldDistributionEnabled(): Promise<boolean> {
    const { data, error } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'yield_distribution_enabled')
      .single();

    if (error) return false;
    return data?.value === true;
  }

  // Get system yield configuration
  async getYieldConfig(): Promise<{
    distributionEnabled: boolean;
    calculationTime: string;
    managementFeeBps: number;
    performanceFeeBps: number;
  }> {
    const { data, error } = await supabase
      .from('system_config')
      .select('key, value')
      .in('key', [
        'yield_distribution_enabled',
        'yield_calculation_time', 
        'management_fee_bps',
        'performance_fee_bps'
      ]);

    if (error) throw error;

    const config = data.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {} as Record<string, any>);

    return {
      distributionEnabled: config.yield_distribution_enabled === true,
      calculationTime: config.yield_calculation_time || '02:00',
      managementFeeBps: Number(config.management_fee_bps) || 200,
      performanceFeeBps: Number(config.performance_fee_bps) || 2000
    };
  }
}

export const yieldService = new YieldService();