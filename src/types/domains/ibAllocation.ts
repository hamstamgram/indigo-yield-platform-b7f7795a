/**
 * IB Allocation Domain Types
 * CANONICAL SOURCE - All IB (Introducing Broker) allocation related types
 */

import type { Database } from "@/integrations/supabase/types";

// ============================================================================
// Database Types (snake_case) - Direct mappings from Supabase
// ============================================================================

export type IBAllocationRow = Database["public"]["Tables"]["ib_allocations"]["Row"];
export type IBAllocationInsert = Database["public"]["Tables"]["ib_allocations"]["Insert"];
export type IBAllocationUpdate = Database["public"]["Tables"]["ib_allocations"]["Update"];

// ============================================================================
// Join Types - Used for typed Supabase query results with relations
// ============================================================================

/**
 * Profile reference for IB allocation joins
 */
export interface IBProfileRef {
  first_name: string | null;
  last_name: string | null;
  email: string;
}

/**
 * Fund reference for IB allocation joins
 */
export interface IBFundRef {
  name: string;
  asset: string;
}

/**
 * Minimal fund reference (asset only)
 */
export interface IBFundAssetRef {
  asset: string;
}

/**
 * IB allocation with joined profile and fund data
 * Used by ibPayoutService.getAllocationsForPayout()
 */
export interface IBAllocationWithJoins {
  id: string;
  ib_investor_id: string;
  source_investor_id: string;
  ib_fee_amount: number;
  effective_date: string;
  period_start: string | null;
  period_end: string | null;
  payout_status: string | null;
  funds: IBFundRef | null;
  ib_profile: IBProfileRef | null;
  source_profile: IBProfileRef | null;
}

/**
 * IB allocation row for commission queries
 */
export interface IBAllocationCommissionRow {
  id: string;
  ib_fee_amount: number;
  ib_percentage: number;
  source_net_income: number;
  effective_date: string;
  period_start: string | null;
  period_end: string | null;
  payout_status: string | null;
  paid_at: string | null;
  source_investor_id: string;
  funds: IBFundRef | null;
  profiles: IBProfileRef | null;
}

/**
 * Position with fund join for IB service
 */
export interface PositionWithFundAsset {
  investor_id: string;
  fund_id: string;
  current_value: number;
  funds: IBFundAssetRef | null;
}

/**
 * Position with full fund join
 */
export interface PositionWithFundFull {
  fund_id: string;
  current_value: number;
  cost_basis: number;
  funds: { name: string; asset: string } | null;
}

/**
 * Withdrawal with fund join
 */
export interface WithdrawalWithFund {
  id: string;
  requested_amount: number;
  processed_amount: number | null;
  status: string;
  request_date: string;
  processed_at: string | null;
  funds: IBFundRef | null;
}

// ============================================================================
// Local type alias (not exported to avoid conflicts)
// ============================================================================

type AumPurpose = Database["public"]["Enums"]["aum_purpose"];

// ============================================================================
// Domain Types (camelCase for UI) - Use these in components
// ============================================================================

/**
 * IB allocation record from the database
 */
export interface IBAllocation {
  id: string;
  ibInvestorId: string;
  sourceInvestorId: string;
  fundId: string | null;
  distributionId: string | null;
  periodId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  effectiveDate: string;
  purpose: AumPurpose;
  source: string | null;
  /** Source net income - string for NUMERIC(28,10) precision */
  sourceNetIncome: string;
  /** IB percentage - string for decimal precision */
  ibPercentage: string;
  /** IB fee amount - string for NUMERIC(28,10) precision */
  ibFeeAmount: string;
  payoutStatus: string;
  payoutBatchId: string | null;
  paidAt: string | null;
  paidBy: string | null;
  isVoided: boolean;
  voidedAt: string | null;
  voidedBy: string | null;
  createdAt: string | null;
  createdBy: string | null;
}

/**
 * IB allocation with related investor names (for display)
 */
export interface IBAllocationWithNames extends IBAllocation {
  ibInvestorName: string;
  sourceInvestorName: string;
  fundCode?: string;
}

/**
 * Summary of IB allocations for a period
 */
export interface IBAllocationSummary {
  ibInvestorId: string;
  ibInvestorName: string;
  /** Total amount - string for NUMERIC(28,10) precision */
  totalAmount: string;
  allocationCount: number;
  payoutStatus: string;
}

// ============================================================================
// Transform Functions
// ============================================================================

/**
 * Transform database row to domain type
 */
export function transformIBAllocation(row: IBAllocationRow): IBAllocation {
  return {
    id: row.id,
    ibInvestorId: row.ib_investor_id,
    sourceInvestorId: row.source_investor_id,
    fundId: row.fund_id,
    distributionId: row.distribution_id,
    periodId: row.period_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    effectiveDate: row.effective_date,
    purpose: row.purpose,
    source: row.source,
    sourceNetIncome: String(row.source_net_income),
    ibPercentage: String(row.ib_percentage),
    ibFeeAmount: String(row.ib_fee_amount),
    payoutStatus: row.payout_status,
    payoutBatchId: row.payout_batch_id,
    paidAt: row.paid_at,
    paidBy: row.paid_by,
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
export function toIBAllocationInsert(
  allocation: Partial<IBAllocation>
): Partial<IBAllocationInsert> {
  return {
    ib_investor_id: allocation.ibInvestorId,
    source_investor_id: allocation.sourceInvestorId,
    fund_id: allocation.fundId,
    distribution_id: allocation.distributionId,
    period_id: allocation.periodId,
    period_start: allocation.periodStart,
    period_end: allocation.periodEnd,
    effective_date: allocation.effectiveDate,
    purpose: allocation.purpose,
    source: allocation.source,
    source_net_income: allocation.sourceNetIncome ? parseFloat(allocation.sourceNetIncome) : undefined,
    ib_percentage: allocation.ibPercentage ? parseFloat(allocation.ibPercentage) : undefined,
    ib_fee_amount: allocation.ibFeeAmount ? parseFloat(allocation.ibFeeAmount) : undefined,
    payout_status: allocation.payoutStatus,
  };
}
