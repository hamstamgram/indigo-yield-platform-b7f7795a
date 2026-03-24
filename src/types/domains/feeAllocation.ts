/**
 * Fee Allocation Domain Types
 * CANONICAL SOURCE - All fee allocation related types
 */

import type { Database } from "@/integrations/supabase/types";
import { parseFinancial } from "@/utils/financial";

// ============================================================================
// Database Types (snake_case) - Direct mappings from Supabase
// ============================================================================

export type FeeAllocationRow = Database["public"]["Tables"]["fee_allocations"]["Row"];
export type FeeAllocationInsert = Database["public"]["Tables"]["fee_allocations"]["Insert"];
export type FeeAllocationUpdate = Database["public"]["Tables"]["fee_allocations"]["Update"];

// ============================================================================
// Domain Types (camelCase for UI) - Use these in components
// ============================================================================

/**
 * Fee allocation record from the database
 */
export interface FeeAllocation {
  id: string;
  distributionId: string;
  fundId: string;
  investorId: string;
  feesAccountId: string;
  periodStart: string;
  periodEnd: string;
  purpose: AumPurpose;
  /** Base net income - string for NUMERIC(38,18) precision */
  baseNetIncome: string;
  /** Fee percentage - string for decimal precision */
  feePercentage: string;
  /** Fee amount - string for NUMERIC(38,18) precision */
  feeAmount: string;
  debitTransactionId: string | null;
  creditTransactionId: string | null;
  isVoided: boolean;
  voidedAt: string | null;
  voidedBy: string | null;
  createdAt: string | null;
  createdBy: string | null;
}

// Re-use AumPurpose from the database types (not re-exported to avoid conflicts)
type AumPurpose = Database["public"]["Enums"]["aum_purpose"];

// ============================================================================
// Transform Functions
// ============================================================================

/**
 * Transform database row to domain type
 */
export function transformFeeAllocation(row: FeeAllocationRow): FeeAllocation {
  return {
    id: row.id,
    distributionId: row.distribution_id,
    fundId: row.fund_id,
    investorId: row.investor_id,
    feesAccountId: row.fees_account_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    purpose: row.purpose,
    baseNetIncome: String(row.base_net_income),
    feePercentage: String(row.fee_percentage),
    feeAmount: String(row.fee_amount),
    debitTransactionId: row.debit_transaction_id,
    creditTransactionId: row.credit_transaction_id,
    isVoided: row.is_voided,
    voidedAt: row.voided_at,
    voidedBy: row.voided_by,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

/**
 * Transform domain type back to database insert format
 */
export function toFeeAllocationInsert(
  allocation: Partial<FeeAllocation>
): Partial<FeeAllocationInsert> {
  return {
    distribution_id: allocation.distributionId,
    fund_id: allocation.fundId,
    investor_id: allocation.investorId,
    fees_account_id: allocation.feesAccountId,
    period_start: allocation.periodStart,
    period_end: allocation.periodEnd,
    purpose: allocation.purpose,
    base_net_income: allocation.baseNetIncome ? parseFinancial(allocation.baseNetIncome).toNumber() : undefined,
    fee_percentage: allocation.feePercentage ? parseFinancial(allocation.feePercentage).toNumber() : undefined,
    fee_amount: allocation.feeAmount ? parseFinancial(allocation.feeAmount).toNumber() : undefined,
    debit_transaction_id: allocation.debitTransactionId,
    credit_transaction_id: allocation.creditTransactionId,
  };
}
