/**
 * Yield Domain Types
 * CANONICAL SOURCE - All yield distribution related types
 */

/**
 * Input for yield calculation
 */
export interface YieldCalculationInput {
  fundId: string;
  targetDate: Date;
  periodStart?: Date; // For ADB: defaults to start of month if not provided
  /** New total AUM - string for NUMERIC(38,18) precision */
  newTotalAUM: string;
  /** Base AUM the admin saw (as-of AUM) - used to compute grossYield and passed as p_recorded_aum */
  baseAUM?: string;
  purpose?: "reporting" | "transaction";
  /** HH:MM when admin recorded the AUM snapshot (transaction purpose only, audit trail) */
  snapshotTime?: string;
  /** Actual date to record on transactions (defaults to today for reporting, effective date for transaction) */
  distributionDate?: Date;
}

/**
 * Individual investor's yield distribution
 */
export interface YieldDistribution {
  investorId: string;
  investorName: string;
  accountType?: string;
  /** Opening balance before yield - string for NUMERIC(38,18) precision */
  openingBalance?: string;
  /** Current balance - string for NUMERIC(38,18) precision */
  currentBalance: string;
  /** Allocation percentage - string for decimal precision */
  allocationPercentage: string;
  /** Fee percentage - string for decimal precision */
  feePercentage: string;
  /** Gross yield - string for NUMERIC(38,18) precision */
  grossYield: string;
  /** Fee amount - string for NUMERIC(38,18) precision */
  feeAmount: string;
  /** Net yield - string for NUMERIC(38,18) precision */
  netYield: string;
  /** New balance - string for NUMERIC(38,18) precision */
  newBalance: string;
  /** Position delta - string for NUMERIC(38,18) precision */
  positionDelta: string;
  // IB fields
  ibParentId?: string;
  ibParentName?: string;
  /** IB percentage - string for decimal precision */
  ibPercentage: string;
  /** IB amount - string for NUMERIC(38,18) precision */
  ibAmount: string;
  // Idempotency
  referenceId: string;
  wouldSkip: boolean;
  // ADB (Average Daily Balance) fields - for time-weighted yield calculation
  /** Average daily balance - string for NUMERIC(38,18) precision */
  adb?: string;
  /** ADB weight - string for decimal precision (0-1) */
  adbWeight?: string;
  /** Carried loss - string for NUMERIC(38,18) precision */
  carriedLoss?: string;
  /** Loss offset - string for NUMERIC(38,18) precision */
  lossOffset?: string;
  /** Taxable gain - string for NUMERIC(38,18) precision */
  taxableGain?: string;
  hasIb?: boolean; // Whether investor has an IB parent
  // V5 segmented fields
  segmentDetails?: V5InvestorSegmentDetail[];
  // Month-to-date aggregate fields
  mtdGross?: string;
  mtdFee?: string;
  mtdIb?: string;
  mtdNet?: string;
}

/**
 * IB credit allocation
 */
export interface IBCredit {
  ibInvestorId: string;
  ibInvestorName: string;
  sourceInvestorId: string;
  sourceInvestorName: string;
  /** IB credit amount - string for NUMERIC(38,18) precision */
  amount: string;
  /** IB percentage - string for decimal precision */
  ibPercentage: string;
  source: string;
  referenceId: string;
  wouldSkip: boolean;
}

/**
 * Yield totals summary
 */
export interface YieldTotals {
  /** Gross yield total - string for NUMERIC(38,18) precision */
  gross: string;
  /** Total fees - string for NUMERIC(38,18) precision */
  fees: string;
  /** Total IB fees - string for NUMERIC(38,18) precision */
  ibFees: string;
  /** Net yield total - string for NUMERIC(38,18) precision */
  net: string;
  /** Indigo credit total - string for NUMERIC(38,18) precision */
  indigoCredit: string;
}

/**
 * Snapshot info for yield calculation
 */
export interface YieldSnapshotInfo {
  snapshotId: string;
  snapshotDate: string;
  isLocked: boolean;
  periodId?: string;
}

/**
 * Complete yield calculation result
 */
