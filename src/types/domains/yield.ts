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
  ibSource?: 'from_platform_fees' | 'from_investor_yield';
  // Idempotency
  referenceId: string;
  wouldSkip: boolean;
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
