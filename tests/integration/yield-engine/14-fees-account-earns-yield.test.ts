/**
 * Issue 1: V5 Fees Account Earns Yield on Accumulated Capital
 *
 * BEFORE: V5 `apply_segmented_yield_distribution_v5` had a CONTINUE skip
 *         that excluded fees_account from yield allocation entirely.
 *         fees_account only received FEE_CREDIT (platform fees from other investors).
 *
 * AFTER: fees_account participates in yield allocation with fee_pct=0.
 *        It earns YIELD on capital it has accumulated from previous FEE_CREDITs.
 *        It does NOT charge itself fees. It is NOT the dust recipient.
 *
 * Scenario: Two-month yield distribution
 *   Month 1 (November): 2 investors + fees_account (0 balance)
 *     - fees_account gets FEE_CREDIT from platform fees
 *     - fees_account now has capital
 *   Month 2 (December): Same 2 investors + fees_account (has capital)
 *     - fees_account should get a YIELD transaction on its capital
 *     - fees_account should NOT have fee_allocations row
 *     - Conservation identity must hold
 *
 * Requires: Local Supabase running with all migrations applied
 * Run: npm run test:integration:yield
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createTestFund,
  createTestInvestor,
  createFeesAccount,
  createTestAdmin,
  createTestPosition,
  createTestAum,
  createTestDeposit,
  getDistributionConservation,
} from "./helpers/seed-helpers";
import {
  applyYieldDistribution,
  voidYieldDistribution,
  getYieldAllocations,
  getFeeAllocations,
  getIBAllocations,
  getInvestorPosition,
  getInvestorTransactions,
} from "./helpers/rpc-helpers";
import { cleanupAllTestData, supabase } from "./helpers/supabase-client";

describe("Issue 1: Fees Account Earns Yield on Accumulated Capital", () => {
  let fund: { id: string; code: string; asset: string };
  let admin: { id: string; email: string };
  let feesAccount: { id: string; email: string };
  let alice: { id: string; email: string };
  let bob: { id: string; email: string };

  let novDistributionId: string;
  let decDistributionId: string;

  beforeAll(async () => {
    // Neutralize any stale fees_accounts from previous test files
    // V5 picks FIRST fees_account by created_at - ensure ours is the only one
    await supabase
      .from("profiles")
      .update({ account_type: "investor" })
      .eq("account_type", "fees_account");

    // Create test entities
    admin = await createTestAdmin();
    fund = await createTestFund();
    feesAccount = await createFeesAccount();
    alice = await createTestInvestor({ fee_pct: 30 });
    bob = await createTestInvestor({ fee_pct: 30 });

    // Create initial positions (October 1, 2025)
    await createTestPosition(alice.id, fund.id, {
      current_value: "100",
      cost_basis: "100",
    });
    await createTestPosition(bob.id, fund.id, {
      current_value: "50",
      cost_basis: "50",
    });
    // fees_account starts with 0
    await createTestPosition(feesAccount.id, fund.id, {
      current_value: "0",
      cost_basis: "0",
    });

    // Create deposits (required for ADB calculation)
    await createTestDeposit(alice.id, fund.id, "100", "2025-10-01", fund.asset);
    await createTestDeposit(bob.id, fund.id, "50", "2025-10-01", fund.asset);

    // Create AUM records for November period
    // Opening AUM = 150 (Alice 100 + Bob 50)
    await createTestAum({
      fund_id: fund.id,
      aum_date: "2025-10-31",
      total_aum: "150",
      purpose: "transaction",
    });
    await createTestAum({
      fund_id: fund.id,
      aum_date: "2025-10-31",
      total_aum: "150",
      purpose: "reporting",
    });
  });

  afterAll(async () => {
    // Void distributions in reverse order
    if (decDistributionId) {
      await voidYieldDistribution({
        distribution_id: decDistributionId,
        admin_id: admin.id,
        reason: "Test cleanup",
      }).catch(() => {});
    }
    if (novDistributionId) {
      await voidYieldDistribution({
        distribution_id: novDistributionId,
        admin_id: admin.id,
        reason: "Test cleanup",
      }).catch(() => {});
    }
    await cleanupAllTestData();
  });

  it("should apply November yield and give fees_account FEE_CREDIT", async () => {
    // November yield: AUM goes from 150 to 165 (10% = 15 BTC gross)
    const result = await applyYieldDistribution({
      fund_id: fund.id,
      period_end: "2025-11-30",
      recorded_aum: "165",
      admin_id: admin.id,
      purpose: "transaction",
    });

    expect(result).toBeDefined();
    novDistributionId = result.distribution_id;

    // Verify conservation
    const conservation = await getDistributionConservation(novDistributionId);
    expect(conservation.conservation_holds).toBe(true);

    // Debug: check V5 picked fees_account
    const { data: allFeesAccounts } = await supabase
      .from("profiles")
      .select("id, email, account_type")
      .eq("account_type", "fees_account")
      .order("created_at", { ascending: true });
    const v5FeesId = allFeesAccounts?.[0]?.id;

    // Check all FEE_CREDIT transactions in this fund
    const { data: allFeeCredits } = await supabase
      .from("transactions_v2")
      .select("id, investor_id, type, amount")
      .eq("fund_id", fund.id)
      .eq("type", "FEE_CREDIT")
      .eq("is_voided", false);

    // fees_account should have received FEE_CREDIT (platform fee)
    // V5 picks fees_account by: ORDER BY created_at ASC LIMIT 1
    const feesAccountTxs = await getInvestorTransactions(v5FeesId || feesAccount.id, fund.id);
    const feeCredits = feesAccountTxs.filter((tx) => tx.type === "FEE_CREDIT" && !tx.is_voided);

    expect(
      feeCredits.length,
      `FEE_CREDIT count=0. feesAccount.id=${feesAccount.id}, v5FeesId=${v5FeesId}, allFeesAccounts=${JSON.stringify(allFeesAccounts)}, allFeeCredits=${JSON.stringify(allFeeCredits)}`
    ).toBeGreaterThan(0);

    // fees_account position should now be > 0 (has capital from fees)
    const feesPosition = await getInvestorPosition(feesAccount.id, fund.id);
    expect(feesPosition).not.toBeNull();
    const feesBalance = parseFloat(feesPosition!.current_value);
    expect(feesBalance).toBeGreaterThan(0);

    // Store for December test
    // The fee amount should be ~30% of gross for each investor
  }, 30000);

  it("should create December AUM including fees_account capital", async () => {
    // Get current positions to calculate correct AUM
    const alicePos = await getInvestorPosition(alice.id, fund.id);
    const bobPos = await getInvestorPosition(bob.id, fund.id);
    const feesPos = await getInvestorPosition(feesAccount.id, fund.id);

    const aliceVal = parseFloat(alicePos!.current_value);
    const bobVal = parseFloat(bobPos!.current_value);
    const feesVal = parseFloat(feesPos!.current_value);

    const novEndAum = aliceVal + bobVal + feesVal;

    // Create Nov-end AUM (opening for December)
    await createTestAum({
      fund_id: fund.id,
      aum_date: "2025-11-30",
      total_aum: novEndAum.toString(),
      purpose: "transaction",
    });
    await createTestAum({
      fund_id: fund.id,
      aum_date: "2025-11-30",
      total_aum: novEndAum.toString(),
      purpose: "reporting",
    });

    expect(feesVal).toBeGreaterThan(0);
  });

  it("should apply December yield and give fees_account a YIELD transaction", async () => {
    // December: 5% yield on total AUM
    const alicePos = await getInvestorPosition(alice.id, fund.id);
    const bobPos = await getInvestorPosition(bob.id, fund.id);
    const feesPos = await getInvestorPosition(feesAccount.id, fund.id);

    const currentAum =
      parseFloat(alicePos!.current_value) +
      parseFloat(bobPos!.current_value) +
      parseFloat(feesPos!.current_value);

    const decAum = currentAum * 1.05; // 5% yield

    const result = await applyYieldDistribution({
      fund_id: fund.id,
      period_end: "2025-12-31",
      recorded_aum: decAum.toFixed(10),
      admin_id: admin.id,
      purpose: "transaction",
    });

    expect(result).toBeDefined();
    decDistributionId = result.distribution_id;

    // KEY TEST: fees_account should have a YIELD transaction for December
    const feesAccountTxs = await getInvestorTransactions(feesAccount.id, fund.id);
    const yieldTxs = feesAccountTxs.filter((tx) => tx.type === "YIELD" && !tx.is_voided);

    expect(
      yieldTxs.length,
      "fees_account should have at least one YIELD transaction"
    ).toBeGreaterThan(0);

    // The YIELD amount should be > 0
    const decYield = yieldTxs.find((tx) => tx.tx_date === "2025-12-31");
    if (decYield) {
      expect(parseFloat(decYield.amount)).toBeGreaterThan(0);
    }
  }, 30000);

  it("should NOT create fee_allocations for fees_account in December", async () => {
    expect(decDistributionId).toBeDefined();

    const feeAllocations = await getFeeAllocations(decDistributionId);

    // fees_account should NOT have a fee_allocations row
    const feesAccountFees = feeAllocations.filter((fa) => fa.investor_id === feesAccount.id);
    expect(
      feesAccountFees.length,
      "fees_account should have NO fee_allocations (doesn't charge itself)"
    ).toBe(0);
  });

  it("should NOT create ib_allocations for fees_account in December", async () => {
    expect(decDistributionId).toBeDefined();

    const ibAllocations = await getIBAllocations(decDistributionId);

    // fees_account should NOT have IB allocations
    const feesAccountIB = ibAllocations.filter((ib) => ib.ib_investor_id === feesAccount.id);
    expect(feesAccountIB.length, "fees_account should have NO ib_allocations").toBe(0);
  });

  it("should maintain conservation identity for December distribution", async () => {
    expect(decDistributionId).toBeDefined();

    const conservation = await getDistributionConservation(decDistributionId);
    expect(conservation.conservation_holds).toBe(true);

    // Verify the gross = net + fee + ib + dust equation
    const gross = parseFloat(conservation.gross_yield_amount);
    const net = parseFloat(conservation.total_net_amount);
    const fee = parseFloat(conservation.total_fee_amount);
    const ib = parseFloat(conservation.total_ib_amount);
    const dust = parseFloat(conservation.dust_amount);

    const residual = Math.abs(gross - (net + fee + ib + dust));
    expect(residual).toBeLessThan(0.00000001); // Sub-satoshi tolerance
  });

  it("should NOT include fees_account in distribution totals (fees/ib)", async () => {
    expect(decDistributionId).toBeDefined();

    // Get yield allocations for December
    const allocations = await getYieldAllocations(decDistributionId);

    // fees_account should have a yield allocation (it earns yield)
    const feesAllocation = allocations.find((a) => a.investor_id === feesAccount.id);
    expect(
      feesAllocation,
      "fees_account should have a yield_allocation (it earns yield)"
    ).toBeDefined();

    if (feesAllocation) {
      // fees_account's fee_amount in yield_allocations should be 0
      expect(parseFloat(feesAllocation.fee_amount)).toBe(0);
    }
  });

  it("should have fees_account earning proportional to its balance", async () => {
    expect(decDistributionId).toBeDefined();

    // Get all allocations
    const allocations = await getYieldAllocations(decDistributionId);

    const aliceAlloc = allocations.find((a) => a.investor_id === alice.id);
    const bobAlloc = allocations.find((a) => a.investor_id === bob.id);
    const feesAlloc = allocations.find((a) => a.investor_id === feesAccount.id);

    expect(aliceAlloc).toBeDefined();
    expect(bobAlloc).toBeDefined();
    expect(feesAlloc).toBeDefined();

    // fees_account should earn proportionally less than Alice (smaller balance)
    if (feesAlloc && aliceAlloc) {
      const feesGross = parseFloat(feesAlloc.gross_amount);
      const aliceGross = parseFloat(aliceAlloc.gross_amount);
      // fees_account balance is much smaller than Alice's, so its yield should be smaller
      expect(feesGross).toBeLessThan(aliceGross);
      expect(feesGross).toBeGreaterThan(0);
    }
  });
});
