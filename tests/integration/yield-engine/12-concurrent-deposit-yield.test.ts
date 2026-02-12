/**
 * Test 12: Concurrent Deposit During Yield Distribution
 *
 * Verifies that a deposit arriving while a yield distribution is in progress
 * does not corrupt positions or create inconsistent state.
 * The crystallization guard should serialize these operations.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { cleanupAllTestData, supabase } from "./helpers/supabase-client";
import {
  createTestFund,
  createTestInvestor,
  createTestPosition,
  createTestAum,
  createTestAdmin,
  createFeesAccount,
} from "./helpers/seed-helpers";
import {
  applyYieldDistribution,
  applyTransactionWithCrystallization,
  getInvestorPosition,
} from "./helpers/rpc-helpers";

describe("Concurrent Deposit During Yield Distribution", () => {
  let fund: { id: string; code: string };
  let admin: { id: string };
  let investor1: { id: string };
  let investor2: { id: string };

  beforeAll(async () => {
    fund = await createTestFund({ asset: "BTC" });
    admin = await createTestAdmin();
    investor1 = await createTestInvestor({ fee_pct: 30 });
    investor2 = await createTestInvestor({ fee_pct: 30 });
    await createFeesAccount();

    // Seed positions
    await createTestPosition(investor1.id, fund.id, { current_value: "5" });
    await createTestPosition(investor2.id, fund.id, { current_value: "5" });

    // Seed AUM
    await createTestAum({
      fund_id: fund.id,
      aum_date: "2025-02-01",
      total_aum: "10",
    });
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it("should handle deposit + yield distribution concurrently without corruption", async () => {
    const depositRef = `test_concurrent_dep_${Date.now()}`;

    // Launch deposit and yield distribution concurrently
    const results = await Promise.allSettled([
      // Deposit 2 BTC for investor2
      applyTransactionWithCrystallization({
        investor_id: investor2.id,
        fund_id: fund.id,
        tx_type: "DEPOSIT",
        amount: "2",
        tx_date: "2025-02-15",
        reference_id: depositRef,
        admin_id: admin.id,
        new_total_aum: "12.5",
        purpose: "transaction",
      }),
      // Apply yield for the fund
      applyYieldDistribution({
        fund_id: fund.id,
        period_end: "2025-02-28",
        recorded_aum: "12.5",
        admin_id: admin.id,
        purpose: "transaction",
      }),
    ]);

    // At least one should succeed
    const successes = results.filter((r) => r.status === "fulfilled");
    expect(successes.length).toBeGreaterThanOrEqual(1);

    // Position integrity: check ledger reconciliation
    const { data: recon } = await supabase
      .from("v_ledger_reconciliation")
      .select("*")
      .eq("fund_id", fund.id);

    // Should have zero drift
    expect(recon?.length || 0).toBe(0);
  });

  it("should maintain position consistency after concurrent operations", async () => {
    // Verify both investor positions match their transaction sums
    for (const investorId of [investor1.id, investor2.id]) {
      const position = await getInvestorPosition(investorId, fund.id);
      if (!position) continue;

      // Get sum of non-voided transactions
      const { data: txSum } = await supabase
        .from("transactions_v2")
        .select("amount")
        .eq("investor_id", investorId)
        .eq("fund_id", fund.id)
        .eq("is_voided", false);

      const ledgerSum = (txSum || []).reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

      // Position should match ledger
      expect(Math.abs(parseFloat(position.current_value) - ledgerSum)).toBeLessThan(0.0000001);
    }
  });
});
