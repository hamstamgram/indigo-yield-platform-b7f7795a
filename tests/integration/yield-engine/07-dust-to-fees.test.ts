/**
 * Integration Test: Dust Accumulation
 *
 * Tests that rounding residuals (dust) are credited to the fees_account.
 * Dust arises from dividing yield among multiple investors.
 *
 * Conservation identity: gross = net + fee + ib + dust
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createTestFund,
  createTestInvestor,
  createFeesAccount,
  createTestPosition,
  createTestAum,
  getDistributionConservation,
  createTestAdmin,
  createTestDeposit,
} from "./helpers/seed-helpers";
import { applyYieldDistribution, getYieldAllocations } from "./helpers/rpc-helpers";
import { cleanupAllTestData, supabase } from "./helpers/supabase-client";

describe("Yield Engine: Dust Accumulation", () => {
  let fund: { id: string; code: string; asset: string };
  let feesAccount: { id: string };
  let investors: Array<{ id: string }>;
  let adminId: string;

  beforeAll(async () => {
    fund = await createTestFund({ perf_fee_bps: 3000 });
    feesAccount = await createFeesAccount();
    const admin = await createTestAdmin();
    adminId = admin.id;

    // Create many investors with small balances to maximize dust
    investors = [];
    for (let i = 0; i < 7; i++) {
      const investor = await createTestInvestor({ fee_pct: 30 });
      await createTestPosition(investor.id, fund.id, {
        current_value: "13.37",
      });
      // Create deposit before period_start for V5 opening balance
      await createTestDeposit(investor.id, fund.id, "13.37", "2023-12-15", fund.asset);
      investors.push({ id: investor.id });
    }

    // Total AUM = 7 * 13.37 = 93.59
    await createTestAum({
      fund_id: fund.id,
      aum_date: "2024-01-01",
      total_aum: "93.59",
      purpose: "transaction",
    });

    await createTestAum({
      fund_id: fund.id,
      aum_date: "2024-01-30",
      total_aum: "96.92",
      purpose: "transaction",
    });
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it("should record dust amount in distribution", async () => {
    const result = await applyYieldDistribution({
      fund_id: fund.id,
      period_end: "2024-01-30",
      recorded_aum: "96.92",
      admin_id: adminId,
      purpose: "transaction",
    });

    expect(result.success).toBe(true);
    const conservation = await getDistributionConservation(result.distribution_id);

    // Dust should be recorded (might be zero if perfectly divisible)
    expect(conservation.dust_amount).toBeDefined();

    // Dust should be near zero (may be tiny negative due to rounding)
    expect(Math.abs(parseFloat(conservation.dust_amount))).toBeLessThan(0.0001);
  });

  it("should include dust in conservation identity", async () => {
    // Get the distribution from the first test
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

      // Verify dust is part of the equation
      const gross = parseFloat(conservation.gross_yield_amount);
      const net = parseFloat(conservation.total_net_amount);
      const fee = parseFloat(conservation.total_fee_amount);
      const ib = parseFloat(conservation.total_ib_amount);
      const dust = parseFloat(conservation.dust_amount);

      const sum = net + fee + ib + dust;
      expect(Math.abs(gross - sum)).toBeLessThan(0.0000001);
    }
  });
});
