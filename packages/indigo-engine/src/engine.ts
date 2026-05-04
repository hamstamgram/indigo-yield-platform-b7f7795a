/**
 * Indigo Yield Engine — Pure Calculation Engine
 *
 * Zero dependencies beyond decimal.js and shared/financial.
 * No database, no HTTP, no React. Pure functions only.
 *
 * Architecture:
 * - replayEvents(events) → FundState
 * - applyEvent(state, event) → FundState
 * - previewDistribution(state, yieldEvent) → DistributionResult
 */

import Decimal from "decimal.js";
import { parseFinancial, toFinancialString, sumFinancials, type FinancialString } from "../../shared/financial";
import type {
  EngineEvent,
  DepositEvent,
  YieldRecordEvent,
  WithdrawEvent,
  ReverseEvent,
  FundState,
  InvestorBalance,
  InvestorDistribution,
  DistributionResult,
} from "./types";

// ─── Constants ─────────────────────────────────────────────────

const INDIGO_FEES_ID = "INDIGO_FEES";
const INDIGO_LP_ID = "INDIGO_LP";

// ─── Helpers ───────────────────────────────────────────────────

function cloneState(state: FundState): FundState {
  const investors = new Map<string, InvestorBalance>();
  for (const [id, inv] of state.investors) {
    investors.set(id, { ...inv });
  }
  return {
    ...state,
    investors,
  };
}

function getOrCreateInvestor(
  state: FundState,
  id: string,
  name: string,
  accountType: InvestorBalance["accountType"],
  feePct: FinancialString = "0",
  ibPct: FinancialString = "0"
): InvestorBalance {
  if (state.investors.has(id)) {
    return state.investors.get(id)!;
  }
  const inv: InvestorBalance = {
    investorId: id,
    investorName: name,
    balance: "0",
    feePct,
    ibPct,
    accountType,
  };
  state.investors.set(id, inv);
  return inv;
}

function buildNewState(state: FundState, newBalances: Map<string, InvestorBalance>, newAUM: FinancialString): FundState {
  return {
    ...state,
    investors: newBalances,
    totalAUM: newAUM,
  };
}

// ─── Initial State ─────────────────────────────────────────────

export function createFundState(fundId: string, fundCode: string, fundAsset: string): FundState {
  return {
    fundId,
    fundCode,
    fundAsset,
    totalAUM: "0",
    investors: new Map(),
    lastSequence: 0,
    lastDate: null,
  };
}

// ─── Event Replay ──────────────────────────────────────────────

/**
 * Replay all events in sequence order to compute current FundState.
 */
