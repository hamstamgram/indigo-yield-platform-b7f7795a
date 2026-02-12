/**
 * Integration Test: Mid-period Deposit (ADB)
 *
 * Tests that an investor depositing mid-period gets proportionally less ADB weight.
 * Example: Depositing on day 15 of 30 = 50% ADB weight for the new funds.
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
import {
  previewYieldDistribution,
  applyYieldDistribution,
  getYieldAllocations,
} from "./helpers/rpc-helpers";
import { cleanupAllTestData, supabase } from "./helpers/supabase-client";

describe("Yield Engine: Mid-period Deposit (ADB)", () => {
  let fund: { id: string; code: string; asset: string };
  let feesAccount: { id: string };
  let aliceInvestor: { id: string };
  let bobInvestor: { id: string };
  let admin: { id: string };

  beforeAll(async () => {
    // Create admin first (needed for RPCs)
    admin = await createTestAdmin();

    // Create fund with auto-generated unique asset
    fund = await createTestFund({ perf_fee_bps: 3000 });

    // Create fees account
    feesAccount = await createFeesAccount();

    // Create investors
    aliceInvestor = await createTestInvestor({ fee_pct: 30 });
    bobInvestor = await createTestInvestor({ fee_pct: 30 });

    // Scenario:
    // - 30-day period (2024-01-01 to 2024-01-30)
    // - Alice: 100 BTC for full 30 days (ADB = 100 * 30 = 3000)
    // - Bob: 50 BTC starting day 15 (ADB = 50 * 16 = 800)
    // - Total ADB = 3800
    // - Alice weight = 3000/3800 = 78.95%
    // - Bob weight = 800/3800 = 21.05%

    // Alice's position (full period)
    await createTestPosition(aliceInvestor.id, fund.id, {
      current_value: "100",
    });

    // Alice's initial deposit BEFORE period start (needed for ADB calculation)
    await createTestDeposit(aliceInvestor.id, fund.id, "100", "2023-12-01", fund.asset);

    // Bob's position (deposited mid-period, but position shows current value)
    await createTestPosition(bobInvestor.id, fund.id, {
      current_value: "50",
    });

    // Bob's mid-period deposit
    await createTestDeposit(bobInvestor.id, fund.id, "50", "2024-01-15", fund.asset);

    // AUM at period start (Alice only)
    await createTestAum({
      fund_id: fund.id,
      aum_date: "2024-01-01",
      total_aum: "100",
      purpose: "transaction",
    });

    // AUM at period end (includes yield)
    await createTestAum({
      fund_id: fund.id,
      aum_date: "2024-01-30",
      total_aum: "160", // 150 + 10 gross yield
      purpose: "transaction",
    });
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it("should calculate ADB weight proportionally for mid-period deposit", async () => {
    // v5 API: pass recorded_aum (current AUM), yield is derived from AUM difference
    // Previous AUM: 150 (Alice 100 + Bob 50), Current AUM: 160 => gross yield = 10
    const preview = await previewYieldDistribution({
      fund_id: fund.id,
      period_end: "2024-01-30",
      recorded_aum: "160", // Current AUM after yield
      purpose: "transaction",
    });

    // Verify preview success
    expect(preview.success).toBe(true);

    // Check allocations (v5 uses .gross/.net/.fee instead of .gross_amount)
    const aliceAlloc = preview.allocations.find((a: any) => a.investor_id === aliceInvestor.id);
    const bobAlloc = preview.allocations.find((a: any) => a.investor_id === bobInvestor.id);

    expect(aliceAlloc).toBeDefined();
    expect(bobAlloc).toBeDefined();

    // Alice should have higher gross allocation (full period = higher time-weighted balance)
    const aliceGross = parseFloat(aliceAlloc!.gross);
    const bobGross = parseFloat(bobAlloc!.gross);

    expect(aliceGross).toBeGreaterThan(bobGross);

    // v5 segmented yield: Alice had balance for full period, Bob only from day 15
    // Alice should get significantly more yield than Bob
    // With 100 opening balance for 31 days vs 50 for ~17 days
    const totalGross = aliceGross + bobGross;
    const aliceShare = aliceGross / totalGross;

    // Alice should get majority of yield (roughly 75%+)
    expect(aliceShare).toBeGreaterThan(0.6);
  });

  it("should apply distribution and maintain conservation identity", async () => {
    // v5 API: pass recorded_aum, yield is derived from AUM difference
    const result = await applyYieldDistribution({
      fund_id: fund.id,
      period_end: "2024-01-30",
      recorded_aum: "160",
      admin_id: admin.id,
      purpose: "transaction",
    });

    expect(result.distribution_id).toBeDefined();
    expect(result.success).toBe(true);

    // Verify conservation identity
    const conservation = await getDistributionConservation(result.distribution_id);

    expect(conservation.conservation_holds).toBe(true);

    // Verify: gross = net + fee + ib + dust
    const gross = parseFloat(conservation.gross_yield_amount);
    const net = parseFloat(conservation.total_net_amount);
    const fee = parseFloat(conservation.total_fee_amount);
    const ib = parseFloat(conservation.total_ib_amount);
    const dust = parseFloat(conservation.dust_amount);

    expect(Math.abs(gross - (net + fee + ib + dust))).toBeLessThan(0.0000001);
  });

  it("should create yield allocations for both investors", async () => {
    // Get the distribution we just created
    const { data: distributions } = await supabase
      .from("yield_distributions")
      .select("id")
      .eq("fund_id", fund.id)
      .eq("is_voided", false)
      .order("created_at", { ascending: false })
      .limit(1);

    expect(distributions).toHaveLength(1);
    const distId = distributions![0].id;

    const allocations = await getYieldAllocations(distId);

    expect(allocations.length).toBe(2);

    // Each allocation should have valid amounts
    for (const alloc of allocations) {
      const netAmount = parseFloat(alloc.net_amount);
      const feeAmount = parseFloat(alloc.fee_amount);
      const grossAmount = parseFloat(alloc.gross_amount);

      expect(netAmount).toBeGreaterThan(0);
      expect(feeAmount).toBeGreaterThanOrEqual(0);
      expect(grossAmount).toBeGreaterThan(0);

      // Allocation conservation: gross = net + fee + ib
      const ibAmount = parseFloat(alloc.ib_amount);
      expect(Math.abs(grossAmount - (netAmount + feeAmount + ibAmount))).toBeLessThan(0.0000001);
    }
  });
});
