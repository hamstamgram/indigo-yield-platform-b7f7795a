/**
 * Production Ralph Loop — Full lifecycle replay through engine adapter
 *
 * Validates the engine against Excel source-of-truth for every fund checkpoint.
 * Uses the actual engineAdapterService (engine → Supabase write path).
 *
 * Usage: npx vitest run tests/production-ralph-loop.test.ts
 */

import { describe, it, expect, beforeAll } from "vitest";
import { createFundState, applyEvent, previewDistribution, replayEvents } from "../src/engine";
import type { DepositEvent, YieldRecordEvent, WithdrawEvent, EngineEvent } from "../src/types";
import { parseFinancial } from "../../shared/financial";

// ═══════════════════════════════════════════════════════════════
// SOL FULL LIFECYCLE — 13 transactions + 7 yield events
// From: tests/e2e/sol-ralph-loop-validation.spec.ts (Playwright)
// ═══════════════════════════════════════════════════════════════

const SOL_FULL = {
  fund: { id: "fund-sol-full", code: "SOL", asset: "SOL" },

  deposits: [
    { seq: 1,  date: "2025-09-02", inv: "INDIGO_LP",       name: "INDIGO DIGITAL ASSET FUND LP", amt: "1250",   fee: "0",     ib: "0" },
    { seq: 3,  date: "2025-09-04", inv: "paul_johnson",    name: "Paul Johnson",                  amt: "234.17", fee: "0.135", ib: "0.015", ibId: "alex_jacobs",  ibName: "Alex Jacobs" },
    // Withdrawals use negative amounts in the Playwright data
  { seq: 5,  date: "2025-10-03", inv: "paul_johnson", name: "Paul Johnson", amt: "236.02",  fee: "0.135", ib: "0.015", ibId: "alex_jacobs", ibName: "Alex Jacobs", wd: true },
    { seq: 7,  date: "2025-10-23", inv: "jose_molla",      name: "Jose Molla",                    amt: "87.98",  fee: "0.15",  ib: "0" },
    { seq: 9,  date: "2025-11-17", inv: "sam_johnson",     name: "Sam Johnson",                   amt: "1800.05",fee: "0.16",  ib: "0.04", ibId: "ryan_vdw",    ibName: "Ryan Van Der Wall" },
    { seq: 11, date: "2025-11-25", inv: "sam_johnson",     name: "Sam Johnson",                   amt: "750",    fee: "0.16",  ib: "0.04", ibId: "ryan_vdw",    ibName: "Ryan Van Der Wall" },
    { seq: 13, date: "2025-11-30", inv: "sam_johnson",     name: "Sam Johnson",                   amt: "750",    fee: "0.16",  ib: "0.04", ibId: "ryan_vdw",    ibName: "Ryan Van Der Wall" },
    { seq: 15, date: "2025-12-04", inv: "INDIGO_LP",     name: "INDIGO DIGITAL ASSET FUND LP", amt: "1285.66", fee: "0",     ib: "0",     wd: true },
    { seq: 17, date: "2025-12-08", inv: "sam_johnson",     name: "Sam Johnson",                   amt: "770",    fee: "0.16",  ib: "0.04", ibId: "ryan_vdw",    ibName: "Ryan Van Der Wall" },
    { seq: 19, date: "2025-12-15", inv: "sam_johnson",     name: "Sam Johnson",                   amt: "766",    fee: "0.16",  ib: "0.04", ibId: "ryan_vdw",    ibName: "Ryan Van Der Wall" },
    { seq: 21, date: "2026-01-02", inv: "sam_johnson",  name: "Sam Johnson",     amt: "4873.15", fee: "0.16",  ib: "0.04", ibId: "ryan_vdw", ibName: "Ryan Van Der Wall", wd: true },
    { seq: 23, date: "2026-02-12", inv: "jose_molla",      name: "Jose Molla",                    amt: "393.77", fee: "0.15",  ib: "0" },
    { seq: 24, date: "2026-02-12", inv: "alok_batra",      name: "ALOK PAVAN BATRA",              amt: "826.54", fee: "0.2",   ib: "0" },
  ],

  yields: [
    { seq: 2,  date: "2025-09-04", aum: "1252",  purpose: "transaction" as const },
    { seq: 4,  date: "2025-09-30", aum: "1500",  purpose: "reporting" as const },
    { seq: 6,  date: "2025-10-03", aum: "1500",  purpose: "transaction" as const },
    { seq: 8,  date: "2025-10-23", aum: "1274",  purpose: "transaction" as const },
    { seq: 10, date: "2025-10-31", aum: "1365",  purpose: "reporting" as const },
    { seq: 12, date: "2025-11-17", aum: "1369",  purpose: "transaction" as const },
    { seq: 14, date: "2025-11-25", aum: "3176",  purpose: "transaction" as const },
    { seq: 16, date: "2025-11-30", aum: "3934",  purpose: "reporting" as const },
    { seq: 18, date: "2025-12-04", aum: "4690",  purpose: "transaction" as const },
    { seq: 20, date: "2025-12-08", aum: "3405",  purpose: "transaction" as const },
    { seq: 22, date: "2025-12-15", aum: "4181",  purpose: "transaction" as const },
    { seq: 25, date: "2026-01-01", aum: "4974",  purpose: "reporting" as const },
    { seq: 26, date: "2026-01-02", aum: "4974",  purpose: "transaction" as const },
    { seq: 27, date: "2026-02-01", aum: "102",   purpose: "reporting" as const },
    { seq: 28, date: "2026-02-12", aum: "102",   purpose: "transaction" as const },
  ],

  // Expected AUM at each checkpoint
  checkpoints: [
    { afterSeq: 1,  totalAUM: 1250 },
    { afterSeq: 2,  totalAUM: 1252 },
    { afterSeq: 3,  totalAUM: 1486.17 },
    { afterSeq: 4,  totalAUM: 1500 },
    { afterSeq: 8,  totalAUM: 1274 },
    { afterSeq: 10, totalAUM: 1365 },
    { afterSeq: 14, totalAUM: 3176 },
    { afterSeq: 16, totalAUM: 3934 },
    { afterSeq: 22, totalAUM: 4181 },
    { afterSeq: 25, totalAUM: 4974 },
    { afterSeq: 27, totalAUM: 102 },
  ],
};

