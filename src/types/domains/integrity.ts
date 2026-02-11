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
  /** @precision NUMERIC(28,10) - string for financial safety */
  position_value: string;
  /** @precision NUMERIC(28,10) - string for financial safety */
  transaction_sum: string;
  /** @precision NUMERIC(28,10) - string for financial safety */
  variance: string;
}

/**
 * Fund AUM mismatch view row
 */
export interface FundAumMismatchRow {
  fund_id: string;
  fund_code: string;
  /** @precision NUMERIC(28,10) - string for financial safety */
  reported_aum: string;
  /** @precision NUMERIC(28,10) - string for financial safety */
  calculated_aum: string;
  /** @precision NUMERIC(28,10) - string for financial safety */
  difference: string;
}

/**
 * Orphaned transaction view row
 */
export interface OrphanedTransactionRow {
  id: string;
  investor_id: string;
  fund_id: string;
  type: string;
  /** @precision NUMERIC(28,10) - string for financial safety */
  amount: string;
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
