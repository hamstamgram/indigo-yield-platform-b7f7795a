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
  newTotalAUM: number;
  purpose?: "reporting" | "transaction";
}

/**
 * Individual investor's yield distribution
 */
export interface YieldDistribution {
  investorId: string;
  investorName: string;
  accountType?: string;
  currentBalance: number;
  allocationPercentage: number;
  feePercentage: number;
  grossYield: number;
  feeAmount: number;
  netYield: number;
  newBalance: number;
  positionDelta: number;
  // IB fields
  ibParentId?: string;
  ibParentName?: string;
  ibPercentage: number;
  ibAmount: number;
  // Idempotency
  referenceId: string;
  wouldSkip: boolean;
  // ADB (Average Daily Balance) fields - for time-weighted yield calculation
  adb?: number; // Investor's average daily balance for the period
  adbWeight?: number; // Time-weighted allocation weight (0-1)
  carriedLoss?: number; // Loss carryforward from previous periods
  lossOffset?: number; // Amount of loss offset applied this period
  taxableGain?: number; // Gain after loss offset (fee basis)
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
  amount: number;
  ibPercentage: number;
  source: string;
  referenceId: string;
  wouldSkip: boolean;
}

/**
 * Yield totals summary
 */
export interface YieldTotals {
  gross: number;
  fees: number;
  ibFees: number;
  net: number;
  indigoCredit: number;
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
  currentAUM: number;
  newAUM: number;
  grossYield: number;
  netYield: number;
  totalFees: number;
  totalIbFees: number;
  yieldPercentage: number;
  investorCount: number;
  distributions: YieldDistribution[];
  ibCredits: IBCredit[];
  indigoFeesCredit: number;
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
  totalAdb?: number; // Total fund ADB across all investors
  yieldRatePct?: number; // Yield as percentage of ADB
  totalLossOffset?: number; // Total loss offset applied across all investors
  dustAmount?: number; // Rounding residual
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
  total_aum: number;
  nav_per_share?: number | null;
  total_shares?: number | null;
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
