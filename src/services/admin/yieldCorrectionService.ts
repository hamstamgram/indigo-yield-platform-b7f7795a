/**
 * Yield Correction Service
 * Provides preview and apply operations for yield corrections
 */

import { supabase } from "@/integrations/supabase/client";

export interface CorrectionSummary {
  fund_id: string;
  fund_name: string;
  fund_asset: string;
  effective_date: string;
  purpose: string;
  old_aum: number;
  new_aum: number;
  delta_aum: number;
  old_gross_yield: number;
  new_gross_yield: number;
  delta_gross_yield: number;
  investors_affected: number;
  total_fee_delta: number;
  total_ib_delta: number;
  total_net_delta: number;
  is_month_closed: boolean;
  original_distribution_id?: string;
}

export interface InvestorImpactRow {
  investor_id: string;
  investor_name: string;
  email: string;
  position_value: number;
  share_pct: number;
  old_gross: number;
  new_gross: number;
  delta_gross: number;
  fee_pct: number;
  old_fee: number;
  new_fee: number;
  delta_fee: number;
  old_net: number;
  new_net: number;
  delta_net: number;
  ib_parent_id: string | null;
  ib_pct: number;
  old_ib: number;
  new_ib: number;
  delta_ib: number;
  ib_source: string | null;
}

export interface TransactionDiff {
  tx_type: string;
  investor_id: string;
  investor_name: string;
  source_investor_id?: string;
  old_amount: number;
  new_amount: number;
  delta_amount: number;
  visibility_scope: string;
}

export interface ReportImpact {
  period_id: string;
  investors_affected: number;
  needs_regeneration: boolean;
  tables_affected: string[];
}

export interface CorrectionPreview {
  success: boolean;
  error?: string;
  summary?: CorrectionSummary;
  investor_rows?: InvestorImpactRow[];
  tx_diffs?: TransactionDiff[];
  report_impacts?: ReportImpact[];
}

export interface CorrectionResult {
  success: boolean;
  error?: string;
  correction_id?: string;
  distribution_id?: string;
  original_distribution_id?: string;
  delta_aum?: number;
  investors_affected?: number;
  total_fee_delta?: number;
  total_ib_delta?: number;
  is_month_closed?: boolean;
  message?: string;
}

export interface CorrectionHistoryItem {
  correction_id: string;
  fund_id: string;
  fund_name: string;
  fund_asset: string;
  effective_date: string;
  purpose: string;
  old_aum: number;
  new_aum: number;
  delta_aum: number;
  investors_affected: number;
  total_fee_delta: number;
  total_ib_delta: number;
  reason: string;
  status: string;
  applied_at: string;
  applied_by_name: string;
}

export interface RollbackResult {
  success: boolean;
  error?: string;
  rollback_distribution_id?: string;
  transactions_reversed?: number;
  message?: string;
}

export interface RegenerateResult {
  success: boolean;
  error?: string;
  statements_regenerated?: number;
  investors_affected?: number;
  message?: string;
}

/**
 * Preview yield correction without applying changes
 */
export async function previewYieldCorrection(
  fundId: string,
  date: string,
  purpose: string,
  newAum: number
): Promise<CorrectionPreview> {
  const { data, error } = await supabase.rpc("preview_yield_correction", {
    p_fund_id: fundId,
    p_date: date,
    p_purpose: purpose,
    p_new_aum: newAum,
  });

  if (error) {
    console.error("Preview yield correction error:", error);
    return { success: false, error: error.message };
  }

  return data as unknown as CorrectionPreview;
}

/**
 * Apply yield correction with delta transactions
 */
export async function applyYieldCorrection(
  fundId: string,
  date: string,
  purpose: string,
  newAum: number,
  reason: string,
  confirmation: string
): Promise<CorrectionResult> {
  const { data, error } = await supabase.rpc("apply_yield_correction", {
    p_fund_id: fundId,
    p_date: date,
    p_purpose: purpose,
    p_new_aum: newAum,
    p_reason: reason,
    p_confirmation: confirmation,
  });

  if (error) {
    console.error("Apply yield correction error:", error);
    return { success: false, error: error.message };
  }

  return data as unknown as CorrectionResult;
}

/**
 * Rollback a yield correction by reversing all delta transactions
 * Note: This calls the rollback_yield_correction RPC which needs to be created
 */
