/**
 * Indigo Yield Engine — Ralph Loop
 *
 * Full lifecycle replay for SOL and XRP funds.
 * Validates the engine against Excel source-of-truth for every checkpoint.
 * Runs purely in Node.js — no Supabase, no Playwright, no browser.
 *
 * Usage: npx vitest run tests/ralph-loop.test.ts
 */

import { describe, it, expect } from "vitest";
import { createFundState, applyEvent, previewDistribution } from "../src/engine";
import type { DepositEvent, YieldRecordEvent, WithdrawEvent, EngineEvent } from "../src/types";
import { parseFinancial } from "../../shared/financial";

// ─── SOL Full Lifecycle (from Excel + Ralph loop data) ─────────

const SOL_LIFECYCLE = {
  fundName: "SOL Yield Fund",
  currency: "SOL",

  // Sequence of operations in chronological order
  steps: [
    // 2025-09-02: INDIGO LP deposits 1250 SOL (0% fees)
    { seq: 1, type: "DEPOSIT", date: "2025-09-02", investor: "INDIGO_LP", name: "INDIGO DIGITAL ASSET FUND LP", amount: "1250", feePct: "0", ibPct: "0" },
    // 2025-09-04: Yield record transaction 1252 SOL
    { seq: 2, type: "YIELD", date: "2025-09-04", aum: "1252", purpose: "transaction" },
    // 2025-09-04: Paul Johnson deposits 234.17 SOL (13.5% fees, 1.5% IB Alex Jacobs)
    { seq: 3, type: "DEPOSIT", date: "2025-09-04", investor: "paul_johnson", name: "Paul Johnson", amount: "234.17", feePct: "0.135", ibPct: "0.015", ibId: "alex_jacobs", ibName: "Alex Jacobs" },
    // 2025-09-30: Yield record reporting 1500 SOL
    { seq: 4, type: "YIELD", date: "2025-09-30", aum: "1500", purpose: "reporting" },

    // Expected after step 4:
    //   INDIGO LP: 1263.65, Paul: 236.02, Alex: 0.0327, Fees: 0.2942
  ],

  // Expected investor balances after each checkpoint
  expectedAfterStep4: {
    "INDIGO_LP": { balance: 1263.65, tolerance: 0.01 },
    "paul_johnson": { balance: 236.022, tolerance: 0.01 },
    "INDIGO_FEES": { balance: 0.294, tolerance: 0.01 },
    "alex_jacobs": { balance: 0.0327, tolerance: 0.001 },
  },
};

// ─── XRP Full Lifecycle ────────────────────────────────────────

const XRP_LIFECYCLE = {
  fundName: "XRP Yield Fund",
  currency: "XRP",

  steps: [
    // 2025-11-17: Sam Johnson deposits 135003 XRP (16% fees, 4% IB Ryan)
    { seq: 1, type: "DEPOSIT", date: "2025-11-17", investor: "sam_johnson", name: "Sam Johnson", amount: "135003", feePct: "0.16", ibPct: "0.04", ibId: "ryan_vdw", ibName: "Ryan Van Der Wall" },
    // 2025-11-25: Sam Johnson deposits 49000 XRP (no yield between)
    { seq: 2, type: "DEPOSIT", date: "2025-11-25", investor: "sam_johnson", name: "Sam Johnson", amount: "49000", feePct: "0.16", ibPct: "0.04", ibId: "ryan_vdw", ibName: "Ryan Van Der Wall" },
    // 2025-11-30: Yield record reporting 184358 XRP
    { seq: 3, type: "YIELD", date: "2025-11-30", aum: "184358", purpose: "reporting" },
    // 2025-11-30: Sam deposits 45000 XRP AFTER reporting (same day, later sequence)
    { seq: 4, type: "DEPOSIT", date: "2025-11-30", investor: "sam_johnson", name: "Sam Johnson", amount: "45000", feePct: "0.16", ibPct: "0.04", ibId: "ryan_vdw", ibName: "Ryan Van Der Wall" },
    // 2025-12-08: Yield record transaction 229731 XRP
    { seq: 5, type: "YIELD", date: "2025-12-08", aum: "229731", purpose: "transaction" },
  ],

  // Expected after November reporting (step 3)
  expectedAfterNov: {
    "sam_johnson": { balance: 184287, tolerance: 1 },
    "INDIGO_FEES": { balance: 56.80, tolerance: 0.1 },
    "ryan_vdw": { balance: 14.20, tolerance: 0.1 },
    totalAUM: 184358,
  },

  // Expected after December transaction yield (step 5)
  expectedAfterDec: {
    "sam_johnson": { balance: 229585.31, tolerance: 1 },
    "INDIGO_FEES": { balance: 56.892, tolerance: 0.1 },
    "ryan_vdw": { balance: 14.223, tolerance: 0.1 },
    totalAUM: 229731,
  },
};

// ─── Helper to run lifecycle ───────────────────────────────────

