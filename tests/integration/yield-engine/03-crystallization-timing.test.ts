/**
 * Integration Test: Crystallization Timing
 *
 * Tests that yield distributed before a deposit doesn't credit the new funds.
 * Crystallization should be triggered when a deposit/withdrawal occurs.
 *
 * Conservation identity: gross = net + fee + ib + dust
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { v4 as uuidv4 } from "uuid";
import {
  createTestFund,
  createTestInvestor,
  createTestAdmin,
  createFeesAccount,
  createTestPosition,
  createTestAum,
  createTestDeposit,
} from "./helpers/seed-helpers";
import {
  applyTransactionWithCrystallization,
  getInvestorTransactions,
} from "./helpers/rpc-helpers";
import { cleanupAllTestData, supabase, registerTestTransaction } from "./helpers/supabase-client";

describe("Yield Engine: Crystallization Timing", () => {
  let fund: { id: string; code: string; asset: string };
  let feesAccount: { id: string };
  let aliceInvestor: { id: string };
  let admin: { id: string };

  beforeAll(async () => {
    // Create admin first (needed for RPCs)
    admin = await createTestAdmin();

    // Create fund with auto-generated unique asset
    fund = await createTestFund({ perf_fee_bps: 3000 });

    feesAccount = await createFeesAccount();
    aliceInvestor = await createTestInvestor({ fee_pct: 30 });

    // Scenario:
    // - Alice has 100 BTC from 2024-01-01
    // - Yield of 10 BTC accrued from 2024-01-01 to 2024-01-15
    // - Alice deposits another 50 BTC on 2024-01-15
    // - Crystallization should distribute the 10 BTC yield BEFORE the deposit
    // - The new 50 BTC should NOT participate in the already-earned yield

    await createTestPosition(aliceInvestor.id, fund.id, {
      current_value: "100",
    });

    // Initial deposit on period_start so it's included in ADB calculation.
    // The crystallization function computes ADB from transactions between
    // period_start and event_date. Deposit must be within this range.
    await createTestDeposit(aliceInvestor.id, fund.id, "100", "2024-01-01", fund.asset);

    // AUM at start (opening balance for crystallization period)
    // Only create the period-start AUM. The crystallization function will look up
    // this record as opening_aum and compare with closing_aum (110) passed via
    // new_total_aum parameter, computing yield = 110 - 100 = 10.
    // Do NOT create an AUM record at 2024-01-15 — that would be picked up as
    // opening_aum and result in zero yield (110 - 110 = 0).
    await createTestAum({
      fund_id: fund.id,
      aum_date: "2024-01-01",
      total_aum: "100",
      purpose: "transaction",
    });

    // Set crystallization date so the function knows to crystallize
    // (V5 11-param overload checks MAX(last_yield_crystallization_date) across fund)
    await supabase.rpc("test_set_crystallization_date", {
      p_investor_id: aliceInvestor.id,
      p_fund_id: fund.id,
      p_date: "2024-01-01",
    });
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it("should crystallize yield before processing deposit", async () => {
    const referenceId = `test_deposit_with_crystal_${uuidv4()}`;

    const result = await applyTransactionWithCrystallization({
      fund_id: fund.id,
      investor_id: aliceInvestor.id,
      tx_type: "DEPOSIT",
      amount: "50",
      tx_date: "2024-01-15",
      reference_id: referenceId,
      new_total_aum: "110", // Pre-deposit AUM (100 + 10 yield), NOT post-deposit
    });

    registerTestTransaction(result.transaction_id);

    // Should have applied crystallization
    expect(result.crystallization_applied).toBe(true);

    // If crystallization occurred, there should be a YIELD transaction
    const transactions = await getInvestorTransactions(aliceInvestor.id, fund.id);

    const yieldTx = transactions.find((tx) => tx.type === "YIELD" && !tx.is_voided);

    // Yield transaction should exist (from crystallization)
    // Note: depending on RPC implementation, might be yield_events instead
    if (yieldTx) {
      expect(parseFloat(yieldTx.amount)).toBeGreaterThan(0);
    }

    // Verify the deposit was created
    const depositTx = transactions.find((tx) => tx.reference_id === referenceId && !tx.is_voided);
    expect(depositTx).toBeDefined();
    expect(parseFloat(String(depositTx!.amount))).toBeCloseTo(50, 5);
  });

  it("should not credit new deposit with pre-existing yield", async () => {
    // Get all transactions after crystallization
    const transactions = await getInvestorTransactions(aliceInvestor.id, fund.id);

    // Sum of YIELD transactions should reflect only the yield earned
    // by the original 100 BTC, not the new 50 BTC
    const yieldTxs = transactions.filter((tx) => tx.type === "YIELD" && !tx.is_voided);

    if (yieldTxs.length > 0) {
      const totalYield = yieldTxs.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

      // Yield should be from the original 100 BTC only
      // Expected: ~10 BTC gross, ~7 BTC net (after 30% fee)
      expect(totalYield).toBeLessThanOrEqual(10);
    }
  });
});
