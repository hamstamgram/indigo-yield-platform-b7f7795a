/**
 * Yield Correction Service V2
 * Provides preview and apply operations for yield corrections
 * Uses time-weighted ownership and historical snapshots
 */

import { supabase } from "@/integrations/supabase/client";

export interface CorrectionSummary {
  fund_id: string;
  fund_name: string;
  fund_asset: string;
  period_start: string;
  period_end: string;
  effective_date?: string; // Legacy compatibility
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
  input_hash?: string;
}

export interface InvestorImpactRow {
  investor_id: string;
  investor_name: string;
  email: string;
  // Time-weighted fields (new)
  beginning_balance: number;
  additions: number;
  redemptions: number;
  avg_capital: number;
  // Position and share
  position_value: number;
  share_pct: number;
  // Gross yield
  old_gross: number;
  new_gross: number;
  delta_gross: number;
  // Fees
  fee_pct: number;
  old_fee: number;
  new_fee: number;
  delta_fee: number;
  // Net yield
  old_net: number;
  new_net: number;
  delta_net: number;
  // IB
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

export interface Reconciliation {
  sum_gross_yield: number;
  fund_gross_yield: number;
  gross_yield_match: boolean;
  sum_fees: number;
  sum_ib: number;
  platform_fees: number;
  sum_net_yield: number;
  conservation_check: boolean;
}

export interface CorrectionPreview {
  success: boolean;
  error?: string;
  summary?: CorrectionSummary;
  investor_rows?: InvestorImpactRow[];
  tx_diffs?: TransactionDiff[];
  report_impacts?: ReportImpact[];
  reconciliation?: Reconciliation;
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
  input_hash?: string;
  reconciliation?: Reconciliation;
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
 * Preview yield correction V2 with time-weighted ownership
 * Uses historical snapshots and proper period boundaries
 */
export async function previewYieldCorrectionV2(
  fundId: string,
  periodStart: string,
  periodEnd: string,
  purpose: string,
  newAum: number
): Promise<CorrectionPreview> {
  const { data, error } = await supabase.rpc("preview_yield_correction_v2", {
    p_fund_id: fundId,
    p_period_start: periodStart,
    p_period_end: periodEnd,
    p_purpose: purpose,
    p_new_aum: newAum,
  });

  if (error) {
    console.error("Preview yield correction V2 error:", error);
    return { success: false, error: error.message };
  }

  return data as unknown as CorrectionPreview;
}

/**
 * Apply yield correction V2 with idempotency
 */
export async function applyYieldCorrectionV2(
  fundId: string,
  periodStart: string,
  periodEnd: string,
  purpose: string,
  newAum: number,
  reason: string,
  confirmation: string
): Promise<CorrectionResult> {
  const { data, error } = await supabase.rpc("apply_yield_correction_v2", {
    p_fund_id: fundId,
    p_period_start: periodStart,
    p_period_end: periodEnd,
    p_purpose: purpose,
    p_new_aum: newAum,
    p_reason: reason,
    p_confirmation: confirmation,
  });

  if (error) {
    console.error("Apply yield correction V2 error:", error);
    return { success: false, error: error.message };
  }

  return data as unknown as CorrectionResult;
}

/**
 * Legacy preview function - calls V2 with date as both start and end
 */
export async function previewYieldCorrection(
  fundId: string,
  date: string,
  purpose: string,
  newAum: number
): Promise<CorrectionPreview> {
  // For legacy calls, use date as period_end and compute period_start as first of month
  const periodEnd = date;
  const dateObj = new Date(date);
  const periodStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  return previewYieldCorrectionV2(fundId, periodStart, periodEnd, purpose, newAum);
}

/**
 * Legacy apply function - calls V2 with date as both start and end
 */
export async function applyYieldCorrection(
  fundId: string,
  date: string,
  purpose: string,
  newAum: number,
  reason: string,
  confirmation: string
): Promise<CorrectionResult> {
  // For legacy calls, use date as period_end and compute period_start as first of month
  const periodEnd = date;
  const dateObj = new Date(date);
  const periodStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  return applyYieldCorrectionV2(
    fundId,
    periodStart,
    periodEnd,
    purpose,
    newAum,
    reason,
    confirmation
  );
}

/**
 * Rollback a yield correction by reversing all delta transactions
 */
export async function rollbackYieldCorrection(
  correctionId: string,
  reason: string
): Promise<RollbackResult> {
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
 */
export async function regenerateAffectedReports(
  correctionId: string
): Promise<RegenerateResult> {
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
 * Export investor impact to CSV with time-weighted fields
 */
export function exportInvestorImpactToCsv(
  rows: InvestorImpactRow[],
  summary: CorrectionSummary
): string {
  const headers = [
    "Investor ID",
    "Investor Name",
    "Email",
    "Beginning Balance",
    "Additions",
    "Redemptions",
    "Avg Capital",
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
      row.beginning_balance,
      row.additions,
      row.redemptions,
      row.avg_capital,
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

  const periodLabel = summary.period_start && summary.period_end
    ? `${summary.period_start} to ${summary.period_end}`
    : summary.effective_date || "N/A";

  return [
    `# Yield Correction Preview - ${summary.fund_name} (${summary.fund_asset})`,
    `# Period: ${periodLabel}, Purpose: ${summary.purpose}`,
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

  const periodLabel = summary.period_start && summary.period_end
    ? `${summary.period_start} to ${summary.period_end}`
    : summary.effective_date || "N/A";

  return [
    `# Transaction Diffs - ${summary.fund_name} (${summary.fund_asset})`,
    `# Period: ${periodLabel}, Purpose: ${summary.purpose}`,
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
