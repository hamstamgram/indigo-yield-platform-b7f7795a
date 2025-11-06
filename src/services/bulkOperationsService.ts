// @ts-nocheck
/**
 * Bulk Operations Service - Handles CSV import/export and bulk data operations
 */
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

export interface PositionImportRow {
  investor_email: string;
  asset_symbol: string;
  balance: number;
  principal?: number;
  notes?: string;
}

export interface ImportResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
  data?: any[];
}

/**
 * Export investor positions to CSV
 */
export async function exportInvestorPositions(): Promise<Blob> {
  try {
    const { data, error } = await supabase
      .from('positions')
      .select(`
        user_id,
        asset_code,
        current_balance,
        principal,
        total_earned,
        updated_at
      `)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // Get user emails separately to avoid relation issues
    const userIds = [...new Set(data?.map(p => p.user_id) || [])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    const csvData = data?.map(position => {
      const profile = profileMap.get(position.user_id);
      return {
        investor_email: profile?.email || 'Unknown',
        investor_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Unknown',
        asset_symbol: position.asset_code,
        current_balance: position.current_balance,
        principal: position.principal,
        total_earned: position.total_earned,
        last_updated: position.updated_at
      };
    }) || [];

    const ws = XLSX.utils.json_to_sheet(csvData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Positions');
    
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'csv' });
    return new Blob([buffer], { type: 'text/csv' });
  } catch (error) {
    console.error('Error exporting positions:', error);
    throw error;
  }
}

/**
 * Import positions from CSV data
 */
export async function importPositionsFromCSV(
  file: File,
  overwriteExisting: boolean = false
): Promise<ImportResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(worksheet) as any[];

    const result: ImportResult = {
      success: true,
      processed: 0,
      failed: 0,
      errors: [],
      data: []
    };

    for (const row of rawData) {
      try {
        // Validate required fields
        if (!row.investor_email || !row.asset_symbol || row.balance === undefined) {
          result.errors.push(`Row missing required fields: ${JSON.stringify(row)}`);
          result.failed++;
          continue;
        }

        // Get investor ID from email
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', row.investor_email)
          .single();

        if (profileError || !profile) {
          result.errors.push(`Investor not found: ${row.investor_email}`);
          result.failed++;
          continue;
        }

        // Validate asset exists
        const { data: asset, error: assetError } = await supabase
          .from('assets')
          .select('symbol')
          .eq('symbol', row.asset_symbol)
          .single();

        if (assetError || !asset) {
          result.errors.push(`Asset not found: ${row.asset_symbol}`);
          result.failed++;
          continue;
        }

        // Upsert position
        const positionData = {
          user_id: profile.id,
          asset_code: row.asset_symbol as any, // Type cast to handle enum
          current_balance: parseFloat(row.balance),
          principal: row.principal ? parseFloat(row.principal) : parseFloat(row.balance),
          total_earned: 0
        };

        const { error: upsertError } = await supabase
          .from('positions')
          .upsert(positionData, { 
            onConflict: 'user_id,asset_code',
            ignoreDuplicates: !overwriteExisting 
          });

        if (upsertError) {
          result.errors.push(`Failed to update ${row.investor_email} ${row.asset_symbol}: ${upsertError.message}`);
          result.failed++;
        } else {
          result.processed++;
          result.data?.push(positionData);
        }

      } catch (rowError: any) {
        result.errors.push(`Row processing error: ${rowError.message}`);
        result.failed++;
      }
    }

    result.success = result.failed === 0;
    return result;

  } catch (error: any) {
    console.error('Import error:', error);
    return {
      success: false,
      processed: 0,
      failed: 0,
      errors: [error.message || 'Unknown import error']
    };
  }
}

/**
 * Bulk balance adjustment
 */
export async function bulkBalanceAdjustment(
  adjustments: Array<{
    investor_id: string;
    asset_code: string;
    adjustment_amount: number;
    reason: string;
  }>
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    processed: 0,
    failed: 0,
    errors: []
  };

  try {
    for (const adjustment of adjustments) {
      // Get current balance
      const { data: position, error: fetchError } = await supabase
        .from('positions')
        .select('current_balance')
        .eq('user_id', adjustment.investor_id)
        .eq('asset_code', adjustment.asset_code as any)
        .single();

      if (fetchError || !position) {
        result.errors.push(`Position not found for adjustment: ${adjustment.investor_id} ${adjustment.asset_code}`);
        result.failed++;
        continue;
      }

      const newBalance = position.current_balance + adjustment.adjustment_amount;

      if (newBalance < 0) {
        result.errors.push(`Adjustment would result in negative balance: ${adjustment.investor_id} ${adjustment.asset_code}`);
        result.failed++;
        continue;
      }

      // Update balance
      const { error: updateError } = await supabase
        .from('positions')
        .update({ current_balance: newBalance })
        .eq('user_id', adjustment.investor_id)
        .eq('asset_code', adjustment.asset_code as any);

      if (updateError) {
        result.errors.push(`Failed to update balance: ${updateError.message}`);
        result.failed++;
        continue;
      }

      // Log the adjustment
      const { error: auditError } = await supabase
        .from('balance_adjustments')
        .insert({
          user_id: adjustment.investor_id,
          amount: adjustment.adjustment_amount,
          reason: adjustment.reason,
          currency: adjustment.asset_code,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (auditError) {
        console.warn('Failed to log adjustment:', auditError);
      }

      result.processed++;
    }

    result.success = result.failed === 0;
    return result;

  } catch (error: any) {
    result.errors.push(error.message || 'Bulk adjustment failed');
    result.success = false;
    return result;
  }
}

/**
 * Generate sample CSV template
 */
export function generateSampleCSV(): Blob {
  const sampleData = [
    {
      investor_email: 'investor@example.com',
      asset_symbol: 'BTC',
      balance: 1.5,
      principal: 1.0,
      notes: 'Initial deposit'
    },
    {
      investor_email: 'investor@example.com',
      asset_symbol: 'ETH',
      balance: 10.0,
      principal: 8.5,
      notes: 'Second investment'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sample');
  
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'csv' });
  return new Blob([buffer], { type: 'text/csv' });
}