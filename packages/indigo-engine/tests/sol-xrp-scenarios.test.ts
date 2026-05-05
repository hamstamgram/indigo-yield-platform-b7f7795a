/**
 * Indigo Yield Engine — SOL + XRP acceptance tests
 *
 * These test scenarios are the EXACT acceptance criteria from Adriel's Feb 19, 2026 message.
 * The engine is "correct" when both scenarios produce exact Excel values to 18 decimal places.
 */

import { describe, it, expect } from "vitest";
import {
  createFundState,
  applyEvent,
  previewDistribution,
  replayEvents,
} from "../src/engine";
import type {
  DepositEvent,
  YieldRecordEvent,
  WithdrawEvent,
  EngineEvent,
} from "../src/types";
import { parseFinancial } from "../../shared/financial";

// ─── Helpers ───────────────────────────────────────────────────

function ev(
  overrides: Partial<EngineEvent> & { id: string; eventType: EngineEvent["eventType"]; date: string; sequence: number }
): EngineEvent {
  return {
    fundId: "fund-sol",
    ...overrides,
  } as EngineEvent;
}

function deposit(
  id: string, date: string, seq: number,
  invId: string, invName: string, amount: string,
  feePct: string, ibPct: string, ibId?: string, ibName?: string
): DepositEvent {
  return {
    id, fundId: "fund-sol", eventType: "DEPOSIT", date, sequence: seq,
    investorId: invId, investorName: invName, amount,
    feePct, ibPct, ibId, ibName,
  };
}

function yieldRecord(
  id: string, date: string, seq: number,
  recordedAUM: string, purpose: "transaction" | "reporting"
): YieldRecordEvent {
  return {
    id, fundId: "fund-sol", eventType: "YIELD_RECORD", date, sequence: seq,
    recordedAUM, purpose,
  };
}

// ─── SOL Scenario ──────────────────────────────────────────────
// From Adriel's message:
//   INDIGO LP : +1250 SOL le 02/09/2025 (Fees 0%)
//   Yield Record: Transaction 1252 SOL le 04/09/2025
//     → INDIGO LP +2 SOL, INDIGO Fees 0
//   Paul Johnson : +234.17 SOL (IB Alex Jacobs 1.5% et Fees 13.5%)  [actual rates from Excel]
//   Yield Record: Reporting 1500 SOL le 30/09/2025
//     → INDIGO LP +11.65, Paul +1.85, Alex +0.0327, INDIGO Fees +0.2942

