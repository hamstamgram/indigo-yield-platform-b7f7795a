/**
 * Adjustment Domain Types
 * Types for balance adjustments and corrections
 */

export interface BalanceAdjustment {
  id: string;
  user_id: string;
  fund_id?: string;
  /** Adjustment amount - string for NUMERIC(28,10) precision */
  amount: string;
  currency: string;
  reason: string;
  notes?: string;
  audit_ref?: string;
  created_at: string;
  created_by: string;
}
