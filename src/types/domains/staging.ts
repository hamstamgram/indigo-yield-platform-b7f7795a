/**
 * Staging Types
 * Types for transaction import staging system
 */

export type StagingValidationStatus = "pending" | "valid" | "invalid" | "promoted";

export interface StagingTransaction {
  id: string;
  batch_id: string;
  fund_id: string;
  investor_id: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  /** @precision NUMERIC(28,10) - use string for precision */
  amount: string;
  tx_date: string;
  asset: string;
  reference_id?: string;
  notes?: string;
  validation_status: StagingValidationStatus;
  validation_errors?: StagingValidationError[];
  imported_by: string;
  validated_at?: string;
  promoted_at?: string;
  promoted_tx_id?: string;
  created_at: string;
}

export interface StagingValidationError {
  field: string;
  error: string;
}

export interface StagingBatch {
  batch_id: string;
  fund_id: string;
  fund_name?: string;
  fund_asset?: string;
  total_count: number;
  pending_count: number;
  valid_count: number;
  invalid_count: number;
  promoted_count: number;
  /** @precision NUMERIC(28,10) - use string for precision */
  total_amount: string;
  imported_by: string;
  importer_name?: string;
  created_at: string;
}

export interface ValidateStagingRowResult {
  success: boolean;
  staging_id: string;
  status: StagingValidationStatus;
  errors: StagingValidationError[];
}

export interface ValidateStagingBatchResult {
  success: boolean;
  batch_id: string;
  valid_count: number;
  invalid_count: number;
  ready_for_promotion: boolean;
}

export interface PromoteStagingBatchResult {
  success: boolean;
  batch_id: string;
  promoted_count: number;
  approval_id?: string;
  message?: string;
}

export interface StagingPreviewReport {
  batch_id: string;
  fund_id: string;
  fund_name: string;
  fund_asset: string;
  transaction_count: number;
  /** @precision NUMERIC(28,10) - use string for precision */
  total_deposits: string;
  /** @precision NUMERIC(28,10) - use string for precision */
  total_withdrawals: string;
  /** @precision NUMERIC(28,10) - use string for precision */
  net_flow: string;
  unique_investors: number;
  date_range: {
    earliest: string;
    latest: string;
  };
  validation_summary: {
    valid: number;
    invalid: number;
    pending: number;
  };
  transactions: StagingTransaction[];
}

export interface CSVImportRow {
  fund_code?: string;
  fund_id?: string;
  investor_email?: string;
  investor_id?: string;
  type: string;
  /** @precision NUMERIC(28,10) - use string for precision */
  amount: string;
  tx_date: string;
  reference_id?: string;
  notes?: string;
}

export interface CSVImportResult {
  success: boolean;
  batch_id?: string;
  imported_count: number;
  skipped_count: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
}

// Helper to check if batch is ready for promotion
export function isReadyForPromotion(batch: StagingBatch): boolean {
  return batch.invalid_count === 0 && batch.valid_count > 0;
}

// Helper to get batch status label
export function getBatchStatusLabel(batch: StagingBatch): string {
  if (batch.promoted_count > 0 && batch.promoted_count === batch.total_count) {
    return "Promoted";
  }
  if (batch.invalid_count > 0) {
    return "Has Errors";
  }
  if (batch.valid_count > 0 && batch.pending_count === 0) {
    return "Ready for Promotion";
  }
  if (batch.pending_count > 0) {
    return "Pending Validation";
  }
  return "Unknown";
}
