/**
 * Integrity Domain Types
 * Canonical type definitions for data integrity checks
 */

export type IntegrityStatus = "ok" | "warning" | "error";

export interface IntegrityCheck {
  name: string;
  description: string;
  status: IntegrityStatus;
  count: number;
  iconName: "wallet" | "trending-up" | "users" | "scale" | "database" | "shield";
  details?: Record<string, unknown>[];
}

export interface AuditEvent {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  actor_user: string | null;
  created_at: string;
}

export interface IntegrityCheckResult {
  checks: IntegrityCheck[];
  overallStatus: IntegrityStatus;
}

// ============================================================================
// Integrity View Row Types - Used for typed Supabase view query results
// ============================================================================

/**
 * Ledger reconciliation view row
 */
export interface LedgerReconciliationRow {
  investor_id: string;
  fund_id: string;
  position_value: number;
  transaction_sum: number;
  variance: number;
}

/**
 * Fund AUM mismatch view row
 */
export interface FundAumMismatchRow {
  fund_id: string;
  fund_code: string;
  reported_aum: number;
  calculated_aum: number;
  difference: number;
}

/**
 * Orphaned transaction view row
 */
export interface OrphanedTransactionRow {
  id: string;
  investor_id: string;
  fund_id: string;
  type: string;
  amount: number;
  reason: string;
}

/**
 * Orphaned position view row
 */
export interface OrphanedPositionRow {
  investor_id: string;
  fund_id: string;
  reason: string;
}

/**
 * Integrity violation from admin_integrity_runs
 */
export interface IntegrityViolation {
  check_name: string;
  severity: "critical" | "warning" | "info";
  details: string;
  count?: number;
}

/**
 * Last activity timestamp result
 */
export interface LastActivityRow {
  created_at: string;
}
