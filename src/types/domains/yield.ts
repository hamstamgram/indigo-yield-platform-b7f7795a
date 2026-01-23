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
  /** New total AUM - string for NUMERIC(28,10) precision */
  newTotalAUM: string;
  purpose?: "reporting" | "transaction";
}

/**
 * Individual investor's yield distribution
 */
export interface YieldDistribution {
  investorId: string;
  investorName: string;
  accountType?: string;
  /** Current balance - string for NUMERIC(28,10) precision */
  currentBalance: string;
  /** Allocation percentage - string for decimal precision */
  allocationPercentage: string;
  /** Fee percentage - string for decimal precision */
  feePercentage: string;
  /** Gross yield - string for NUMERIC(28,10) precision */
  grossYield: string;
  /** Fee amount - string for NUMERIC(28,10) precision */
  feeAmount: string;
  /** Net yield - string for NUMERIC(28,10) precision */
  netYield: string;
  /** New balance - string for NUMERIC(28,10) precision */
  newBalance: string;
  /** Position delta - string for NUMERIC(28,10) precision */
  positionDelta: string;
  // IB fields
  ibParentId?: string;
  ibParentName?: string;
  /** IB percentage - string for decimal precision */
  ibPercentage: string;
  /** IB amount - string for NUMERIC(28,10) precision */
  ibAmount: string;
  // Idempotency
  referenceId: string;
  wouldSkip: boolean;
  // ADB (Average Daily Balance) fields - for time-weighted yield calculation
  /** Average daily balance - string for NUMERIC(28,10) precision */
  adb?: string;
  /** ADB weight - string for decimal precision (0-1) */
  adbWeight?: string;
  /** Carried loss - string for NUMERIC(28,10) precision */
  carriedLoss?: string;
  /** Loss offset - string for NUMERIC(28,10) precision */
  lossOffset?: string;
  /** Taxable gain - string for NUMERIC(28,10) precision */
  taxableGain?: string;
  hasIb?: boolean; // Whether investor has an IB parent
}

/**
 * IB credit allocation
 */
export interface IBCredit {
  ibInvestorId: string;
  ibInvestorName: string;
  sourceInvestorId: string;
  sourceInvestorName: string;
  /** IB credit amount - string for NUMERIC(28,10) precision */
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
  /** Gross yield total - string for NUMERIC(28,10) precision */
  gross: string;
  /** Total fees - string for NUMERIC(28,10) precision */
  fees: string;
  /** Total IB fees - string for NUMERIC(28,10) precision */
  ibFees: string;
  /** Net yield total - string for NUMERIC(28,10) precision */
  net: string;
  /** Indigo credit total - string for NUMERIC(28,10) precision */
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
  /** Current AUM - string for NUMERIC(28,10) precision */
  currentAUM: string;
  /** New AUM - string for NUMERIC(28,10) precision */
  newAUM: string;
  /** Gross yield - string for NUMERIC(28,10) precision */
  grossYield: string;
  /** Net yield - string for NUMERIC(28,10) precision */
  netYield: string;
  /** Total fees - string for NUMERIC(28,10) precision */
  totalFees: string;
  /** Total IB fees - string for NUMERIC(28,10) precision */
  totalIbFees: string;
  /** Yield percentage - string for decimal precision */
  yieldPercentage: string;
  investorCount: number;
  distributions: YieldDistribution[];
  ibCredits: IBCredit[];
  /** Indigo fees credit - string for NUMERIC(28,10) precision */
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
  /** Total ADB - string for NUMERIC(28,10) precision */
  totalAdb?: string;
  /** Yield rate percentage - string for decimal precision */
  yieldRatePct?: string;
  /** Total loss offset - string for NUMERIC(28,10) precision */
  totalLossOffset?: string;
  /** Dust/rounding amount - string for NUMERIC(28,10) precision */
  dustAmount?: string;
  calculationMethod?: "pro_rata" | "adb_v3";
  features?: string[]; // e.g., ['time_weighted', 'loss_carryforward']
  conservationCheck?: boolean; // Whether gross = net + fees + ib + dust
}

/**
 * Fund daily AUM record
 */
export interface FundDailyAUM {
  id: string;
  fund_id: string;
  aum_date: string;
  as_of_date?: string;
  /** Total AUM - may come as number from DB */
  total_aum: string | number;
  /** NAV per share - may come as number from DB */
  nav_per_share?: string | number | null;
  /** Total shares - may come as number from DB */
  total_shares?: string | number | null;
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
 * ADB (Average Daily Balance) Yield Distribution RPC Result
 * Type-safe interface for apply_adb_yield_distribution_v3 and preview_adb_yield_distribution_v3 results
 */
export interface ADBYieldRPCResult {
  success: boolean;
  error?: string;
  fund_id?: string;
  fund_code?: string;
  fund_asset?: string;
  gross_yield?: number;
  net_yield?: number;
  total_fees?: number;
  total_ib?: number;
  investor_count?: number;
  yield_rate_pct?: number;
  days_in_period?: number;
  total_adb?: number;
  total_loss_offset?: number;
  dust_amount?: number;
  features?: string[];
  conservation_check?: boolean;
  // Preview-specific fields
  allocations?: ADBAllocationItem[];
}

/**
 * Individual investor allocation from ADB RPC (preview_adb_yield_distribution_v3)
 * Field names match the actual JSONB keys returned by the PostgreSQL function.
 */
export interface ADBAllocationItem {
  investor_id: string;
  investor_email?: string;
  investor_name: string;
  account_type?: string;
  adb: number;
  adb_share_pct: number; // Percentage weight (0-100) based on ADB
  fee_pct: number;
  gross_yield: number; // Gross yield amount allocated to this investor
  fee_amount: number;
  net_yield: number; // Net yield after fees
  ib_parent_id?: string;
  ib_parent_name?: string;
  ib_rate?: number; // IB commission rate percentage
  ib_amount?: number;
  carried_loss?: number;
  loss_offset?: number;
  taxable_gain?: number;
  has_ib?: boolean;
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
  mtd_beginning_balance: string | number | null;
  mtd_ending_balance: string | number | null;
  mtd_additions: string | number | null;
  mtd_redemptions: string | number | null;
  mtd_net_income: string | number | null;
  mtd_rate_of_return: string | number | null;
  qtd_net_income: string | number | null;
  qtd_ending_balance: string | number | null;
  qtd_rate_of_return: string | number | null;
  ytd_net_income: string | number | null;
  ytd_ending_balance: string | number | null;
  ytd_rate_of_return: string | number | null;
  itd_net_income: string | number | null;
  itd_ending_balance: string | number | null;
  itd_rate_of_return: string | number | null;
  period: {
    period_name?: string;
    period_end_date?: string;
    year?: number;
    month?: number;
  } | null;
}