export async function rollbackYieldCorrection(
  correctionId: string,
  reason: string
): Promise<RollbackResult> {
  // Use generic rpc call since the function may not exist in types yet
  const { data, error } = await (supabase.rpc as CallableFunction)("rollback_yield_correction", {
    p_correction_id: correctionId,
    p_reason: reason,
  });

  if (error) {
    console.error("Rollback yield correction error:", error);
    return { success: false, error: error.message };
  }

  return data as unknown as RollbackResult;
}

/**
 * Regenerate affected reports after a correction
 * Note: This calls the regenerate_reports_for_correction RPC which needs to be created
 */
export async function regenerateAffectedReports(
  correctionId: string
): Promise<RegenerateResult> {
  // Use generic rpc call since the function may not exist in types yet
  const { data, error } = await (supabase.rpc as CallableFunction)("regenerate_reports_for_correction", {
    p_correction_id: correctionId,
  });

  if (error) {
    console.error("Regenerate reports error:", error);
    return { success: false, error: error.message };
  }

  return data as unknown as RegenerateResult;
}

/**
 * Get yield correction history
 */
export async function getYieldCorrectionHistory(
  fundId?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<CorrectionHistoryItem[]> {
  const { data, error } = await supabase.rpc("get_yield_corrections", {
    p_fund_id: fundId || null,
    p_date_from: dateFrom || null,
    p_date_to: dateTo || null,
  });

  if (error) {
    console.error("Get yield corrections error:", error);
    return [];
  }

  return (data || []) as CorrectionHistoryItem[];
}

/**
 * Format token amount for display (no USD)
 */
export function formatTokenAmount(amount: number, asset?: string): string {
  const decimals = asset === "BTC" ? 8 : asset === "ETH" || asset === "SOL" ? 6 : 4;
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: Math.min(decimals, 4),
    maximumFractionDigits: decimals,
  });
}

/**
 * Export investor impact to CSV
 */
export function exportInvestorImpactToCsv(
  rows: InvestorImpactRow[],
  summary: CorrectionSummary
): string {
  const headers = [
    "Investor ID",
    "Investor Name",
    "Email",
    "Position Value",
    "Share %",
    "Old Gross",
    "New Gross",
    "Delta Gross",
    "Fee %",
    "Old Fee",
    "New Fee",
    "Delta Fee",
    "Old Net",
    "New Net",
    "Delta Net",
    "IB Parent ID",
    "IB %",
    "Old IB",
    "New IB",
    "Delta IB",
  ].join(",");

  const dataRows = rows.map((row) =>
    [
      row.investor_id,
      `"${row.investor_name}"`,
      row.email,
      row.position_value,
      row.share_pct,
      row.old_gross,
      row.new_gross,
      row.delta_gross,
      row.fee_pct,
      row.old_fee,
      row.new_fee,
      row.delta_fee,
      row.old_net,
      row.new_net,
      row.delta_net,
      row.ib_parent_id || "",
      row.ib_pct,
      row.old_ib,
      row.new_ib,
      row.delta_ib,
    ].join(",")
  );

  return [
    `# Yield Correction Preview - ${summary.fund_name} (${summary.fund_asset})`,
    `# Date: ${summary.effective_date}, Purpose: ${summary.purpose}`,
    `# Old AUM: ${summary.old_aum}, New AUM: ${summary.new_aum}, Delta: ${summary.delta_aum}`,
    "",
    headers,
    ...dataRows,
  ].join("\n");
}

/**
 * Export transaction diffs to CSV
 */
export function exportTransactionDiffsToCsv(
  diffs: TransactionDiff[],
  summary: CorrectionSummary
): string {
  const headers = [
    "Transaction Type",
    "Investor ID",
    "Investor Name",
    "Old Amount",
    "New Amount",
    "Delta Amount",
    "Visibility Scope",
  ].join(",");

  const dataRows = diffs.map((diff) =>
    [
      diff.tx_type,
      diff.investor_id,
      `"${diff.investor_name}"`,
      diff.old_amount,
      diff.new_amount,
      diff.delta_amount,
      diff.visibility_scope,
    ].join(",")
  );

  return [
    `# Transaction Diffs - ${summary.fund_name} (${summary.fund_asset})`,
    `# Date: ${summary.effective_date}, Purpose: ${summary.purpose}`,
    "",
    headers,
    ...dataRows,
  ].join("\n");
}

/**
 * Download CSV file
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