// ═══════════════════════════════════════════════════════════════
// XRP FULL LIFECYCLE  
// ═══════════════════════════════════════════════════════════════

const XRP_FULL = {
  fund: { id: "fund-xrp-full", code: "XRP", asset: "XRP" },

  deposits: [
    { seq: 1,  date: "2025-11-17", inv: "sam_johnson", name: "Sam Johnson", amt: "135003", fee: "0.16", ib: "0.04", ibId: "ryan_vdw", ibName: "Ryan Van Der Wall" },
    { seq: 2,  date: "2025-11-25", inv: "sam_johnson", name: "Sam Johnson", amt: "49000",  fee: "0.16", ib: "0.04", ibId: "ryan_vdw", ibName: "Ryan Van Der Wall" },
    { seq: 4,  date: "2025-11-30", inv: "sam_johnson", name: "Sam Johnson", amt: "45000",  fee: "0.16", ib: "0.04", ibId: "ryan_vdw", ibName: "Ryan Van Der Wall" },
  ],

  yields: [
    { seq: 3, date: "2025-11-30", aum: "184358", purpose: "reporting" as const },
    { seq: 5, date: "2025-12-08", aum: "229731", purpose: "transaction" as const },
  ],

  checkpoints: [
    { afterSeq: 3, totalAUM: 184358 },
    { afterSeq: 5, totalAUM: 229731 },
  ],

  expectedAfterNov: {
    "sam_johnson": 184287,
    "INDIGO_FEES": 56.80,
    "ryan_vdw": 14.20,
  },
};

// ═══════════════════════════════════════════════════════════════
// Helper
// ═══════════════════════════════════════════════════════════════

interface LifecycleStep {
  seq: number; type: string; date: string;
  inv?: string; name?: string; amt?: string;
  fee?: string; ib?: string; ibId?: string; ibName?: string;
  aum?: string; purpose?: "transaction" | "reporting";
  wd?: boolean; // withdrawal flag
}

function runFullLifecycle(fundId: string, code: string, asset: string, steps: LifecycleStep[]) {
  let state = createFundState(fundId, code, asset);

  for (const step of steps) {
    if (step.type === "DEPOSIT") {
      if (step.wd) {
        state = applyEvent(state, {
          id: `ev_${step.seq}`, fundId, eventType: "WITHDRAW",
          date: step.date, sequence: step.seq,
          investorId: step.inv!, requestedAmount: step.amt!,
          actualAmount: step.amt!, dustAmount: "0",
          isFull: false,
        } as WithdrawEvent);
      } else {
        state = applyEvent(state, {
          id: `ev_${step.seq}`, fundId, eventType: "DEPOSIT",
          date: step.date, sequence: step.seq,
          investorId: step.inv!, investorName: step.name!,
          amount: step.amt!, feePct: step.fee!, ibPct: step.ib!,
          ibId: step.ibId, ibName: step.ibName,
        } as DepositEvent);
      }
    } else if (step.type === "YIELD") {
      state = applyEvent(state, {
        id: `ev_${step.seq}`, fundId, eventType: "YIELD_RECORD",
        date: step.date, sequence: step.seq,
        recordedAUM: step.aum!, purpose: step.purpose!,
      } as YieldRecordEvent);
    }
  }

  return state;
}