export function replayEvents(fundId: string, fundCode: string, fundAsset: string, events: EngineEvent[]): FundState {
  // Collect reversed event IDs
  const reversedIds = new Set<string>();
  for (const event of events) {
    if (event.eventType === "REVERSE") {
      reversedIds.add((event as ReverseEvent).originalEventId);
    }
  }

  // Filter out reversed events and REVERSE events themselves, then sort
  const activeEvents = events.filter(e => {
    if (e.eventType === "REVERSE") return false;
    if (reversedIds.has(e.id)) return false;
    return true;
  });

  const sorted = [...activeEvents].sort((a, b) => {
    if (a.sequence !== b.sequence) return a.sequence - b.sequence;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  let state = createFundState(fundId, fundCode, fundAsset);
  for (const event of sorted) {
    state = applyEvent(state, event);
  }
  return state;
}

// ─── Event Application ─────────────────────────────────────────

/**
 * Apply a single event to the state, returning the new state.
 */
export function applyEvent(state: FundState, event: EngineEvent): FundState {
  switch (event.eventType) {
    case "DEPOSIT":
      return applyDeposit(state, event);
    case "YIELD_RECORD":
      return applyYieldRecord(state, event);
    case "WITHDRAW":
      return applyWithdraw(state, event);
    case "REVERSE":
      return applyReverse(state, event);
    default:
      throw new Error(`Unknown event type: ${(event as any).eventType}`);
  }
}

function applyDeposit(state: FundState, event: DepositEvent): FundState {
  const next = cloneState(state);
  const amount = parseFinancial(event.amount);

  if (amount.lte(0)) {
    throw new Error("Deposit amount must be positive");
  }

  const inv = getOrCreateInvestor(
    next,
    event.investorId,
    event.investorName,
    "investor",
    event.feePct,
    event.ibPct
  );
  inv.balance = parseFinancial(inv.balance).plus(amount).toFixed(18);
  inv.ibId = event.ibId;
  inv.ibName = event.ibName;

  next.totalAUM = parseFinancial(next.totalAUM).plus(amount).toFixed(18);
  next.lastSequence = event.sequence;
  next.lastDate = event.date;

  return next;
}

function applyYieldRecord(state: FundState, event: YieldRecordEvent): FundState {
  const dist = previewDistribution(state, event);

  // Apply distributions to investor balances
  const newBalances = cloneState(state).investors;

  for (const d of dist.distributions) {
    if (newBalances.has(d.investorId)) {
      const inv = newBalances.get(d.investorId)!;
      inv.balance = d.newBalance;
    } else {
      // New investor (from fees/IB accumulation)
      newBalances.set(d.investorId, {
        investorId: d.investorId,
        investorName: d.investorName,
        balance: d.newBalance,
        feePct: d.feePct,
        ibPct: d.ibPct,
        accountType: d.accountType,
      });
    }
  }

  // For reporting: INDIGO FEES and IB balances become investors
  if (event.purpose === "reporting") {
    // INDIGO FEES gets its fee credits as investable balance
    const feesInv = getOrCreateInvestorFromMap(newBalances, INDIGO_FEES_ID, "INDIGO Fees", "indigo_fees");
    feesInv.balance = parseFinancial(feesInv.balance)
      .plus(parseFinancial(dist.indigoFeesCredit))
      .toFixed(18);
    feesInv.feePct = "0";
    feesInv.ibPct = "0";

    // Each IB gets their IB credit as investable balance
    for (const ibCredit of dist.ibCredits) {
      const ibInv = getOrCreateInvestorFromMap(newBalances, ibCredit.ibId, ibCredit.ibName, "ib");
      ibInv.balance = parseFinancial(ibInv.balance)
        .plus(parseFinancial(ibCredit.amount))
        .toFixed(18);
      ibInv.feePct = "0";
      ibInv.ibPct = "0";
    }
  }

  return buildNewState(state, newBalances, dist.recordedAUM);
}

function getOrCreateInvestorFromMap(
  map: Map<string, InvestorBalance>,
  id: string,
  name: string,
  accountType: InvestorBalance["accountType"]
): InvestorBalance {
  if (map.has(id)) return map.get(id)!;
  const inv: InvestorBalance = {
    investorId: id,
    investorName: name,
    balance: "0",
    feePct: "0",
    ibPct: "0",
    accountType,
  };
  map.set(id, inv);
  return inv;
}

function applyWithdraw(state: FundState, event: WithdrawEvent): FundState {
  const next = cloneState(state);

  if (!next.investors.has(event.investorId)) {
    throw new Error(`Investor ${event.investorId} not found`);
  }

  const inv = next.investors.get(event.investorId)!;
  const actualAmount = parseFinancial(event.actualAmount);
  const dustAmount = parseFinancial(event.dustAmount);

  if (parseFinancial(inv.balance).lt(actualAmount.plus(dustAmount))) {
    throw new Error("Insufficient balance for withdrawal");
  }

  inv.balance = parseFinancial(inv.balance).minus(actualAmount).minus(dustAmount).toFixed(18);

  // Route dust to INDIGO FEES
  if (dustAmount.gt(0)) {
    const feesInv = getOrCreateInvestorFromMap(next.investors, INDIGO_FEES_ID, "INDIGO Fees", "indigo_fees");
    feesInv.balance = parseFinancial(feesInv.balance).plus(dustAmount).toFixed(18);
  }

  next.totalAUM = parseFinancial(next.totalAUM).minus(actualAmount).toFixed(18);
  next.lastSequence = event.sequence;
  next.lastDate = event.date;

  return next;
}

function applyReverse(state: FundState, event: ReverseEvent): FundState {
  // REVERSE does not mutate state directly — it marks the original event as reversed.
  // In a real implementation, this would modify the event store.
  // For the engine, reverse is handled by excluding the reversed event during replay.
  return state;
}

// ─── Distribution Preview ──────────────────────────────────────

/**
 * Compute yield distributions without mutating state.
 * Uses the segmented proportional formula:
 *   investor_share = balance * (recordedAUM - currentAUM) / currentAUM
 *   net = investor_share * (1 - feePct - ibPct)
 */
export function previewDistribution(
  state: FundState,
  event: YieldRecordEvent
): DistributionResult {
  const openingAUM = parseFinancial(state.totalAUM);
  const recordedAUM = parseFinancial(event.recordedAUM);

  if (recordedAUM.lte(openingAUM) && event.purpose === "transaction") {
    // Zero or negative yield — no distribution
    return emptyDistribution(state, event);
  }

  const grossYield = recordedAUM.minus(openingAUM);
  const yieldRate = openingAUM.gt(0) ? grossYield.div(openingAUM) : new Decimal(0);

  const dists: InvestorDistribution[] = [];
  let totalFees = new Decimal(0);
  let totalIb = new Decimal(0);

  for (const [, inv] of state.investors) {
    const balance = parseFinancial(inv.balance);
    if (balance.lte(0)) continue;

    const allocationPct = balance.div(openingAUM).times(100);
    const investorGross = balance.times(yieldRate);
    const feePct = parseFinancial(inv.feePct);
    const ibPct = parseFinancial(inv.ibPct);
    const totalFeePct = feePct.plus(ibPct);

    const feeAmount = investorGross.times(feePct);
    const ibAmount = investorGross.times(ibPct);
    const netYield = investorGross.minus(feeAmount).minus(ibAmount);
    const newBalance = balance.plus(netYield);

    totalFees = totalFees.plus(feeAmount);
    totalIb = totalIb.plus(ibAmount);

    dists.push({
      investorId: inv.investorId,
      investorName: inv.investorName,
      accountType: inv.accountType,
      openingBalance: inv.balance,
      allocationPct: allocationPct.toFixed(18),
      grossYield: investorGross.toFixed(18),
      feePct: inv.feePct,
      feeAmount: feeAmount.toFixed(18),
      ibPct: inv.ibPct,
      ibAmount: ibAmount.toFixed(18),
      netYield: netYield.toFixed(18),
      newBalance: newBalance.toFixed(18),
      ibId: inv.ibId,
      ibName: inv.ibName,
    });
  }

  // Collect IB credits for reporting
  const ibCredits: Array<{ ibId: string; ibName: string; amount: FinancialString }> = [];
  if (event.purpose === "reporting") {
    const ibMap = new Map<string, { name: string; amount: Decimal }>();
    for (const d of dists) {
      if (d.ibId && parseFinancial(d.ibAmount).gt(0)) {
        const existing = ibMap.get(d.ibId);
        if (existing) {
          existing.amount = existing.amount.plus(parseFinancial(d.ibAmount));
        } else {
          ibMap.set(d.ibId, {
            name: d.ibName || d.ibId,
            amount: parseFinancial(d.ibAmount),
          });
        }
      }
    }
    for (const [id, data] of ibMap) {
      ibCredits.push({ ibId: id, ibName: data.name, amount: data.amount.toFixed(18) });
    }
  }

  // Compute new investor state after distribution
  const newState = new Map<string, InvestorBalance>();
  for (const d of dists) {
    const inv = state.investors.get(d.investorId)!;
    newState.set(d.investorId, {
      ...inv,
      balance: d.newBalance,
    });
  }

  // INDIGO FEES credit = total platform fees collected
  const indigoFeesCredit = totalFees.toFixed(18);

  return {
    fundId: state.fundId,
    fundCode: state.fundCode,
    fundAsset: state.fundAsset,
    yieldDate: event.date,
    purpose: event.purpose,
    openingAUM: openingAUM.toFixed(18),
    recordedAUM: recordedAUM.toFixed(18),
    distributions: dists,
    totals: {
      openingAUM: openingAUM.toFixed(18),
      recordedAUM: recordedAUM.toFixed(18),
      grossYield: grossYield.toFixed(18),
      totalFees: totalFees.toFixed(18),
      totalIb: totalIb.toFixed(18),
      netYield: grossYield.minus(totalFees).minus(totalIb).toFixed(18),
    },
    indigoFeesCredit,
    ibCredits,
    newInvestorState: newState,
  };
}

function emptyDistribution(state: FundState, event: YieldRecordEvent): DistributionResult {
  return {
    fundId: state.fundId,
    fundCode: state.fundCode,
    fundAsset: state.fundAsset,
    yieldDate: event.date,
    purpose: event.purpose,
    openingAUM: state.totalAUM,
    recordedAUM: event.recordedAUM,
    distributions: [],
    totals: {
      openingAUM: state.totalAUM,
      recordedAUM: event.recordedAUM,
      grossYield: "0.000000000000000000",
      totalFees: "0.000000000000000000",
      totalIb: "0.000000000000000000",
      netYield: "0.000000000000000000",
    },
    indigoFeesCredit: "0.000000000000000000",
    ibCredits: [],
    newInvestorState: new Map(state.investors),
  };
}
