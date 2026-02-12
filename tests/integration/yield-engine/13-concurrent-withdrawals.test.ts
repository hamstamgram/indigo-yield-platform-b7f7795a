/**
 * Test 13: Concurrent Withdrawal Requests (Same Investor)
 *
 * Verifies that two concurrent withdrawal attempts by the same investor
 * do not both succeed if the total exceeds available balance.
 * PostgreSQL serialization should prevent double-spending.
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
import { applyTransactionWithCrystallization, getInvestorPosition } from "./helpers/rpc-helpers";

describe("Concurrent Withdrawals (Same Investor)", () => {
  let fund: { id: string; code: string; asset: string };
  let admin: { id: string };
  let investor: { id: string };

  beforeAll(async () => {
    fund = await createTestFund();
    admin = await createTestAdmin();
    investor = await createTestInvestor({ fee_pct: 30 });
    await createFeesAccount();

    // Investor has 10 BTC
    await createTestPosition(investor.id, fund.id, { current_value: "10" });
    await createTestDeposit(investor.id, fund.id, "10", "2025-02-15", fund.asset);
    await createTestAum({
      fund_id: fund.id,
      aum_date: "2025-03-01",
      total_aum: "10",
    });
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it("should not allow concurrent withdrawals to exceed balance", async () => {
    const ref1 = `test_concurrent_w1_${Date.now()}`;
    const ref2 = `test_concurrent_w2_${Date.now()}`;

    // Both attempt to withdraw 8 BTC from a 10 BTC balance
    // Only one should succeed if balance checking is serialized
    const results = await Promise.allSettled([
      applyTransactionWithCrystallization({
        investor_id: investor.id,
        fund_id: fund.id,
        tx_type: "WITHDRAWAL",
        amount: "8",
        tx_date: "2025-03-15",
        reference_id: ref1,
        admin_id: admin.id,
        new_total_aum: "2",
        purpose: "transaction",
      }),
      applyTransactionWithCrystallization({
        investor_id: investor.id,
        fund_id: fund.id,
        tx_type: "WITHDRAWAL",
        amount: "8",
        tx_date: "2025-03-15",
        reference_id: ref2,
        admin_id: admin.id,
        new_total_aum: "2",
        purpose: "transaction",
      }),
    ]);

    // Check final position
    const position = await getInvestorPosition(investor.id, fund.id);

    // Position should never go negative
    if (position) {
      expect(parseFloat(position.current_value)).toBeGreaterThanOrEqual(-0.0000001);
    }

    // Verify ledger reconciliation
    const { data: recon } = await supabase
      .from("v_ledger_reconciliation")
      .select("*")
      .eq("fund_id", fund.id);

    expect(recon?.length || 0).toBe(0);
  });

  it("should preserve position-ledger consistency after concurrent withdrawals", async () => {
    const position = await getInvestorPosition(investor.id, fund.id);
    if (!position) return;

    // Sum non-voided transactions
    const { data: txSum } = await supabase
      .from("transactions_v2")
      .select("amount")
      .eq("investor_id", investor.id)
      .eq("fund_id", fund.id)
      .eq("is_voided", false);

    const ledgerSum = (txSum || []).reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

    // Position should equal ledger sum
    expect(Math.abs(parseFloat(position.current_value) - ledgerSum)).toBeLessThan(0.0000001);
  });
});
