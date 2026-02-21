/**
 * Yield Distribution Record Domain Types
 * CANONICAL SOURCE - Database record types for yield_distributions table
 *
 * Note: This file contains types for the yield_distributions table which stores
 * FUND-LEVEL distribution summaries (batch records), not per-investor details.
 * Per-investor yield details are in fee_allocations and ib_allocations tables.
 */

import type { Database } from "@/integrations/supabase/types";

// ============================================================================
// Database Types (snake_case) - Direct mappings from Supabase
// ============================================================================

export type YieldDistributionRow = Database["public"]["Tables"]["yield_distributions"]["Row"];
export type YieldDistributionInsert = Database["public"]["Tables"]["yield_distributions"]["Insert"];
export type YieldDistributionUpdate = Database["public"]["Tables"]["yield_distributions"]["Update"];

// ============================================================================
// Local type aliases (not exported to avoid conflicts with enums.ts)
// ============================================================================

type YieldDistributionStatus = Database["public"]["Enums"]["yield_distribution_status"];
type AumPurpose = Database["public"]["Enums"]["aum_purpose"];

// ============================================================================
// Domain Types (camelCase for UI) - Use these in components
// ============================================================================

/**
 * Yield distribution record from the database (fund-level batch record)
 * This represents a single yield distribution event for a fund
 */
export interface YieldDistributionRecord {
  id: string;
  fundId: string;
  effectiveDate: string;
  periodStart: string | null;
  periodEnd: string | null;
  purpose: AumPurpose;
  distributionType: string;
  /** Opening AUM - string for NUMERIC(28,10) precision */
  openingAum: string | null;
  /** Previous AUM - string for NUMERIC(28,10) precision */
  previousAum: string | null;
  /** Recorded AUM - string for NUMERIC(28,10) precision */
  recordedAum: string;
  /** Gross yield - string for NUMERIC(28,10) precision */
  grossYield: string;
  /** Net yield - string for NUMERIC(28,10) precision */
  netYield: string | null;
  /** Total fees - string for NUMERIC(28,10) precision */
  totalFees: string | null;
  /** Total IB - string for NUMERIC(28,10) precision */
  totalIb: string | null;
  /** Yield percentage - string for decimal precision */
  yieldPercentage: string | null;
  investorCount: number | null;
  isMonthEnd: boolean;
  referenceId: string | null;
  aumRecordId: string | null;
  parentDistributionId: string | null;
  summaryJson: Record<string, unknown> | null;
  reason: string | null;
  status: string;
  voidReason: string | null;
  voidedAt: string | null;
  voidedBy: string | null;
  createdAt: string;
  createdBy: string;
}

/**
 * Yield distribution with related fund names (for display)
 */
export interface YieldDistributionWithFund extends YieldDistributionRecord {
  fundCode: string;
  fundName: string;
  fundAsset: string;
}

/**
 * Summary statistics for yield distributions
 */
export interface YieldDistributionSummary {
  /** Total gross yield - string for NUMERIC(28,10) precision */
  totalGrossYield: string;
  /** Total net yield - string for NUMERIC(28,10) precision */
  totalNetYield: string;
  /** Total fees - string for NUMERIC(28,10) precision */
  totalFees: string;
  /** Total IB fees - string for NUMERIC(28,10) precision */
  totalIbFees: string;
  distributionCount: number;
  investorCount: number;
}

// ============================================================================
// Transform Functions
// ============================================================================

/**
 * Transform database row to domain type
 */
export function transformYieldDistributionRecord(
  row: YieldDistributionRow
): YieldDistributionRecord {
  return {
    id: row.id,
    fundId: row.fund_id,
    effectiveDate: row.effective_date,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    purpose: row.purpose,
    distributionType: row.distribution_type,
    openingAum: row.opening_aum != null ? String(row.opening_aum) : null,
    previousAum: row.previous_aum != null ? String(row.previous_aum) : null,
    recordedAum: String(row.recorded_aum),
    grossYield: String(row.gross_yield),
    netYield: row.net_yield != null ? String(row.net_yield) : null,
    totalFees: row.total_fees != null ? String(row.total_fees) : null,
    totalIb: row.total_ib != null ? String(row.total_ib) : null,
    yieldPercentage: row.yield_percentage != null ? String(row.yield_percentage) : null,
    investorCount: row.investor_count,
    isMonthEnd: row.is_month_end,
    referenceId: row.reference_id,
    aumRecordId: row.aum_record_id,
    parentDistributionId: row.parent_distribution_id,
    summaryJson: row.summary_json as unknown as Record<string, unknown> | null,
    reason: row.reason,
    status: row.status,
    voidReason: row.void_reason,
    voidedAt: row.voided_at,
    voidedBy: row.voided_by,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

/**
 * Transform domain type back to database insert format
 */
export function toYieldDistributionInsert(
  record: Partial<YieldDistributionRecord>
): Partial<YieldDistributionInsert> {
  const toNumOrUndefined = (v: string | null | undefined) =>
    v != null ? parseFloat(v) : undefined;
  return {
    fund_id: record.fundId,
    effective_date: record.effectiveDate,
    period_start: record.periodStart,
    period_end: record.periodEnd,
    purpose: record.purpose,
    distribution_type: record.distributionType,
    opening_aum: toNumOrUndefined(record.openingAum),
    previous_aum: toNumOrUndefined(record.previousAum),
    recorded_aum: toNumOrUndefined(record.recordedAum),
    gross_yield: toNumOrUndefined(record.grossYield),
    net_yield: toNumOrUndefined(record.netYield),
    total_fees: toNumOrUndefined(record.totalFees),
    total_ib: toNumOrUndefined(record.totalIb),
    yield_percentage: toNumOrUndefined(record.yieldPercentage),
    investor_count: record.investorCount,
    is_month_end: record.isMonthEnd,
    reference_id: record.referenceId,
    aum_record_id: record.aumRecordId,
    parent_distribution_id: record.parentDistributionId,
    summary_json:
      record.summaryJson as unknown as Database["public"]["Tables"]["yield_distributions"]["Insert"]["summary_json"],
    reason: record.reason,
    status: record.status,
  };
}
