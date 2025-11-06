/**
 * Historical Data Service
 * Manages historical report templates and data generation
 */

import { supabase } from '@/integrations/supabase/client';

export interface HistoricalReportTemplate {
  id: string;
  investor_id: string;
  report_month: string;
  asset_code: string;
  opening_balance: number | null;
  closing_balance: number | null;
  additions: number | null;
  withdrawals: number | null;
  yield_earned: number | null;
  created_at: string;
  updated_at: string;
}

export interface BulkGenerateOptions {
  startMonth: string; // Format: 'YYYY-MM'
  endMonth: string;   // Format: 'YYYY-MM'
  investorIds?: string[]; // If not provided, generates for all investors
  assetCodes?: string[];  // If not provided, generates for all assets
}

/**
 * Get all historical report templates with filtering
 */
export async function getHistoricalReports(filters?: {
  investorId?: string;
  assetCode?: string;
  startMonth?: string;
  endMonth?: string;
}): Promise<HistoricalReportTemplate[]> {
  try {
    let query = supabase
      .from('investor_monthly_reports')
      .select('*')
      .order('report_month', { ascending: false });

    if (filters?.investorId) {
      query = query.eq('investor_id', filters.investorId);
    }
    
    if (filters?.assetCode) {
      query = query.eq('asset_code', filters.assetCode);
    }

    if (filters?.startMonth) {
      query = query.gte('report_month', filters.startMonth);
    }

    if (filters?.endMonth) {
      query = query.lte('report_month', filters.endMonth);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching historical reports:', error);
    return [];
  }
}

/**
 * Generate monthly report templates for missing periods
 */
export async function generateMissingTemplates(options: BulkGenerateOptions): Promise<{
  success: boolean;
  generated: number;
  errors: string[];
}> {
  try {
    const { startMonth, endMonth, investorIds, assetCodes } = options;
    
    // Get all investors if not specified
    let investors = investorIds;
    if (!investors) {
      const { data: investorData } = await supabase
        .from('investors')
        .select('id')
        .eq('status', 'active');
      
      investors = investorData?.map(i => i.id) || [];
    }

    // Get all asset codes if not specified
    let assets = assetCodes;
    if (!assets) {
      const { data: assetData } = await supabase
        .from('assets')
        .select('symbol')
        .eq('is_active', true);
      
      assets = assetData?.map(a => a.symbol) || [];
    }

    // Generate date range
    const months: string[] = [];
    const start = new Date(startMonth + '-01');
    const end = new Date(endMonth + '-01');
    
    for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      months.push(`${year}-${month}-01`);
    }

    let generated = 0;
    const errors: string[] = [];

    // Generate templates for each combination
    for (const month of months) {
      for (const investorId of investors) {
        for (const assetCode of assets) {
          try {
            // Check if template already exists
            const { data: existing } = await supabase
              .from('investor_monthly_reports')
              .select('id')
              .eq('investor_id', investorId)
              .eq('report_month', month)
              .eq('asset_code', assetCode)
              .maybeSingle();

            if (!existing) {
              // Create template
              const { error: insertError } = await supabase
                .from('investor_monthly_reports')
                .insert({
                  investor_id: investorId,
                  report_month: month,
                  asset_code: assetCode,
                  opening_balance: 0,
                  closing_balance: 0,
                  additions: 0,
                  withdrawals: 0,
                  yield_earned: 0
                });

              if (insertError) {
                errors.push(`Failed to create template for ${investorId}/${assetCode}/${month}: ${insertError.message}`);
              } else {
                generated++;
              }
            }
          } catch (error) {
            errors.push(`Error processing ${investorId}/${assetCode}/${month}: ${error}`);
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      generated,
      errors
    };
  } catch (error) {
    console.error('Error generating templates:', error);
    return {
      success: false,
      generated: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Update a historical report template
 */
export async function updateHistoricalReport(
  id: string,
  updates: Partial<Pick<HistoricalReportTemplate, 'opening_balance' | 'closing_balance' | 'additions' | 'withdrawals' | 'yield_earned'>>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('investor_monthly_reports')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating historical report:', error);
    return false;
  }
}

/**
 * Delete historical report templates (bulk)
 */
export async function deleteHistoricalReports(ids: string[]): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('investor_monthly_reports')
      .delete()
      .in('id', ids);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting historical reports:', error);
    return false;
  }
}

/**
 * Get summary statistics for historical data
 */
export async function getHistoricalDataSummary(): Promise<{
  totalReports: number;
  latestMonth: string | null;
  earliestMonth: string | null;
  investorCount: number;
  assetCount: number;
}> {
  try {
    const { data: summary } = await supabase
      .from('investor_monthly_reports')
      .select('report_month, investor_id, asset_code');

    if (!summary || summary.length === 0) {
      return {
        totalReports: 0,
        latestMonth: null,
        earliestMonth: null,
        investorCount: 0,
        assetCount: 0
      };
    }

    const months = summary.map(r => r.report_month).sort();
    const uniqueInvestors = new Set(summary.map(r => r.investor_id));
    const uniqueAssets = new Set(summary.map(r => r.asset_code));

    return {
      totalReports: summary.length,
      latestMonth: months[months.length - 1],
      earliestMonth: months[0],
      investorCount: uniqueInvestors.size,
      assetCount: uniqueAssets.size
    };
  } catch (error) {
    console.error('Error getting historical data summary:', error);
    return {
      totalReports: 0,
      latestMonth: null,
      earliestMonth: null,
      investorCount: 0,
      assetCount: 0
    };
  }
}