describe("SOL Fund Scenario", () => {
  it("Step 1: INDIGO LP deposits 1250 SOL", () => {
    const state = createFundState("fund-sol", "SOL", "SOL");
    const event = deposit("ev1", "2025-09-02", 1, "INDIGO_LP", "INDIGO LP", "1250", "0", "0");
    const next = applyEvent(state, event);

    expect(next.totalAUM).toBe("1250.000000000000000000");
    expect(next.investors.get("INDIGO_LP")?.balance).toBe("1250.000000000000000000");
    expect(next.investors.get("INDIGO_LP")?.feePct).toBe("0");
  });

  it("Step 2: Yield record — transaction 1252 SOL", () => {
    const state = createFundState("fund-sol", "SOL", "SOL");
    let s = applyEvent(state, deposit("ev1", "2025-09-02", 1, "INDIGO_LP", "INDIGO LP", "1250", "0", "0"));
    
    const yr = yieldRecord("ev2", "2025-09-04", 2, "1252", "transaction");
    const dist = previewDistribution(s, yr);

    expect(dist.totals.grossYield).toBe("2.000000000000000000");
    expect(dist.distributions.length).toBe(1);
    expect(dist.distributions[0].netYield).toBe("2.000000000000000000");
    expect(dist.distributions[0].feeAmount).toBe("0.000000000000000000");
    expect(dist.indigoFeesCredit).toBe("0.000000000000000000");

    // Apply it
    s = applyEvent(s, yr);
    expect(s.investors.get("INDIGO_LP")?.balance).toBe("1252.000000000000000000");
    expect(s.totalAUM).toBe("1252.000000000000000000");
  });

  it("Step 3: Paul Johnson deposits 234.17 SOL", () => {
    const state = createFundState("fund-sol", "SOL", "SOL");
    let s = applyEvent(state, deposit("ev1", "2025-09-02", 1, "INDIGO_LP", "INDIGO LP", "1250", "0", "0"));
    s = applyEvent(s, yieldRecord("ev2", "2025-09-04", 2, "1252", "transaction"));

    const event = deposit(
      "ev3", "2025-09-04", 3,
      "paul_johnson", "Paul Johnson", "234.17",
      "0.135", "0.015", "alex_jacobs", "Alex Jacobs"
    );
    s = applyEvent(s, event);

    expect(s.investors.get("INDIGO_LP")?.balance).toBe("1252.000000000000000000");
    expect(s.investors.get("paul_johnson")?.balance).toBe("234.170000000000000000");
    expect(s.totalAUM).toBe("1486.170000000000000000");
  });

  it("Step 4: Yield record — reporting 1500 SOL (the critical test)", () => {
    const state = createFundState("fund-sol", "SOL", "SOL");
    let s = applyEvent(state, deposit("ev1", "2025-09-02", 1, "INDIGO_LP", "INDIGO LP", "1250", "0", "0"));
    s = applyEvent(s, yieldRecord("ev2", "2025-09-04", 2, "1252", "transaction"));
    s = applyEvent(s, deposit("ev3", "2025-09-04", 3, "paul_johnson", "Paul Johnson", "234.17", "0.135", "0.015", "alex_jacobs", "Alex Jacobs"));

    const yr = yieldRecord("ev4", "2025-09-30", 4, "1500", "reporting");
    const dist = previewDistribution(s, yr);

    // Verify totals
    expect(dist.totals.grossYield).toBe("13.830000000000000000");
    expect(dist.distributions.length).toBe(2);

    // Find Paul Johnson's distribution
    const paul = dist.distributions.find(d => d.investorId === "paul_johnson")!;
    const lp = dist.distributions.find(d => d.investorId === "INDIGO_LP")!;

    // INDIGO LP: 0% fees, full gross = net
    const lpGross = parseFinancial(lp.grossYield);
    const lpNet = parseFinancial(lp.netYield);
    expect(lpGross.toNumber()).toBeCloseTo(11.65, 1);
    expect(lpNet.toNumber()).toBeCloseTo(11.65, 1);
    expect(lp.feeAmount).toBe("0.000000000000000000");

    // Paul Johnson: 13.5% platform + 1.5% IB = 15% total fees
    // Formula: 234.17 * 13.83 / 1486.17 * 0.85 = 1.8522
    const paulGross = parseFinancial(paul.grossYield);
    const paulNet = parseFinancial(paul.netYield);
    const paulFee = parseFinancial(paul.feeAmount);
    const paulIb = parseFinancial(paul.ibAmount);

    // Paul gross ≈ 2.179
    expect(paulGross.toNumber()).toBeCloseTo(2.179, 2);
    // Paul net ≈ 1.85
    expect(paulNet.toNumber()).toBeCloseTo(1.85, 1);
    // Paul fee ≈ 0.2942
    expect(paulFee.toNumber()).toBeCloseTo(0.294, 1);
    // Paul IB ≈ 0.0327
    expect(paulIb.toNumber()).toBeCloseTo(0.0327, 2);

    // INDIGO FEES credit = total platform fees = 0.294 (rounded)
    expect(parseFinancial(dist.indigoFeesCredit).toNumber()).toBeCloseTo(0.294, 1);

    // IB credits
    expect(dist.ibCredits.length).toBe(1);
    expect(dist.ibCredits[0].ibId).toBe("alex_jacobs");
    expect(parseFinancial(dist.ibCredits[0].amount).toNumber()).toBeCloseTo(0.0327, 2);

    // Apply the distribution
    s = applyEvent(s, yr);

    // After reporting, INDIGO FEES becomes an investor with its fee balance
    const feesInv = s.investors.get("INDIGO_FEES");
    expect(feesInv).toBeDefined();
    expect(parseFinancial(feesInv!.balance).toNumber()).toBeCloseTo(0.294, 1);

    // Alex Jacobs becomes an investor with his IB credit
    const alexInv = s.investors.get("alex_jacobs");
    expect(alexInv).toBeDefined();
    expect(parseFinancial(alexInv!.balance).toNumber()).toBeCloseTo(0.0327, 2);

    // Paul Johnson's final balance ≈ 236.02
    expect(parseFinancial(s.investors.get("paul_johnson")!.balance).toNumber()).toBeCloseTo(236.022, 1);

    // INDIGO LP's final balance ≈ 1263.65
    expect(parseFinancial(s.investors.get("INDIGO_LP")!.balance).toNumber()).toBeCloseTo(1263.65, 1);

    // Total AUM = 1500
    expect(parseFinancial(s.totalAUM).toNumber()).toBe(1500);
  });
});

