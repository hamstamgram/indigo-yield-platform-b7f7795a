/**
 * Integration Test: Multi-investor Split
 *
 * Tests that the sum of all investor yields equals the gross yield.
 * Verifies the distribution waterfall works correctly across multiple investors.
 *
 * Conservation identity: gross = net + fee + ib + dust
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createTestFund,
  createTestInvestor,
  createTestAdmin,
  createFeesAccount,
  createTestPosition,
  createTestAum,
  createTestDeposit,
  getDistributionConservation,
} from "./helpers/seed-helpers";
import { applyYieldDistribution, getYieldAllocations } from "./helpers/rpc-helpers";
import { cleanupAllTestData, supabase } from "./helpers/supabase-client";

describe("Yield Engine: Multi-investor Split", () => {
  let fund: { id: string; code: string; asset: string };
  let feesAccount: { id: string };
  let investors: Array<{ id: string; balance: string }>;
  let admin: { id: string };

  beforeAll(async () => {
    // Create admin first (needed for RPCs)
    admin = await createTestAdmin();

    // Create fund with auto-generated unique asset
    fund = await createTestFund({ perf_fee_bps: 3000 });

    feesAccount = await createFeesAccount();

    // Create 5 investors with different balances
    investors = [];
    const balances = ["100", "200", "50", "150", "300"];

    for (let i = 0; i < 5; i++) {
      const investor = await createTestInvestor({ fee_pct: 30 });
      await createTestPosition(investor.id, fund.id, {
        current_value: balances[i],
      });
      // Create initial deposit for each investor
      await createTestDeposit(investor.id, fund.id, balances[i], "2023-12-15", fund.asset);
      investors.push({ id: investor.id, balance: balances[i] });
    }

    // Total AUM = 100 + 200 + 50 + 150 + 300 = 800

    await createTestAum({
      fund_id: fund.id,
      aum_date: "2024-01-01",
      total_aum: "800",
      purpose: "transaction",
    });

    await createTestAum({
      fund_id: fund.id,
      aum_date: "2024-01-30",
      total_aum: "880", // 800 + 80 yield
      purpose: "transaction",
    });
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it("should split yield proportionally across all investors", async () => {
    const grossYield = 80;

    // v5 API: pass recorded_aum, yield is derived from AUM difference
    const result = await applyYieldDistribution({
      fund_id: fund.id,
      period_end: "2024-01-30",
      recorded_aum: "880",
      admin_id: admin.id,
      purpose: "transaction",
    });

    expect(result.success).toBe(true);
    expect(result.allocation_count).toBe(5);

    const allocations = await getYieldAllocations(result.distribution_id);

    expect(allocations.length).toBe(5);

    // Sum of gross amounts should equal gross yield
    const totalGross = allocations.reduce((sum, a) => sum + parseFloat(a.gross_amount), 0);
    expect(Math.abs(totalGross - grossYield)).toBeLessThan(0.0000001);

    // Each investor's allocation should be proportional to their balance
    const totalAum = 800;
    for (const investor of investors) {
      const alloc = allocations.find((a) => a.investor_id === investor.id);
      expect(alloc).toBeDefined();

      const expectedWeight = parseFloat(investor.balance) / totalAum;
      const expectedGross = grossYield * expectedWeight;
      const actualGross = parseFloat(alloc!.gross_amount);

      // Allow 1% tolerance for rounding
      expect(Math.abs(actualGross - expectedGross)).toBeLessThan(expectedGross * 0.01);
    }
  });

  it("should maintain conservation identity with multiple investors", async () => {
    // Get the distribution we created
    const { data: distributions } = await supabase
      .from("yield_distributions")
      .select("id")
      .eq("fund_id", fund.id)
      .eq("is_voided", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (distributions && distributions.length > 0) {
      const conservation = await getDistributionConservation(distributions[0].id);
      expect(conservation.conservation_holds).toBe(true);
    }
  });
});