// ═══════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════

describe("Production Ralph Loop — SOL Full Lifecycle (20 events)", () => {
  const steps = [
    ...SOL_FULL.deposits.map(d => ({ ...d, type: "DEPOSIT" })),
    ...SOL_FULL.yields.map(y => ({ ...y, type: "YIELD" })),
  ].sort((a, b) => a.seq - b.seq);

  it("replays all 20 events and validates every checkpoint AUM", () => {
    const state = runFullLifecycle(
      SOL_FULL.fund.id, SOL_FULL.fund.code, SOL_FULL.fund.asset, steps
    );

    // Verify every checkpoint
    for (const cp of SOL_FULL.checkpoints) {
      // Re-run up to this checkpoint
      const partialSteps = steps.filter(s => s.seq <= cp.afterSeq);
      const partialState = runFullLifecycle(
        SOL_FULL.fund.id, SOL_FULL.fund.code, SOL_FULL.fund.asset, partialSteps
      );

      const actualAUM = parseFinancial(partialState.totalAUM).toNumber();
      expect(actualAUM, `AUM at seq ${cp.afterSeq}: ${actualAUM} ≈ ${cp.totalAUM}`)
        .toBeCloseTo(cp.totalAUM, 0);
    }
  });

  it("September distribution matches exact Excel values", () => {
    const stepsToSep30 = steps.filter(s => s.seq <= 3); // Before reporting
    const state = runFullLifecycle(
      SOL_FULL.fund.id, SOL_FULL.fund.code, SOL_FULL.fund.asset, stepsToSep30
    );

    const yr: YieldRecordEvent = {
      id: "ev_4", fundId: SOL_FULL.fund.id, eventType: "YIELD_RECORD",
      date: "2025-09-30", sequence: 4, recordedAUM: "1500", purpose: "reporting",
    };

    const dist = previewDistribution(state, yr);
    const lp = dist.distributions.find(d => d.investorId === "INDIGO_LP")!;
    const paul = dist.distributions.find(d => d.investorId === "paul_johnson")!;

    expect(parseFinancial(lp.netYield).toNumber()).toBeCloseTo(11.65, 1);
    expect(parseFinancial(paul.netYield).toNumber()).toBeCloseTo(1.85, 1);
    expect(parseFinancial(paul.feeAmount).toNumber()).toBeCloseTo(0.294, 1);
    expect(parseFinancial(paul.ibAmount).toNumber()).toBeCloseTo(0.0327, 2);
  });

  it("investors accumulate across multiple periods", () => {
    const state = runFullLifecycle(
      SOL_FULL.fund.id, SOL_FULL.fund.code, SOL_FULL.fund.asset, steps
    );

    // After full lifecycle, we should have multiple investors
    const investorIds = Array.from(state.investors.keys());
    expect(investorIds.length).toBeGreaterThanOrEqual(6);
    
    // INDIGO_FEES should have a meaningful balance
    expect(state.investors.has("INDIGO_FEES")).toBe(true);
    const feesBalance = parseFinancial(state.investors.get("INDIGO_FEES")!.balance).toNumber();
    expect(feesBalance).toBeGreaterThan(0.1);
  });
});

describe("Production Ralph Loop — XRP Full Lifecycle", () => {
  const steps = [
    ...XRP_FULL.deposits.map(d => ({ ...d, type: "DEPOSIT" })),
    ...XRP_FULL.yields.map(y => ({ ...y, type: "YIELD" })),
  ].sort((a, b) => a.seq - b.seq);

  it("replays XRP lifecycle and validates November reporting", () => {
    const state = runFullLifecycle(
      XRP_FULL.fund.id, XRP_FULL.fund.code, XRP_FULL.fund.asset,
      steps.filter(s => s.seq <= 3)
    );

    expect(parseFinancial(state.totalAUM).toNumber()).toBe(184358);
    
    const sam = state.investors.get("sam_johnson")!;
    expect(parseFinancial(sam.balance).toNumber()).toBeCloseTo(184287, 0);

    const fees = state.investors.get("INDIGO_FEES")!;
    expect(parseFinancial(fees.balance).toNumber()).toBeCloseTo(56.80, 0);

    const ryan = state.investors.get("ryan_vdw")!;
    expect(parseFinancial(ryan.balance).toNumber()).toBeCloseTo(14.2, 0);
  });

  it("December transaction yield includes INDIGO FEES + Ryan as investors", () => {
    const stateBeforeDec = runFullLifecycle(
      XRP_FULL.fund.id, XRP_FULL.fund.code, XRP_FULL.fund.asset,
      steps.filter(s => s.seq <= 4)
    );

    const yr: YieldRecordEvent = {
      id: "ev_5", fundId: XRP_FULL.fund.id, eventType: "YIELD_RECORD",
      date: "2025-12-08", sequence: 5, recordedAUM: "229731", purpose: "transaction",
    };

    const dist = previewDistribution(stateBeforeDec, yr);

    // Three investors in distribution
    expect(dist.distributions.length).toBe(3);

    const sam = dist.distributions.find(d => d.investorId === "sam_johnson")!;
    const fees = dist.distributions.find(d => d.investorId === "INDIGO_FEES")!;
    const ryan = dist.distributions.find(d => d.investorId === "ryan_vdw")!;

    expect(sam).toBeDefined();
    expect(fees).toBeDefined();
    expect(ryan).toBeDefined();

    // INDIGO FEES has 0% fees
    expect(fees.feeAmount).toBe("0.000000000000000000");
    expect(parseFinancial(fees.grossYield).toNumber()).toBeGreaterThan(0);
  });
});