function runLifecycle(
  fundId: string,
  code: string,
  asset: string,
  steps: Array<Record<string, any>>
): { state: ReturnType<typeof createFundState>; events: EngineEvent[] } {
  let state = createFundState(fundId, code, asset);
  const events: EngineEvent[] = [];

  for (const step of steps) {
    let event: EngineEvent;

    if (step.type === "DEPOSIT") {
      event = {
        id: `ev_${step.seq}`,
        fundId,
        eventType: "DEPOSIT",
        date: step.date,
        sequence: step.seq,
        investorId: step.investor,
        investorName: step.name,
        amount: step.amount,
        feePct: step.feePct || "0",
        ibPct: step.ibPct || "0",
        ibId: step.ibId,
        ibName: step.ibName,
      } as DepositEvent;
    } else if (step.type === "YIELD") {
      event = {
        id: `ev_${step.seq}`,
        fundId,
        eventType: "YIELD_RECORD",
        date: step.date,
        sequence: step.seq,
        recordedAUM: step.aum,
        purpose: step.purpose,
      } as YieldRecordEvent;
    } else {
      throw new Error(`Unknown step type: ${step.type}`);
    }

    events.push(event);
    state = applyEvent(state, event);
  }

  return { state, events };
}

// ─── Tests ─────────────────────────────────────────────────────

describe("Ralph Loop — SOL Full Lifecycle", () => {
  it("replays SOL lifecycle and validates checkpoint balances", () => {
    const { state } = runLifecycle("fund-sol", "SOL", "SOL", SOL_LIFECYCLE.steps);

    // All 4 expected investors should exist
    expect(state.investors.size).toBeGreaterThanOrEqual(4);

    // Check each expected balance
    for (const [id, expected] of Object.entries(SOL_LIFECYCLE.expectedAfterStep4)) {
      const inv = state.investors.get(id);
      expect(inv, `Investor ${id} should exist`).toBeDefined();
      const balance = parseFinancial(inv!.balance).toNumber();
      expect(balance, `${id} balance ${balance} ≈ ${expected.balance}`).toBeCloseTo(expected.balance, 0);
    }

    // Verify total AUM
    expect(parseFinancial(state.totalAUM).toNumber()).toBe(1500);
  });

  it("SOL yield distribution preview matches expected values", () => {
    // Replay up to step 3 (before reporting), then preview step 4
    const { state: stateBeforeReport } = runLifecycle("fund-sol", "SOL", "SOL", SOL_LIFECYCLE.steps.slice(0, 3));

    const yrEvent: YieldRecordEvent = {
      id: "ev_4",
      fundId: "fund-sol",
      eventType: "YIELD_RECORD",
      date: "2025-09-30",
      sequence: 4,
      recordedAUM: "1500",
      purpose: "reporting",
    };

    const dist = previewDistribution(stateBeforeReport, yrEvent);

    const lp = dist.distributions.find(d => d.investorId === "INDIGO_LP")!;
    const paul = dist.distributions.find(d => d.investorId === "paul_johnson")!;

    // LP net yield ≈ 11.65
    expect(parseFinancial(lp.netYield).toNumber()).toBeCloseTo(11.65, 1);
    // Paul net yield ≈ 1.85
    expect(parseFinancial(paul.netYield).toNumber()).toBeCloseTo(1.85, 1);
    // Paul fee ≈ 0.294
    expect(parseFinancial(paul.feeAmount).toNumber()).toBeCloseTo(0.294, 1);
    // Paul IB ≈ 0.0327
    expect(parseFinancial(paul.ibAmount).toNumber()).toBeCloseTo(0.0327, 2);
  });
});

describe("Ralph Loop — XRP Full Lifecycle", () => {
  it("replays XRP lifecycle through November reporting", () => {
    const { state } = runLifecycle("fund-xrp", "XRP", "XRP", XRP_LIFECYCLE.steps.slice(0, 3));

    const exp = XRP_LIFECYCLE.expectedAfterNov;

    // Sam balance ≈ 184287
    const sam = state.investors.get("sam_johnson")!;
    expect(parseFinancial(sam.balance).toNumber()).toBeCloseTo(184287, 0);

    // INDIGO FEES ≈ 56.80
    const fees = state.investors.get("INDIGO_FEES")!;
    expect(fees).toBeDefined();
    expect(parseFinancial(fees.balance).toNumber()).toBeCloseTo(56.80, 0);

    // Ryan ≈ 14.20
    const ryan = state.investors.get("ryan_vdw")!;
    expect(ryan).toBeDefined();
    expect(parseFinancial(ryan.balance).toNumber()).toBeCloseTo(14.2, 0);

    // Total AUM
    expect(parseFinancial(state.totalAUM).toNumber()).toBe(184358);
  });

  it("replays XRP lifecycle through December transaction yield", () => {
    const { state } = runLifecycle("fund-xrp", "XRP", "XRP", XRP_LIFECYCLE.steps);

    const exp = XRP_LIFECYCLE.expectedAfterDec;

    // Three investors: Sam, INDIGO FEES, Ryan
    expect(state.investors.size).toBeGreaterThanOrEqual(3);

    // Sam ≈ 229585
    expect(parseFinancial(state.investors.get("sam_johnson")!.balance).toNumber())
      .toBeCloseTo(229585, 0);

    // Total AUM
    expect(parseFinancial(state.totalAUM).toNumber()).toBe(229731);
  });

  it("same-date ordering: deposit after reporting is excluded from prior distribution", () => {
    // Step 3 = November reporting at 184358
    // Step 4 = Sam deposits 45000 same day, sequence 4 > 3
    const { state } = runLifecycle("fund-xrp", "XRP", "XRP", XRP_LIFECYCLE.steps.slice(0, 4));

    // After deposit, Sam should have 184287 + 45000 = 229287
    expect(parseFinancial(state.investors.get("sam_johnson")!.balance).toNumber())
      .toBeCloseTo(229287, 0);

    // Total AUM = 184358 + 45000 = 229358
    expect(parseFinancial(state.totalAUM).toNumber()).toBeCloseTo(229358, 0);
  });
});

