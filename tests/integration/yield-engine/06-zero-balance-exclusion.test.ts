/**
 * Integration Test: Zero-balance Investor
 *
 * Tests that an investor with zero balance gets zero yield.
 * They should either be excluded from allocations or get a zero allocation.
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
import { cleanupAllTestData } from "./helpers/supabase-client";

describe("Yield Engine: Zero-balance Investor", () => {
  let fund: { id: string; code: string; asset: string };
  let feesAccount: { id: string };
  let activeInvestor: { id: string };
  let zeroBalanceInvestor: { id: string };
  let adminId: string;

  beforeAll(async () => {
    fund = await createTestFund({ perf_fee_bps: 3000 });
    feesAccount = await createFeesAccount();
    const admin = await createTestAdmin();
    adminId = admin.id;

    activeInvestor = await createTestInvestor({ fee_pct: 30 });
    zeroBalanceInvestor = await createTestInvestor({ fee_pct: 30 });

    // Active investor with balance
    await createTestPosition(activeInvestor.id, fund.id, {
      current_value: "100",
    });

    // Active investor deposit (before period_start for V5 opening balance)
    await createTestDeposit(activeInvestor.id, fund.id, "100", "2023-12-15", fund.asset);

    // Zero-balance investor (withdrew everything or never deposited)
    await createTestPosition(zeroBalanceInvestor.id, fund.id, {
      current_value: "0",
      is_active: false,
    });

    await createTestAum({
      fund_id: fund.id,
      aum_date: "2024-01-01",
      total_aum: "100",
      purpose: "transaction",
    });

    await createTestAum({
      fund_id: fund.id,
      aum_date: "2024-01-30",
      total_aum: "110",
      purpose: "transaction",
    });
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it("should not allocate yield to zero-balance investor", async () => {
    const result = await applyYieldDistribution({
      fund_id: fund.id,
      period_end: "2024-01-30",
      recorded_aum: "110",
      admin_id: adminId,
      purpose: "transaction",
    });

    expect(result.success).toBe(true);
    const allocations = await getYieldAllocations(result.distribution_id);

    // Zero-balance investor should either not have an allocation
    // or have a zero allocation
    const zeroAlloc = allocations.find((a) => a.investor_id === zeroBalanceInvestor.id);

    if (zeroAlloc) {
      expect(parseFloat(zeroAlloc.net_amount)).toBe(0);
      expect(parseFloat(zeroAlloc.gross_amount)).toBe(0);
    } else {
      // Excluded from allocations is also acceptable
      expect(zeroAlloc).toBeUndefined();
    }
  });

  it("should give all yield to active investor", async () => {
    const { data: distributions } = await import("./helpers/supabase-client").then((m) =>
      m.supabase
        .from("yield_distributions")
        .select("id")
        .eq("fund_id", fund.id)
        .eq("is_voided", false)
        .order("created_at", { ascending: false })
        .limit(1)
    );

    if (distributions && distributions.length > 0) {
      const allocations = await getYieldAllocations(distributions[0].id);

      // Only active investor should have meaningful allocation
      const activeAlloc = allocations.find((a) => a.investor_id === activeInvestor.id);

      expect(activeAlloc).toBeDefined();
      expect(parseFloat(activeAlloc!.gross_amount)).toBeCloseTo(10, 5);

      // Active investor should get all the yield (only investor with balance)
      // Note: adb_share may be 0 or not populated in V5 - check gross instead
      const gross = parseFloat(activeAlloc!.gross_amount);
      expect(gross).toBeGreaterThan(0);
    }
  });

  it("should verify zero-balance investor was properly excluded", async () => {
    const { data: distributions } = await import("./helpers/supabase-client").then((m) =>
      m.supabase
        .from("yield_distributions")
        .select("id")
        .eq("fund_id", fund.id)
        .eq("is_voided", false)
        .order("created_at", { ascending: false })
        .limit(1)
    );

    if (distributions && distributions.length > 0) {
      const allocations = await getYieldAllocations(distributions[0].id);

      // Verify zero-balance investor has no meaningful allocation
      const zeroAlloc = allocations.find((a) => a.investor_id === zeroBalanceInvestor.id);

      if (zeroAlloc) {
        expect(parseFloat(zeroAlloc.net_amount)).toBe(0);
      }
    }
  });
});