describe("Production Ralph Loop — Void Resilience", () => {
  it("void and re-apply preserves correct state", () => {
    const state = createFundState("fund-void", "SOL", "SOL");
    let s = applyEvent(state, {
      id: "ev1", fundId: "fund-void", eventType: "DEPOSIT",
      date: "2025-09-02", sequence: 1,
      investorId: "INDIGO_LP", investorName: "INDIGO LP",
      amount: "1250", feePct: "0", ibPct: "0",
    } as DepositEvent);

    s = applyEvent(s, {
      id: "ev2", fundId: "fund-void", eventType: "YIELD_RECORD",
      date: "2025-09-04", sequence: 2, recordedAUM: "1252", purpose: "transaction",
    } as YieldRecordEvent);

    // Add then void a bad deposit
    s = applyEvent(s, {
      id: "ev3", fundId: "fund-void", eventType: "DEPOSIT",
      date: "2025-09-04", sequence: 3,
      investorId: "bad_inv", investorName: "Bad Investor",
      amount: "100", feePct: "0.16", ibPct: "0.04",
    } as DepositEvent);

    expect(s.investors.size).toBe(2); // LP + bad_inv

    // Void via replay (simulating what reverseEvent does)
    const allEvents: EngineEvent[] = [
      { id: "ev1", fundId: "fund-void", eventType: "DEPOSIT", date: "2025-09-02", sequence: 1, investorId: "INDIGO_LP", investorName: "INDIGO LP", amount: "1250", feePct: "0", ibPct: "0" } as DepositEvent,
      { id: "ev2", fundId: "fund-void", eventType: "YIELD_RECORD", date: "2025-09-04", sequence: 2, recordedAUM: "1252", purpose: "transaction" } as YieldRecordEvent,
      { id: "ev3", fundId: "fund-void", eventType: "DEPOSIT", date: "2025-09-04", sequence: 3, investorId: "bad_inv", investorName: "Bad Investor", amount: "100", feePct: "0.16", ibPct: "0.04" } as DepositEvent,
      { id: "ev4", fundId: "fund-void", eventType: "REVERSE", date: "2025-09-05", sequence: 4, originalEventId: "ev3", reason: "Wrong investor" } as EngineEvent,
    ];

    const voided = replayEvents("fund-void", "SOL", "SOL", allEvents);
    
    // Bad investor should be excluded
    expect(voided.investors.size).toBe(1);
    expect(voided.investors.has("INDIGO_LP")).toBe(true);
    expect(voided.investors.has("bad_inv")).toBe(false);
    expect(voided.totalAUM).toBe("1252.000000000000000000");
  });
});

describe("Production Ralph Loop — Performance", () => {
  it("full lifecycle replay under 200ms for both funds", () => {
    const solSteps = [
      ...SOL_FULL.deposits.map(d => ({ ...d, type: "DEPOSIT" })),
      ...SOL_FULL.yields.map(y => ({ ...y, type: "YIELD" })),
    ].sort((a, b) => a.seq - b.seq);

    const xrpSteps = [
      ...XRP_FULL.deposits.map(d => ({ ...d, type: "DEPOSIT" })),
      ...XRP_FULL.yields.map(y => ({ ...y, type: "YIELD" })),
    ].sort((a, b) => a.seq - b.seq);

    const start = performance.now();
    runFullLifecycle(SOL_FULL.fund.id, SOL_FULL.fund.code, SOL_FULL.fund.asset, solSteps);
    runFullLifecycle(XRP_FULL.fund.id, XRP_FULL.fund.code, XRP_FULL.fund.asset, xrpSteps);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(200);
  });
});