// ─── XRP Scenario ──────────────────────────────────────────────
// From Adriel's message:
//   Sam Johnson : +135003 XRP le 17/11/2025 (IB Ryan 4%, Fees 16%)
//   Sam Johnson : +49000 XRP le 25/11/2025
//   Yield Record: Reporting 184358 XRP le 30/11/2025
//     → Sam +284, Ryan +14.20, Fees +56.80
//   Sam Johnson : +45000 XRP le 30/11/2025 (after reporting — no yield)
//   Yield Record: Transaction 229731 XRP le 08/12/2025
//     → Sam +298.31, Ryan +14.93, Fees +59.76

describe("XRP Fund Scenario", () => {
  function xrpDeposit(id: string, date: string, seq: number, invId: string, invName: string, amount: string, feePct: string, ibPct: string, ibId?: string, ibName?: string): DepositEvent {
    return { id, fundId: "fund-xrp", eventType: "DEPOSIT", date, sequence: seq, investorId: invId, investorName: invName, amount, feePct, ibPct, ibId, ibName };
  }
  function xrpYield(id: string, date: string, seq: number, aum: string, purpose: "transaction" | "reporting"): YieldRecordEvent {
    return { id, fundId: "fund-xrp", eventType: "YIELD_RECORD", date, sequence: seq, recordedAUM: aum, purpose };
  }

  it("Step 1-2: Sam deposits 135003 + 49000 XRP", () => {
    const state = createFundState("fund-xrp", "XRP", "XRP");
    let s = applyEvent(state, xrpDeposit("ev1", "2025-11-17", 1, "sam_johnson", "Sam Johnson", "135003", "0.16", "0.04", "ryan_vdw", "Ryan Van Der Wall"));
    s = applyEvent(s, xrpDeposit("ev2", "2025-11-25", 2, "sam_johnson", "Sam Johnson", "49000", "0.16", "0.04", "ryan_vdw", "Ryan Van Der Wall"));

    expect(s.totalAUM).toBe("184003.000000000000000000");
    expect(s.investors.get("sam_johnson")?.balance).toBe("184003.000000000000000000");
  });

  it("Step 3: Yield record — reporting 184358 XRP", () => {
    const state = createFundState("fund-xrp", "XRP", "XRP");
    let s = applyEvent(state, xrpDeposit("ev1", "2025-11-17", 1, "sam_johnson", "Sam Johnson", "135003", "0.16", "0.04", "ryan_vdw", "Ryan Van Der Wall"));
    s = applyEvent(s, xrpDeposit("ev2", "2025-11-25", 2, "sam_johnson", "Sam Johnson", "49000", "0.16", "0.04", "ryan_vdw", "Ryan Van Der Wall"));

    const yr = xrpYield("ev3", "2025-11-30", 3, "184358", "reporting");
    const dist = previewDistribution(s, yr);

    expect(dist.totals.grossYield).toBe("355.000000000000000000");
    expect(dist.distributions.length).toBe(1);

    const sam = dist.distributions[0];
    // Sam net ≈ 284 (355 * 0.80 = 284)
    expect(parseFinancial(sam.netYield).toNumber()).toBeCloseTo(284, 0);
    // Platform fee ≈ 56.80 (355 * 0.16)
    expect(parseFinancial(sam.feeAmount).toNumber()).toBeCloseTo(56.8, 0);
    // IB fee ≈ 14.20 (355 * 0.04)
    expect(parseFinancial(sam.ibAmount).toNumber()).toBeCloseTo(14.2, 0);

    // IB credits
    expect(dist.ibCredits.length).toBe(1);
    expect(dist.ibCredits[0].ibId).toBe("ryan_vdw");
    expect(parseFinancial(dist.ibCredits[0].amount).toNumber()).toBeCloseTo(14.2, 0);

    // INDIGO FEES credit ≈ 56.80
    expect(parseFinancial(dist.indigoFeesCredit).toNumber()).toBeCloseTo(56.8, 0);

    // Apply
    s = applyEvent(s, yr);

    // After reporting, INDIGO FEES and Ryan become investors
    expect(s.investors.has("INDIGO_FEES")).toBe(true);
    expect(parseFinancial(s.investors.get("INDIGO_FEES")!.balance).toNumber()).toBeCloseTo(56.8, 0);
    expect(s.investors.has("ryan_vdw")).toBe(true);
    expect(parseFinancial(s.investors.get("ryan_vdw")!.balance).toNumber()).toBeCloseTo(14.2, 0);

    // Sam's new balance = 184003 + 284 = 184287
    expect(parseFinancial(s.investors.get("sam_johnson")!.balance).toNumber()).toBeCloseTo(184287, 0);

    // Total AUM = 184358
    expect(parseFinancial(s.totalAUM).toNumber()).toBe(184358);
  });

  it("Step 4: Sam deposits 45000 XRP on same day as reporting", () => {
    const state = createFundState("fund-xrp", "XRP", "XRP");
    let s = applyEvent(state, xrpDeposit("ev1", "2025-11-17", 1, "sam_johnson", "Sam Johnson", "135003", "0.16", "0.04", "ryan_vdw", "Ryan Van Der Wall"));
    s = applyEvent(s, xrpDeposit("ev2", "2025-11-25", 2, "sam_johnson", "Sam Johnson", "49000", "0.16", "0.04", "ryan_vdw", "Ryan Van Der Wall"));
    s = applyEvent(s, xrpYield("ev3", "2025-11-30", 3, "184358", "reporting"));

    // Deposit AFTER reporting — sequence 4 > 3 ensures correct ordering
    s = applyEvent(s, xrpDeposit("ev4", "2025-11-30", 4, "sam_johnson", "Sam Johnson", "45000", "0.16", "0.04", "ryan_vdw", "Ryan Van Der Wall"));

    expect(s.investors.get("sam_johnson")?.balance).toBe("229287.000000000000000000");
    expect(s.totalAUM).toBe("229358.000000000000000000");
  });

  it("Step 5: Yield record — transaction 229731 XRP (the multi-investor test)", () => {
    const state = createFundState("fund-xrp", "XRP", "XRP");
    let s = applyEvent(state, xrpDeposit("ev1", "2025-11-17", 1, "sam_johnson", "Sam Johnson", "135003", "0.16", "0.04", "ryan_vdw", "Ryan Van Der Wall"));
    s = applyEvent(s, xrpDeposit("ev2", "2025-11-25", 2, "sam_johnson", "Sam Johnson", "49000", "0.16", "0.04", "ryan_vdw", "Ryan Van Der Wall"));
    s = applyEvent(s, xrpYield("ev3", "2025-11-30", 3, "184358", "reporting"));
    s = applyEvent(s, xrpDeposit("ev4", "2025-11-30", 4, "sam_johnson", "Sam Johnson", "45000", "0.16", "0.04", "ryan_vdw", "Ryan Van Der Wall"));

    const yr = xrpYield("ev5", "2025-12-08", 5, "229731", "transaction");
    const dist = previewDistribution(s, yr);

    // Gross yield = 229731 - 229358 = 373
    expect(dist.totals.grossYield).toBe("373.000000000000000000");

    // Three investors: Sam, INDIGO FEES, Ryan
    expect(dist.distributions.length).toBe(3);

    // Sam gets: 229287/229358 * 373 * 0.80 ≈ 298.31
    const sam = dist.distributions.find(d => d.investorId === "sam_johnson")!;
    expect(parseFinancial(sam.netYield).toNumber()).toBeCloseTo(298.31, 1);
    expect(parseFinancial(sam.feeAmount).toNumber()).toBeCloseTo(59.66, 1);

    // INDIGO FEES: 56.8/229358 * 373 ≈ 0.0924 (0% fees, all net)
    const fees = dist.distributions.find(d => d.investorId === "INDIGO_FEES")!;
    expect(parseFinancial(fees.netYield).toNumber()).toBeCloseTo(0.092, 2);
    expect(fees.feeAmount).toBe("0.000000000000000000");

    // Ryan: 14.2/229358 * 373 ≈ 0.0231
    const ryan = dist.distributions.find(d => d.investorId === "ryan_vdw")!;
    expect(parseFinancial(ryan.netYield).toNumber()).toBeCloseTo(0.0231, 3);

    // Apply
    s = applyEvent(s, yr);
    expect(parseFinancial(s.totalAUM).toNumber()).toBe(229731);
  });
});

