/**
 * Indigo Yield Engine — Types
 *
 * Pure TypeScript types for the financial yield calculation engine.
 * All monetary values use FinancialString (string) to preserve exact decimal precision.
 */

import type { FinancialString } from "../../shared/financial";

// ─── Event Types ───────────────────────────────────────────────

export type EventType = "DEPOSIT" | "YIELD_RECORD" | "WITHDRAW" | "REVERSE";

export interface BaseEvent {
  id: string;
  fundId: string;
  eventType: EventType;
  date: string; // ISO date string YYYY-MM-DD
  sequence: number;
}

export interface DepositEvent extends BaseEvent {
  eventType: "DEPOSIT";
  investorId: string;
  investorName: string;
  amount: FinancialString;
  feePct: FinancialString; // decimal percentage (e.g., "0.135" = 13.5%)
  ibPct: FinancialString;
  ibId?: string;
  ibName?: string;
}

export interface YieldRecordEvent extends BaseEvent {
  eventType: "YIELD_RECORD";
  recordedAUM: FinancialString;
  purpose: "transaction" | "reporting";
}

export interface WithdrawEvent extends BaseEvent {
  eventType: "WITHDRAW";
  investorId: string;
  requestedAmount: FinancialString;
  actualAmount: FinancialString;
  dustAmount: FinancialString;
  isFull: boolean;
}

export interface ReverseEvent extends BaseEvent {
  eventType: "REVERSE";
  originalEventId: string;
  reason: string;
}

export type EngineEvent = DepositEvent | YieldRecordEvent | WithdrawEvent | ReverseEvent;

// ─── State Types ───────────────────────────────────────────────

export type AccountType = "investor" | "indigo_fees" | "ib";

export interface InvestorBalance {
  investorId: string;
  investorName: string;
  balance: FinancialString;
  feePct: FinancialString;
  ibPct: FinancialString;
  ibId?: string;
  ibName?: string;
  accountType: AccountType;
}

export interface FundState {
  fundId: string;
  fundCode: string;
  fundAsset: string;
  totalAUM: FinancialString;
  investors: Map<string, InvestorBalance>;
  lastSequence: number;
  lastDate: string | null;
}

// ─── Distribution Types ───────────────────────────────────────

export interface InvestorDistribution {
  investorId: string;
  investorName: string;
  accountType: AccountType;
  openingBalance: FinancialString;
  allocationPct: FinancialString;
  grossYield: FinancialString;
  feePct: FinancialString;
  feeAmount: FinancialString;
  ibPct: FinancialString;
  ibAmount: FinancialString;
  netYield: FinancialString;
  newBalance: FinancialString;
  ibId?: string;
  ibName?: string;
}

export interface DistributionTotals {
  openingAUM: FinancialString;
  recordedAUM: FinancialString;
  grossYield: FinancialString;
  totalFees: FinancialString;
  totalIb: FinancialString;
  netYield: FinancialString;
}

export interface DistributionResult {
  fundId: string;
  fundCode: string;
  fundAsset: string;
  yieldDate: string;
  purpose: "transaction" | "reporting";
  openingAUM: FinancialString;
  recordedAUM: FinancialString;
  distributions: InvestorDistribution[];
  totals: DistributionTotals;
  indigoFeesCredit: FinancialString;
  ibCredits: Array<{
    ibId: string;
    ibName: string;
    amount: FinancialString;
  }>;
  newInvestorState: Map<string, InvestorBalance>;
}