export interface YieldCalculationResult {
  success: boolean;
  preview?: boolean;
  error?: string;
  fundId: string;
  fundCode: string;
  fundAsset: string;
  yieldDate?: Date;
  effectiveDate?: string;
  purpose?: string;
  isMonthEnd?: boolean;
  /** Current AUM - string for NUMERIC(38,18) precision */
  currentAUM: string;
  /** New AUM - string for NUMERIC(38,18) precision */
  newAUM: string;
  /** Gross yield - string for NUMERIC(38,18) precision */
  grossYield: string;
  /** Net yield - string for NUMERIC(38,18) precision */
  netYield: string;
  /** Total fees - string for NUMERIC(38,18) precision */
  totalFees: string;
  /** Total IB fees - string for NUMERIC(38,18) precision */
  totalIbFees: string;
  /** Yield percentage - string for decimal precision */
  yieldPercentage: string;
  investorCount: number;
  distributions: YieldDistribution[];
  ibCredits: IBCredit[];
  /** Indigo fees credit - string for NUMERIC(38,18) precision */
  indigoFeesCredit: string;
  indigoFeesId?: string;
  existingConflicts: string[];
  hasConflicts: boolean;
  totals: YieldTotals;
  status: "preview" | "applied";
  snapshotInfo?: YieldSnapshotInfo;
  // ADB (Average Daily Balance) fields - for time-weighted yield calculation
  periodStart?: string;
  periodEnd?: string;
  daysInPeriod?: number;
  /** Total ADB - string for NUMERIC(38,18) precision */
  totalAdb?: string;
  /** Yield rate percentage - string for decimal precision */
  yieldRatePct?: string;
  /** Total loss offset - string for NUMERIC(38,18) precision */
  totalLossOffset?: string;
  /** Dust/rounding amount - string for NUMERIC(38,18) precision */
  dustAmount?: string;
  calculationMethod?: "pro_rata" | "adb_v3" | "adb_v4" | "segmented_v5" | "unified_v6";
  features?: string[];
  conservationCheck?: boolean; // Whether gross = net + fees + ib + dust
  // Crystallization info (reporting purpose)
  crystalsInPeriod?: number;
  crystalGrossTotal?: string;
  // V5 segmented fields
  segmentCount?: number;
  openingAum?: string;
  recordedAum?: string;
}

/**
 * Fund daily AUM record
 */
export interface FundDailyAUM {
  id: string;
  fund_id: string;
  aum_date: string;
  as_of_date?: string;
  /** @precision NUMERIC - string for financial safety */
  total_aum: string;
  /** @precision NUMERIC - string for financial safety */
  nav_per_share?: string | null;
  /** @precision NUMERIC - string for financial safety */
  total_shares?: string | null;
  source?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  is_voided?: boolean;
  purpose?: "reporting" | "transaction";
}

/**
 * Purpose types for yield operations
 */
export type YieldPurpose = "reporting" | "transaction";

/**
 * Status of yield distribution
 */
export type YieldStatus = "preview" | "applied";

/**
 * ADB (Average Daily Balance) Yield Distribution RPC Result (Legacy V4)
 * Kept for backwards compatibility with existing data
 */
export interface ADBYieldRPCResult {
  success: boolean;
  error?: string;
  fund_id?: string;
  fund_code?: string;
  fund_asset?: string;
  /** @precision NUMERIC(38,18) - string for financial safety */
  gross_yield?: string;
  /** @precision NUMERIC(38,18) - string for financial safety */
  net_yield?: string;
  /** @precision NUMERIC(38,18) - string for financial safety */
  total_fees?: string;
  /** @precision NUMERIC(38,18) - string for financial safety */
  total_ib?: string;
  investor_count?: number;
  /** @precision NUMERIC(38,18) - string for financial safety */
  yield_rate_pct?: string;
  days_in_period?: number;
  /** @precision NUMERIC(38,18) - string for financial safety */
  total_adb?: string;
  /** @precision NUMERIC(38,18) - string for financial safety */
  total_loss_offset?: string;
  /** @precision NUMERIC(38,18) - string for financial safety */
  dust_amount?: string;
  features?: string[];
  conservation_check?: boolean;
  // Preview-specific fields
  allocations?: ADBAllocationItem[];
  // Crystallization info (reporting purpose)
  crystals_in_period?: number;
  /** @precision NUMERIC(38,18) - string for financial safety */
  crystal_gross_total?: string;
}

/**
 * Individual investor allocation from ADB RPC (legacy V4)
 * Field names match the actual JSONB keys returned by the PostgreSQL function.
 */
export interface ADBAllocationItem {
  investor_id: string;
  investor_email?: string;
  investor_name: string;
  account_type?: string;
  /** @precision NUMERIC(38,18) - string for financial safety */
  adb: string;
  /** Percentage weight (0-100) based on ADB */
  adb_share_pct: string;
  fee_pct: string;
  /** Gross yield amount allocated to this investor */
  gross_yield: string;
  /** @precision NUMERIC(38,18) - string for financial safety */
  fee_amount: string;
  /** Net yield after fees */
  net_yield: string;
  ib_parent_id?: string;
  ib_parent_name?: string;
  /** IB commission rate percentage */
  ib_rate?: string;
  /** @precision NUMERIC(38,18) - string for financial safety */
  ib_amount?: string;
  /** @precision NUMERIC(38,18) - string for financial safety */
  carried_loss?: string;
  /** @precision NUMERIC(38,18) - string for financial safety */
  loss_offset?: string;
  /** @precision NUMERIC(38,18) - string for financial safety */
  taxable_gain?: string;
  has_ib?: boolean;
}

// =============================================================================
// V5 Segmented Yield Types
// =============================================================================