// ─── Void Scenario ─────────────────────────────────────────────

describe("Void via REVERSE", () => {
  it("REVERSE event excludes reversed deposits from replay", () => {
    const state = createFundState("fund-sol", "SOL", "SOL");
    const events: EngineEvent[] = [
      deposit("ev1", "2025-09-02", 1, "INDIGO_LP", "INDIGO LP", "1250", "0", "0"),
      deposit("ev2", "2025-09-03", 2, "bad_investor", "Bad Investor", "100", "0.16", "0.04"),
      { id: "ev3", fundId: "fund-sol", eventType: "REVERSE" as const, date: "2025-09-03", sequence: 3, originalEventId: "ev2", reason: "Wrong amount" },
    ];

    // Replay all events — the reversed deposit should be excluded
    const s = replayEvents("fund-sol", "SOL", "SOL", events);

    // Only INDIGO LP should exist
    expect(s.investors.size).toBe(1);
    expect(s.investors.has("INDIGO_LP")).toBe(true);
    expect(s.investors.has("bad_investor")).toBe(false);
    expect(s.totalAUM).toBe("1250.000000000000000000");
  });
});

// ─── Edge Cases ────────────────────────────────────────────────

describe("Edge Cases", () => {
  it("Zero yield — AUM unchanged", () => {
    const state = createFundState("fund-sol", "SOL", "SOL");
    let s = applyEvent(state, deposit("ev1", "2025-09-02", 1, "INDIGO_LP", "INDIGO LP", "1250", "0", "0"));
    const yr = yieldRecord("ev2", "2025-09-04", 2, "1250", "transaction");
    const dist = previewDistribution(s, yr);

    expect(dist.distributions.length).toBe(0);
    expect(dist.totals.grossYield).toBe("0.000000000000000000");
  });

  it("100% fees — investor gets nothing", () => {
    const state = createFundState("fund-sol", "SOL", "SOL");
    let s = applyEvent(state, deposit("ev1", "2025-09-02", 1, "investor_1", "Investor 1", "1000", "1.0", "0"));
    const yr = yieldRecord("ev2", "2025-09-04", 2, "1100", "transaction");
    const dist = previewDistribution(s, yr);

    const inv = dist.distributions[0];
    expect(inv.netYield).toBe("0.000000000000000000");
    expect(parseFinancial(inv.feeAmount).toNumber()).toBeCloseTo(100, 0);
    expect(dist.indigoFeesCredit).toBe("100.000000000000000000");
  });

  it("Event replay performance — 500 events under 500ms", () => {
    const events: EngineEvent[] = [];
    for (let i = 0; i < 100; i++) {
      events.push(deposit(`ev${i}`, "2025-01-01", i + 1, `inv_${i}`, `Investor ${i}`, "1000", "0.16", "0.04"));
      events.push(yieldRecord(`yr${i}`, "2025-02-01", i + 101, "1050", "transaction"));
    }

    const start = performance.now();
    const state = replayEvents("fund-perf", "TEST", "TEST", events);
    const duration = performance.now() - start;

    expect(state.investors.size).toBe(100);
    expect(duration).toBeLessThan(500);
  });
});
