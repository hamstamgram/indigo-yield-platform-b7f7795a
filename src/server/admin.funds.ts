/**
 * Admin Fund Management Server Helpers
 * Client-side functions for fund operations
 */

import { supabase } from '@/integrations/supabase/client';

export interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
  fund_class?: string;
  strategy?: string;
  inception_date: string;
  status: 'active' | 'inactive' | 'suspended';
  mgmt_fee_bps: number;
  perf_fee_bps: number;
  high_water_mark: number;
  min_investment: number;
  lock_period_days: number;
  created_at: string;
  updated_at: string;
}

export interface DailyNav {
  fund_id: string;
  nav_date: string;
  aum: number;
  nav_per_share?: number;
  shares_outstanding?: number;
  gross_return_pct?: number;
  net_return_pct?: number;
  fees_accrued: number;
  high_water_mark?: number;
  total_inflows: number;
  total_outflows: number;
  investor_count: number;
  created_at: string;
}

export interface FundKPI {
  fund_id: string;
  code: string;
  name: string;
  asset: string;
  day_return_pct?: number;
  mtd_return: number;
  qtd_return: number;
  ytd_return: number;
  itd_return?: number;
  current_aum?: number;
  active_investors: number;
}

/**
 * List all funds
 */
export async function listFunds() {
  const { data, error } = await supabase
    .from('funds')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Fund[];
}

/**
 * Get fund by ID
 */
export async function getFund(fundId: string) {
  const { data, error } = await supabase
    .from('funds')
    .select('*')
    .eq('id', fundId)
    .single();

  if (error) throw error;
  return data as Fund;
}

/**
 * Create new fund
 */
export async function createFund(fund: Omit<Fund, 'id' | 'created_at' | 'updated_at'>) {
  const fundWithDefaults = {
    ...fund,
    fund_class: fund.fund_class || 'default',
    asset: fund.asset || 'BTC'
  };
  
  const { data, error } = await supabase
    .from('funds')
    .insert(fundWithDefaults)
    .select()
    .single();

  if (error) throw error;
  return data as Fund;
}

/**
 * Update fund
 */
export async function updateFund(fundId: string, updates: Partial<Fund>) {
  const { data, error } = await supabase
    .from('funds')
    .update(updates)
    .eq('id', fundId)
    .select()
    .single();

  if (error) throw error;
  return data as Fund;
}

/**
 * List daily NAV for a fund
 */
export async function listDailyNav(fundId: string, startDate?: string, endDate?: string) {
  let query = supabase
    .from('daily_nav')
    .select('*')
    .eq('fund_id', fundId)
    .order('nav_date', { ascending: false });

  if (startDate) {
    query = query.gte('nav_date', startDate);
  }
  if (endDate) {
    query = query.lte('nav_date', endDate);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as DailyNav[];
}

/**
 * Upsert daily NAV data
 */
export async function upsertDailyNav(rows: DailyNav[]) {
  const { data, error } = await supabase
    .from('daily_nav')
    .upsert(rows, { onConflict: 'fund_id,nav_date' })
    .select();

  if (error) throw error;
  return data as DailyNav[];
}

/**
 * Get fund KPIs
 */
export async function getFundKPIs() {
  const { data, error } = await supabase
    .from('v_fund_kpis')
    .select('*');

  if (error) throw error;
  return data as FundKPI[];
}

/**
 * Calculate fund returns for a period
 */
export async function calculateFundReturns(
  fundId: string, 
  startDate: string, 
  endDate: string, 
  net: boolean = true
) {
  const { data, error } = await supabase
    .rpc('fund_period_return', {
      f: fundId,
      d1: startDate,
      d2: endDate,
      net
    });

  if (error) throw error;
  return data as number;
}

/**
 * Get latest NAV for a fund
 */
export async function getLatestNav(fundId: string) {
  const { data, error } = await supabase
    .from('daily_nav')
    .select('*')
    .eq('fund_id', fundId)
    .order('nav_date', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error
  return data as DailyNav | null;
}

/**
 * Get fund performance summary
 */
export async function getFundPerformance(fundId: string) {
  const { data: kpi, error: kpiError } = await supabase
    .from('v_fund_kpis')
    .select('*')
    .eq('fund_id', fundId)
    .single();

  if (kpiError) throw kpiError;

  const { data: navHistory, error: navError } = await supabase
    .from('daily_nav')
    .select('nav_date, aum, net_return_pct')
    .eq('fund_id', fundId)
    .order('nav_date', { ascending: true })
    .limit(365); // Last year

  if (navError) throw navError;

  return {
    kpi: kpi as FundKPI,
    history: navHistory as Array<{
      nav_date: string;
      aum: number;
      net_return_pct: number | null;
    }>
  };
}

/**
 * Import fund data from Excel
 */
export async function importFundData(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('importType', 'daily_nav');

  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('No active session');
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/excel_import`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Import failed: ${error}`);
  }

  return await response.json();
}

/**
 * Export fund data to Excel
 */
export async function exportFundData(type: string = 'full', startDate?: string, endDate?: string) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('No active session');
  }

  const params = new URLSearchParams({ type });
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/excel_export?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      }
    }
  );

  if (!response.ok) {
    throw new Error('Export failed');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `indigo_export_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