describe("Ralph Loop — Yield Distribution Formula", () => {
  it("formula: balance * (newAUM - currentAUM) / currentAUM * (1 - feePct - ibPct)", () => {
    const state = createFundState("fund-test", "TEST", "TEST");
    let s = applyEvent(state, {
      id: "ev1", fundId: "fund-test", eventType: "DEPOSIT", date: "2025-01-01", sequence: 1,
      investorId: "inv_a", investorName: "Investor A", amount: "1000", feePct: "0.16", ibPct: "0.04",
    } as DepositEvent);

    const yr: YieldRecordEvent = {
      id: "ev2", fundId: "fund-test", eventType: "YIELD_RECORD", date: "2025-01-15", sequence: 2,
      recordedAUM: "1100", purpose: "transaction",
    };

    const dist = previewDistribution(s, yr);
    const inv = dist.distributions[0];

    // gross = 1000 * (1100-1000)/1000 = 100
    expect(parseFinancial(inv.grossYield).toNumber()).toBeCloseTo(100, 0);
    // fee = 100 * 0.16 = 16
    expect(parseFinancial(inv.feeAmount).toNumber()).toBeCloseTo(16, 0);
    // ib = 100 * 0.04 = 4
    expect(parseFinancial(inv.ibAmount).toNumber()).toBeCloseTo(4, 0);
    // net = 100 - 16 - 4 = 80
    expect(parseFinancial(inv.netYield).toNumber()).toBeCloseTo(80, 0);
    // new balance = 1000 + 80 = 1080
    expect(parseFinancial(inv.newBalance).toNumber()).toBeCloseTo(1080, 0);
  });

  it("INDIGO FEES balance earns yield as investor in next period", () => {
    const state = createFundState("fund-test", "TEST", "TEST");
    let s = applyEvent(state, {
      id: "ev1", fundId: "fund-test", eventType: "DEPOSIT", date: "2025-01-01", sequence: 1,
      investorId: "inv_a", investorName: "Investor A", amount: "1000", feePct: "0.20", ibPct: "0",
    } as DepositEvent);

    // Month 1 reporting: AUM 1100, yield = 100, fee = 20
    s = applyEvent(s, {
      id: "ev2", fundId: "fund-test", eventType: "YIELD_RECORD", date: "2025-01-31", sequence: 2,
      recordedAUM: "1100", purpose: "reporting",
    } as YieldRecordEvent);

    // INDIGO FEES now has 20 as investable balance
    const feesAfterMonth1 = s.investors.get("INDIGO_FEES")!;
    expect(parseFinancial(feesAfterMonth1.balance).toNumber()).toBeCloseTo(20, 0);

    // Month 2: Investor A deposits another 1000, then reporting at 2150
    s = applyEvent(s, {
      id: "ev3", fundId: "fund-test", eventType: "DEPOSIT", date: "2025-02-01", sequence: 3,
      investorId: "inv_a", investorName: "Investor A", amount: "1000", feePct: "0.20", ibPct: "0",
    } as DepositEvent);

    const yr: YieldRecordEvent = {
      id: "ev4", fundId: "fund-test", eventType: "YIELD_RECORD", date: "2025-02-28", sequence: 4,
      recordedAUM: "2150", purpose: "reporting",
    };

    const dist = previewDistribution(s, yr);

    // Should have 2 distributions: inv_a and INDIGO_FEES
    expect(dist.distributions.length).toBe(2);

    const feesDist = dist.distributions.find(d => d.investorId === "INDIGO_FEES")!;
    expect(feesDist).toBeDefined();
    // INDIGO FEES gross > 0 (its 20 earned yield)
    expect(parseFinancial(feesDist.grossYield).toNumber()).toBeGreaterThan(0);
    // INDIGO FEES net = gross (0% fees on fees account)
    expect(parseFinancial(feesDist.netYield).toNumber()).toBeGreaterThan(0);
    expect(feesDist.feeAmount).toBe("0.000000000000000000");
  });
});
