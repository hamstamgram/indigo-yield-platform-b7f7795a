/**
 * Yield Correction Service V2
 * Provides preview and apply operations for yield corrections
 * Uses time-weighted ownership and historical snapshots
 */

// RPC functions have been dropped - stubs return error results

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
  ib_commission_source: string | null;
}

export interface TransactionDiff {
  type: string;
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
 * NOTE: preview_yield_correction_v2 RPC was dropped
 */
export async function previewYieldCorrectionV2(
  _fundId: string,
  _periodStart: string,
  _periodEnd: string,
  _purpose: string,
  _newAum: number
): Promise<CorrectionPreview> {
  return { success: false, error: "preview_yield_correction_v2 RPC has been removed" };
}

/**
 * Apply yield correction V2 with idempotency
 * NOTE: apply_yield_correction_v2 RPC was dropped
 */
export async function applyYieldCorrectionV2(
  _fundId: string,
  _periodStart: string,
  _periodEnd: string,
  _purpose: string,
  _newAum: number,
  _reason: string,
  _confirmation: string
): Promise<CorrectionResult> {
  return { success: false, error: "apply_yield_correction_v2 RPC has been removed" };
}

/**
 * Rollback a yield correction by reversing all delta transactions
 * NOTE: rollback_yield_correction RPC was dropped
 */
export async function rollbackYieldCorrection(
  _correctionId: string,
  _reason: string
): Promise<RollbackResult> {
  return { success: false, error: "rollback_yield_correction RPC has been removed" };
}

/**
 * Regenerate affected reports after a correction
 * NOTE: regenerate_reports_for_correction RPC was dropped
 */
export async function regenerateAffectedReports(_correctionId: string): Promise<RegenerateResult> {
  return { success: false, error: "regenerate_reports_for_correction RPC has been removed" };
}

/**
 * Get yield correction history
 * NOTE: get_yield_corrections RPC was dropped - returns empty
 */
export async function getYieldCorrectionHistory(
  _fundId?: string,
  _dateFrom?: string,
  _dateTo?: string
): Promise<CorrectionHistoryItem[]> {
  return [];
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

  const periodLabel =
    summary.period_start && summary.period_end
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
      diff.type,
      diff.investor_id,
      `"${diff.investor_name}"`,
      diff.old_amount,
      diff.new_amount,
      diff.delta_amount,
      diff.visibility_scope,
    ].join(",")
  );

  const periodLabel =
    summary.period_start && summary.period_end
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
