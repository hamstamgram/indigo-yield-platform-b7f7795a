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
  sourceNetIncome: number;
  ibPercentage: number;
  ibFeeAmount: number;
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
  totalAmount: number;
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
    sourceNetIncome: row.source_net_income,
    ibPercentage: row.ib_percentage,
    ibFeeAmount: row.ib_fee_amount,
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
export function toIBAllocationInsert(allocation: Partial<IBAllocation>): Partial<IBAllocationInsert> {
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
    source_net_income: allocation.sourceNetIncome,
    ib_percentage: allocation.ibPercentage,
    ib_fee_amount: allocation.ibFeeAmount,
    payout_status: allocation.payoutStatus,
  };
}