/** Summary of a single segment in V5 yield distribution */
export interface V5SegmentSummary {
  seg_idx: number;
  start: string;
  end: string;
  closing_aum: number;
  yield: number;
  investors?: number;
  skipped: boolean;
  allocations?: V5SegmentAllocation[];
}

/** Per-investor allocation within a single V5 segment */
export interface V5SegmentAllocation {
  investor_id: string;
  investor_name?: string;
  balance: number;
  share_pct: number;
  gross: number;
  fee_pct: number;
  fee: number;
  ib_rate: number;
  ib: number;
  net: number;
}

/** Per-investor segment detail (from _v5_tot.seg_detail) */
export interface V5InvestorSegmentDetail {
  seg: number;
  start?: string;
  end?: string;
  gross: number;
  fee_pct: number;
  fee: number;
  ib: number;
  net: number;
}

/** V5 allocation item from the RPC response */
export interface V5AllocationItem {
  investor_id: string;
  investor_name: string;
  investor_email?: string;
  account_type?: string;
  opening_balance?: number;
  gross: number;
  fee_pct: number;
  fee: number;
  ib_parent_id?: string;
  ib_rate: number;
  ib: number;
  net: number;
  fee_credit: number;
  ib_credit: number;
  // Month-to-date aggregates
  mtd_gross?: number;
  mtd_fee?: number;
  mtd_ib?: number;
  mtd_net?: number;
}

/** V5 RPC result shape */
export interface V5YieldRPCResult {
  success: boolean;
  error?: string;
  fund_id?: string;
  fund_code?: string;
  fund_asset?: string;
  period_start?: string;
  period_end?: string;
  days_in_period?: number;
  opening_aum?: number;
  recorded_aum?: number;
  total_yield?: number;
  gross_yield?: number;
  net_yield?: number;
  total_fees?: number;
  total_ib?: number;
  total_fee_credit?: number;
  total_ib_credit?: number;
  dust_amount?: number;
  investor_count?: number;
  segment_count?: number;
  crystal_count?: number;
  crystal_markers?: V5SegmentSummary[];
  allocations?: V5AllocationItem[];
  conservation_check?: boolean;
  calculation_method?: string;
  features?: string[];
  // Apply-specific
  distribution_id?: string;
  position_sum?: number;
  position_aum_match?: boolean;
  crystals_consolidated?: number;
  ib_auto_paid?: boolean;
}

/**
 * Supabase join result type for investor_fund_performance with statement_periods
 * Note: Uses string | null for numeric fields to match Supabase JSON return types
 */
export interface PerformanceWithPeriod {
  id: string;
  investor_id: string;
  fund_name: string;
  period_id: string;
  /** @precision NUMERIC - string for financial safety */
  mtd_beginning_balance: string | null;
  /** @precision NUMERIC - string for financial safety */
  mtd_ending_balance: string | null;
  /** @precision NUMERIC - string for financial safety */
  mtd_additions: string | null;
  /** @precision NUMERIC - string for financial safety */
  mtd_redemptions: string | null;
  /** @precision NUMERIC - string for financial safety */
  mtd_net_income: string | null;
  /** @precision NUMERIC - string for financial safety */
  mtd_rate_of_return: string | null;
  /** @precision NUMERIC - string for financial safety */
  qtd_beginning_balance: string | null;
  /** @precision NUMERIC - string for financial safety */
  qtd_additions: string | null;
  /** @precision NUMERIC - string for financial safety */
  qtd_redemptions: string | null;
  /** @precision NUMERIC - string for financial safety */
  qtd_net_income: string | null;
  /** @precision NUMERIC - string for financial safety */
  qtd_ending_balance: string | null;
  /** @precision NUMERIC - string for financial safety */
  qtd_rate_of_return: string | null;
  /** @precision NUMERIC - string for financial safety */
  ytd_beginning_balance: string | null;
  /** @precision NUMERIC - string for financial safety */
  ytd_additions: string | null;
  /** @precision NUMERIC - string for financial safety */
  ytd_redemptions: string | null;
  /** @precision NUMERIC - string for financial safety */
  ytd_net_income: string | null;
  /** @precision NUMERIC - string for financial safety */
  ytd_ending_balance: string | null;
  /** @precision NUMERIC - string for financial safety */
  ytd_rate_of_return: string | null;
  /** @precision NUMERIC - string for financial safety */
  itd_beginning_balance: string | null;
  /** @precision NUMERIC - string for financial safety */
  itd_additions: string | null;
  /** @precision NUMERIC - string for financial safety */
  itd_redemptions: string | null;
  /** @precision NUMERIC - string for financial safety */
  itd_net_income: string | null;
  /** @precision NUMERIC - string for financial safety */
  itd_ending_balance: string | null;
  /** @precision NUMERIC - string for financial safety */
  itd_rate_of_return: string | null;
  period: {
    period_name?: string;
    period_end_date?: string;
    year?: number;
    month?: number;
  } | null;
}
