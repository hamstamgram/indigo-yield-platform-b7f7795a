/**
 * Integration Test: Mid-period Withdrawal (ADB)
 *
 * Tests that an investor withdrawing mid-period has their ADB weight
 * calculated based on the days they held funds before withdrawal.
 *
 * Conservation identity: gross = net + fee + ib + dust
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { v4 as uuidv4 } from "uuid";
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
import { cleanupAllTestData, supabase, registerTestTransaction } from "./helpers/supabase-client";

describe("Yield Engine: Mid-period Withdrawal (ADB)", () => {
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

    feesAccount = await createFeesAccount();
    aliceInvestor = await createTestInvestor({ fee_pct: 30 });
    bobInvestor = await createTestInvestor({ fee_pct: 30 });

    // Scenario:
    // - 30-day period (2024-01-01 to 2024-01-30)
    // - Alice: 100 BTC for full 30 days
    // - Bob: Started with 100 BTC, withdrew 50 BTC on day 10
    // - Bob's ADB = (100 * 10) + (50 * 20) = 1000 + 1000 = 2000
    // - Alice's ADB = 100 * 30 = 3000
    // - Total = 5000

    // Alice's position (full period)
    await createTestPosition(aliceInvestor.id, fund.id, {
      current_value: "100",
    });

    // Bob's position (after withdrawal)
    await createTestPosition(bobInvestor.id, fund.id, {
      current_value: "50",
    });

    // Alice's initial deposit
    await createTestDeposit(aliceInvestor.id, fund.id, "100", "2023-12-15", fund.asset);

    // Bob's initial deposit (before period_start for V5 opening balance)
    await createTestDeposit(bobInvestor.id, fund.id, "100", "2023-12-31", fund.asset);

    // Bob's mid-period withdrawal (use test RPC to bypass canonical guard)
    const withdrawalId = uuidv4();
    const { error: wdError } = await supabase.rpc("test_create_transaction", {
      p_id: withdrawalId,
      p_investor_id: bobInvestor.id,
      p_fund_id: fund.id,
      p_type: "WITHDRAWAL",
      p_asset: fund.asset,
      p_amount: -50,
      p_tx_date: "2024-01-10",
      p_reference_id: `test_withdrawal_bob_${uuidv4()}`,
    });
    if (wdError) throw new Error(`Failed to create withdrawal: ${wdError.message}`);
    registerTestTransaction(withdrawalId);

    // AUM records
    await createTestAum({
      fund_id: fund.id,
      aum_date: "2024-01-01",
      total_aum: "200",
      purpose: "transaction",
    });

    await createTestAum({
      fund_id: fund.id,
      aum_date: "2024-01-30",
      total_aum: "160", // 150 after withdrawal + 10 yield
      purpose: "transaction",
    });
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it("should calculate reduced ADB weight for investor who withdrew mid-period", async () => {
    // v5 API: pass recorded_aum, yield is derived from AUM difference
    const preview = await previewYieldDistribution({
      fund_id: fund.id,
      period_end: "2024-01-30",
      recorded_aum: "160",
      purpose: "transaction",
    });

    expect(preview.success).toBe(true);

    const aliceAlloc = preview.allocations.find((a) => a.investor_id === aliceInvestor.id);
    const bobAlloc = preview.allocations.find((a) => a.investor_id === bobInvestor.id);

    expect(aliceAlloc).toBeDefined();
    expect(bobAlloc).toBeDefined();

    const aliceGross = aliceAlloc!.gross;
    const bobGross = bobAlloc!.gross;

    // Alice should have higher gross (full balance for full period)
    // Bob's gross reflects partial balance after withdrawal
    expect(aliceGross).toBeGreaterThan(bobGross);
  });

  it("should maintain conservation identity after applying distribution", async () => {
    // v5 API: pass recorded_aum, yield is derived from AUM difference
    const result = await applyYieldDistribution({
      fund_id: fund.id,
      period_end: "2024-01-30",
      recorded_aum: "160",
      admin_id: admin.id,
      purpose: "transaction",
    });

    expect(result.success).toBe(true);
    expect(result.distribution_id).toBeDefined();

    const conservation = await getDistributionConservation(result.distribution_id);
    expect(conservation.conservation_holds).toBe(true);

    const gross = parseFloat(conservation.gross_yield_amount);
    const net = parseFloat(conservation.total_net_amount);
    const fee = parseFloat(conservation.total_fee_amount);
    const ib = parseFloat(conservation.total_ib_amount);
    const dust = parseFloat(conservation.dust_amount);

    expect(Math.abs(gross - (net + fee + ib + dust))).toBeLessThan(0.0000001);
  });
});
