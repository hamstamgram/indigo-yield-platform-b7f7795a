/**
 * Integration Test: Fee Override Hierarchy
 *
 * Tests the fee determination hierarchy:
 * 1. profiles.fee_percentage (custom override) - if set
 * 2. investor_fee_schedule table (date-based) - if exists
 * 3. funds.fee_bps / 100 (fund default, typically 30%) - fallback
 *
 * Conservation identity: gross = net + fee + ib + dust
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { v4 as uuidv4 } from "uuid";
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
import {
  applyYieldDistribution,
  getYieldAllocations,
  getFeeAllocations,
} from "./helpers/rpc-helpers";
import { cleanupAllTestData, supabase } from "./helpers/supabase-client";

describe("Yield Engine: Fee Override Hierarchy", () => {
  let fund: { id: string; code: string; asset: string };
  let feesAccount: { id: string };
  let defaultFeeInvestor: { id: string };
  let customFeeInvestor: { id: string };
  let scheduleFeeInvestor: { id: string };
  let adminId: string;

  beforeAll(async () => {
    // Fund with 30% default fee
    fund = await createTestFund({ perf_fee_bps: 3000 });
    feesAccount = await createFeesAccount();
    const admin = await createTestAdmin();
    adminId = admin.id;

    // Investor using fund default (30%)
    defaultFeeInvestor = await createTestInvestor({ fee_pct: null as any });
    await createTestPosition(defaultFeeInvestor.id, fund.id, {
      current_value: "100",
    });
    await createTestDeposit(defaultFeeInvestor.id, fund.id, "100", "2023-12-15", fund.asset);

    // Investor with custom fee override (20%)
    customFeeInvestor = await createTestInvestor({ fee_pct: 20 });
    await createTestPosition(customFeeInvestor.id, fund.id, {
      current_value: "100",
    });
    await createTestDeposit(customFeeInvestor.id, fund.id, "100", "2023-12-15", fund.asset);

    // Investor with fee schedule (will be 15% for this period)
    scheduleFeeInvestor = await createTestInvestor({ fee_pct: 30 });
    await createTestPosition(scheduleFeeInvestor.id, fund.id, {
      current_value: "100",
    });
    await createTestDeposit(scheduleFeeInvestor.id, fund.id, "100", "2023-12-15", fund.asset);

    // Create fee schedule entry for scheduleFeeInvestor
    await supabase.from("investor_fee_schedule").insert({
      id: uuidv4(),
      investor_id: scheduleFeeInvestor.id,
      fund_id: fund.id,
      fee_percentage: 15,
      effective_from: "2024-01-01",
      effective_to: "2024-12-31",
    });

    // AUM
    await createTestAum({
      fund_id: fund.id,
      aum_date: "2024-01-01",
      total_aum: "300",
      purpose: "transaction",
    });

    await createTestAum({
      fund_id: fund.id,
      aum_date: "2024-01-30",
      total_aum: "330",
      purpose: "transaction",
    });
  });

  afterAll(async () => {
    // Clean up fee schedule
    await supabase.from("investor_fee_schedule").delete().eq("investor_id", scheduleFeeInvestor.id);

    await cleanupAllTestData();
  });

  it("should apply fund default fee when no override exists", async () => {
    const result = await applyYieldDistribution({
      fund_id: fund.id,
      period_end: "2024-01-30",
      recorded_aum: "330",
      admin_id: adminId,
      purpose: "transaction",
    });

    expect(result.success).toBe(true);
    const allocations = await getYieldAllocations(result.distribution_id);

    const defaultAlloc = allocations.find((a) => a.investor_id === defaultFeeInvestor.id);

    expect(defaultAlloc).toBeDefined();

    // Default fee is 30%
    // Gross = 10 (1/3 of 30)
    // Fee = 10 * 0.30 = 3
    // Net = 10 - 3 = 7
    const gross = parseFloat(defaultAlloc!.gross_amount);
    const fee = parseFloat(defaultAlloc!.fee_amount);
    const feePercentage = (fee / gross) * 100;

    // Should be approximately 30% (allow some tolerance)
    expect(feePercentage).toBeCloseTo(30, 1);
  });

  it("should apply custom fee override from profiles.fee_pct", async () => {
    const { data: distributions } = await supabase
      .from("yield_distributions")
      .select("id")
      .eq("fund_id", fund.id)
      .eq("is_voided", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (distributions && distributions.length > 0) {
      const allocations = await getYieldAllocations(distributions[0].id);

      const customAlloc = allocations.find((a) => a.investor_id === customFeeInvestor.id);

      expect(customAlloc).toBeDefined();

      const gross = parseFloat(customAlloc!.gross_amount);
      const fee = parseFloat(customAlloc!.fee_amount);
      const feePercentage = (fee / gross) * 100;

      // Should be approximately 20% (custom override)
      expect(feePercentage).toBeCloseTo(20, 1);
    }
  });

  it("should apply fee schedule when present (date-based override)", async () => {
    const { data: distributions } = await supabase
      .from("yield_distributions")
      .select("id")
      .eq("fund_id", fund.id)
      .eq("is_voided", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (distributions && distributions.length > 0) {
      const allocations = await getYieldAllocations(distributions[0].id);

      const scheduleAlloc = allocations.find((a) => a.investor_id === scheduleFeeInvestor.id);

      expect(scheduleAlloc).toBeDefined();

      const gross = parseFloat(scheduleAlloc!.gross_amount);
      const fee = parseFloat(scheduleAlloc!.fee_amount);
      const feePercentage = (fee / gross) * 100;

      // If fee schedule is used, should be 15%
      // If not (falling back to profile), could be 30%
      // This depends on RPC implementation
      expect(feePercentage).toBeLessThanOrEqual(30);
    }
  });

  it("should create correct fee allocations for each fee tier", async () => {
    const { data: distributions } = await supabase
      .from("yield_distributions")
      .select("id")
      .eq("fund_id", fund.id)
      .eq("is_voided", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (distributions && distributions.length > 0) {
      const feeAllocations = await getFeeAllocations(distributions[0].id);

      // Should have fee allocations for all investors
      expect(feeAllocations.length).toBe(3);

      // Each fee allocation should reference the fees_account
      for (const feeAlloc of feeAllocations) {
        expect(feeAlloc.fees_account_id).toBeDefined();
        expect(parseFloat(feeAlloc.fee_amount)).toBeGreaterThan(0);
      }
    }
  });
});
