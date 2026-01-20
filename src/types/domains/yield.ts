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
  /** Total AUM - string for NUMERIC(28,10) precision */
  total_aum: string;
  /** NAV per share - string for NUMERIC precision */
  nav_per_share?: string | null;
  /** Total shares - string for NUMERIC precision */
  total_shares?: string | null;
  source?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * Purpose types for yield operations
 */
export type YieldPurpose = "reporting" | "transaction";

/**
 * Status of yield distribution
 */
export type YieldStatus = "preview" | "applied";
