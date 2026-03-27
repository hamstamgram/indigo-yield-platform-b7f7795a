/**
 * Test 14: Stress -- Concurrent Yield Distribution + 20 Withdrawals
 *
 * Fires 1 yield distribution and 20 concurrent withdrawal RPCs against
 * the same fund to verify that pg_advisory_xact_lock queues them
 * without deadlocking or corrupting the ledger.
 *
 * This is a post-launch hardening test. The existing 2-way concurrency
 * tests (12, 13) validate serialization logic; this test validates
 * advisory lock queue depth and connection pool behavior under contention.
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
  createTestDeposit,
} from "./helpers/seed-helpers";
import {
  applyYieldDistribution,
  applyTransactionWithCrystallization,
  getInvestorPosition,
} from "./helpers/rpc-helpers";

const INVESTOR_COUNT = 20;
const POSITION_SIZE = "10"; // Each investor has 10 units
const WITHDRAWAL_AMOUNT = "3"; // Each withdraws 3 units (well within balance)

describe("Stress: Yield Distribution + 20 Concurrent Withdrawals", () => {
  let fund: { id: string; code: string; asset: string };
  let admin: { id: string };
  let investors: Array<{ id: string }> = [];

  beforeAll(async () => {
    fund = await createTestFund();
    admin = await createTestAdmin();
    await createFeesAccount();

    // Create 20 investors, each with a 10-unit position and matching deposit
    for (let i = 0; i < INVESTOR_COUNT; i++) {
      const investor = await createTestInvestor({ fee_pct: 30 });
      await createTestPosition(investor.id, fund.id, {
        current_value: POSITION_SIZE,
      });
      await createTestDeposit(
        investor.id,
        fund.id,
        POSITION_SIZE,
        "2025-01-15",
        fund.asset
      );
      investors.push(investor);
    }

    // Total AUM = 20 * 10 = 200
    const totalAum = INVESTOR_COUNT * parseFloat(POSITION_SIZE);
    await createTestAum({
      fund_id: fund.id,
      aum_date: "2025-02-01",
      total_aum: String(totalAum),
    });

    // End-of-period AUM with yield (200 + 5 = 205)
    await createTestAum({
      fund_id: fund.id,
      aum_date: "2025-02-28",
      total_aum: String(totalAum + 5),
    });
  }, 120000);

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it("should process yield + 20 withdrawals without deadlock", async () => {
    const timestamp = Date.now();

    // Build 20 withdrawal promises (one per investor)
    const withdrawalPromises = investors.map((inv, i) =>
      applyTransactionWithCrystallization({
        investor_id: inv.id,
        fund_id: fund.id,
        tx_type: "WITHDRAWAL",
        amount: WITHDRAWAL_AMOUNT,
        tx_date: "2025-02-15",
        reference_id: `stress_w_${i}_${timestamp}`,
        admin_id: admin.id,
        new_total_aum: "197", // approximate; each withdrawal adjusts individually
        purpose: "transaction",
      })
    );

    // Build 1 yield distribution promise
    const yieldPromise = applyYieldDistribution({
      fund_id: fund.id,
      period_end: "2025-02-28",
      recorded_aum: "205",
      admin_id: admin.id,
      purpose: "transaction",
    });

    // Fire all 21 operations concurrently
    const results = await Promise.allSettled([
      yieldPromise,
      ...withdrawalPromises,
    ]);

    // ASSERTION 1: No deadlocks
    const deadlocks = results.filter(
      (r) =>
        r.status === "rejected" &&
        String(r.reason).toLowerCase().includes("deadlock")
    );
    expect(deadlocks).toHaveLength(0);

    // ASSERTION 2: At least some operations succeeded
    const successes = results.filter((r) => r.status === "fulfilled");
    expect(successes.length).toBeGreaterThanOrEqual(1);

    // Log results for diagnostics
    const fulfilled = results.filter((r) => r.status === "fulfilled").length;
    const rejected = results.filter((r) => r.status === "rejected").length;
    console.log(
      `Stress test results: ${fulfilled} fulfilled, ${rejected} rejected out of ${results.length} total`
    );

    // Log rejection reasons (non-deadlock failures are acceptable -- e.g. serialization retries)
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        const label = i === 0 ? "yield" : `withdrawal_${i - 1}`;
        console.log(`  ${label} rejected: ${String(r.reason).substring(0, 120)}`);
      }
    });
  }, 120000);

  it("should maintain zero ledger drift after concurrent operations", async () => {
    // Ledger reconciliation: position vs SUM(transactions) must match
    const { data: recon } = await supabase
      .from("v_ledger_reconciliation")
      .select("*")
      .eq("fund_id", fund.id);

    expect(recon?.length || 0).toBe(0);
  });

  it("should leave no negative positions", async () => {
    for (const inv of investors) {
      const position = await getInvestorPosition(inv.id, fund.id);
      if (!position) continue;

      const value = parseFloat(position.current_value);
      expect(value).toBeGreaterThanOrEqual(-0.0000001);
    }
  });

  it("should preserve position-ledger consistency per investor", async () => {
    for (const inv of investors) {
      const position = await getInvestorPosition(inv.id, fund.id);
      if (!position) continue;

      // Sum non-voided transactions
      const { data: txs } = await supabase
        .from("transactions_v2")
        .select("amount")
        .eq("investor_id", inv.id)
        .eq("fund_id", fund.id)
        .eq("is_voided", false);

      const ledgerSum = (txs || []).reduce(
        (sum, tx) => sum + parseFloat(tx.amount),
        0
      );

      expect(
        Math.abs(parseFloat(position.current_value) - ledgerSum)
      ).toBeLessThan(0.0000001);
    }
  });
});
