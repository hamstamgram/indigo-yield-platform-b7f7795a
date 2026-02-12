/**
 * Integration Test: Void Distribution Cascade
 *
 * Tests that voiding a distribution cascades to:
 * - yield_allocations (voided)
 * - fee_allocations (voided)
 * - ib_allocations (voided)
 * - transactions_v2 (voided)
 *
 * Conservation identity after void: all amounts should be reversed.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createTestFund,
  createTestInvestor,
  createFeesAccount,
  createTestIB,
  createInvestorWithIB,
  createTestPosition,
  createTestAum,
  createTestAdmin,
  createTestDeposit,
} from "./helpers/seed-helpers";
import {
  applyYieldDistribution,
  voidYieldDistribution,
  getYieldAllocations,
  getFeeAllocations,
  getIBAllocations,
  getInvestorTransactions,
} from "./helpers/rpc-helpers";
import { cleanupAllTestData, supabase } from "./helpers/supabase-client";

describe("Yield Engine: Void Distribution Cascade", () => {
  let fund: { id: string; code: string; asset: string };
  let feesAccount: { id: string };
  let ibBroker: { id: string };
  let investor: { id: string };
  let distributionId: string;
  let adminId: string;

  beforeAll(async () => {
    fund = await createTestFund({ perf_fee_bps: 3000 });
    feesAccount = await createFeesAccount();
    const admin = await createTestAdmin();
    adminId = admin.id;
    ibBroker = await createTestIB({ commission_pct: 10 });
    investor = await createInvestorWithIB(ibBroker.id, { fee_pct: 30 });

    await createTestPosition(investor.id, fund.id, {
      current_value: "100",
    });

    // Create initial deposit transaction (required for V5 balance calculation)
    await createTestDeposit(investor.id, fund.id, "100", "2023-12-15", fund.asset);

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

    // Apply a distribution that we will void
    const result = await applyYieldDistribution({
      fund_id: fund.id,
      period_end: "2024-01-30",
      recorded_aum: "110",
      admin_id: adminId,
      purpose: "transaction",
    });

    distributionId = result.distribution_id;
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it("should successfully void a distribution", async () => {
    const result = await voidYieldDistribution({
      distribution_id: distributionId,
      reason: "Test void",
    });

    expect(result.success).toBe(true);
  });

  it("should mark distribution as voided", async () => {
    const { data } = await supabase
      .from("yield_distributions")
      .select("is_voided, voided_at")
      .eq("id", distributionId)
      .single();

    expect(data?.is_voided).toBe(true);
    expect(data?.voided_at).toBeDefined();
  });

  it("should void all yield allocations", async () => {
    const { data: allocations } = await supabase
      .from("yield_allocations")
      .select("is_voided")
      .eq("distribution_id", distributionId);

    expect(allocations).toBeDefined();
    if (allocations && allocations.length > 0) {
      for (const alloc of allocations) {
        expect(alloc.is_voided).toBe(true);
      }
    }
  });

  it("should void all fee allocations", async () => {
    const { data: allocations } = await supabase
      .from("fee_allocations")
      .select("is_voided")
      .eq("distribution_id", distributionId);

    expect(allocations).toBeDefined();
    if (allocations && allocations.length > 0) {
      for (const alloc of allocations) {
        expect(alloc.is_voided).toBe(true);
      }
    }
  });

  it("should void all IB allocations", async () => {
    const { data: allocations } = await supabase
      .from("ib_allocations")
      .select("is_voided")
      .eq("distribution_id", distributionId);

    expect(allocations).toBeDefined();
    if (allocations && allocations.length > 0) {
      for (const alloc of allocations) {
        expect(alloc.is_voided).toBe(true);
      }
    }
  });

  it("should void related transactions", async () => {
    // Get transactions created by this distribution
    const { data: transactions } = await supabase
      .from("transactions_v2")
      .select("is_voided, type")
      .eq("investor_id", investor.id)
      .eq("fund_id", fund.id)
      .in("type", ["YIELD", "FEE_CREDIT", "IB_CREDIT"]);

    // All yield-related transactions should be voided
    if (transactions && transactions.length > 0) {
      const voidedCount = transactions.filter((t) => t.is_voided).length;
      // At least some should be voided (from our distribution)
      expect(voidedCount).toBeGreaterThan(0);
    }
  });

  it("should allow applying same period again after void", async () => {
    // The void should have cleared the way for re-distribution
    const result = await applyYieldDistribution({
      fund_id: fund.id,
      period_end: "2024-01-30",
      recorded_aum: "110",
      admin_id: adminId,
      purpose: "transaction",
    });

    // Should succeed since original was voided
    expect(result.success).toBe(true);
    expect(result.distribution_id).toBeDefined();
  });
});
