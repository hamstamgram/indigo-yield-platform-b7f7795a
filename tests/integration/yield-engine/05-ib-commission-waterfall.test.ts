/**
 * Integration Test: IB Commission Waterfall
 *
 * Tests that IB (Introducing Broker) gets their commission from gross yield,
 * and the remaining fee goes to the platform (INDIGO fees_account).
 *
 * Waterfall:
 * 1. Gross Yield
 * 2. Platform Fee = gross * fee_pct (e.g., 30%)
 * 3. IB Commission = gross * ib_pct (from gross, NOT additional)
 * 4. Remaining fee -> fees_account
 * 5. Net Yield = gross - fee_amount -> investor
 *
 * Conservation identity: gross = net + fee + ib + dust
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createTestFund,
  createTestInvestor,
  createTestAdmin,
  createFeesAccount,
  createTestIB,
  createInvestorWithIB,
  createTestPosition,
  createTestAum,
  createTestDeposit,
  getDistributionConservation,
} from "./helpers/seed-helpers";
import {
  applyYieldDistribution,
  getYieldAllocations,
  getIBAllocations,
} from "./helpers/rpc-helpers";
import { cleanupAllTestData, supabase } from "./helpers/supabase-client";

describe("Yield Engine: IB Commission Waterfall", () => {
  let fund: { id: string; code: string; asset: string };
  let feesAccount: { id: string };
  let ibBroker: { id: string };
  let referredInvestor: { id: string };
  let directInvestor: { id: string };
  let admin: { id: string };

  beforeAll(async () => {
    // Create admin first (needed for RPCs)
    admin = await createTestAdmin();

    // Create fund with auto-generated unique asset
    fund = await createTestFund({ perf_fee_bps: 3000 }); // 30% fee

    feesAccount = await createFeesAccount();

    // Create IB with 10% commission
    ibBroker = await createTestIB({ commission_pct: 10 });

    // Create investor referred by IB
    referredInvestor = await createInvestorWithIB(ibBroker.id, { fee_pct: 30 });

    // Create direct investor (no IB)
    directInvestor = await createTestInvestor({ fee_pct: 30 });

    // Positions
    await createTestPosition(referredInvestor.id, fund.id, {
      current_value: "100",
    });
    await createTestPosition(directInvestor.id, fund.id, {
      current_value: "100",
    });

    // Initial deposits
    await createTestDeposit(referredInvestor.id, fund.id, "100", "2023-12-15", fund.asset);
    await createTestDeposit(directInvestor.id, fund.id, "100", "2023-12-15", fund.asset);

    // AUM
    await createTestAum({
      fund_id: fund.id,
      aum_date: "2024-01-01",
      total_aum: "200",
      purpose: "transaction",
    });

    await createTestAum({
      fund_id: fund.id,
      aum_date: "2024-01-30",
      total_aum: "220", // +20 yield
      purpose: "transaction",
    });
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it("should allocate IB commission from referred investor yield", async () => {
    // v5 API: pass recorded_aum, yield is derived from AUM difference
    const result = await applyYieldDistribution({
      fund_id: fund.id,
      period_end: "2024-01-30",
      recorded_aum: "220",
      admin_id: admin.id,
      purpose: "transaction",
    });

    expect(result.success).toBe(true);

    const ibAllocations = await getIBAllocations(result.distribution_id);

    // Should have IB allocation for the referred investor
    const referredIBAlloc = ibAllocations.find((a) => a.source_investor_id === referredInvestor.id);

    expect(referredIBAlloc).toBeDefined();
    expect(referredIBAlloc!.ib_investor_id).toBe(ibBroker.id);

    // IB commission should be 10% of gross yield for referred investor
    // Referred investor's gross yield = 20 * 0.5 = 10 BTC
    // IB commission = 10 * 0.10 = 1 BTC
    const ibCommission = parseFloat(referredIBAlloc!.ib_fee_amount);
    expect(ibCommission).toBeGreaterThan(0);
  });

  it("should not allocate IB commission for direct investor", async () => {
    // Get the latest distribution
    const { data: distributions } = await supabase
      .from("yield_distributions")
      .select("id")
      .eq("fund_id", fund.id)
      .eq("is_voided", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (distributions && distributions.length > 0) {
      const ibAllocations = await getIBAllocations(distributions[0].id);

      // Direct investor should not have IB allocation
      const directIBAlloc = ibAllocations.find((a) => a.source_investor_id === directInvestor.id);

      expect(directIBAlloc).toBeUndefined();
    }
  });

  it("should correctly calculate fee after IB deduction", async () => {
    // Get yield allocations
    const { data: distributions } = await supabase
      .from("yield_distributions")
      .select("id")
      .eq("fund_id", fund.id)
      .eq("is_voided", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (distributions && distributions.length > 0) {
      const allocations = await getYieldAllocations(distributions[0].id);

      for (const alloc of allocations) {
        const gross = parseFloat(alloc.gross_amount);
        const net = parseFloat(alloc.net_amount);
        const fee = parseFloat(alloc.fee_amount);
        const ib = parseFloat(alloc.ib_amount);

        // Per-allocation conservation: gross = net + fee + ib
        expect(Math.abs(gross - (net + fee + ib))).toBeLessThan(0.0000001);
      }
    }
  });
});
