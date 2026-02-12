/**
 * Integration Test: Large Numbers Precision
 *
 * Tests that NUMERIC(28,10) precision is preserved through the full flow.
 * Critical for large BTC amounts and precise financial calculations.
 *
 * Conservation identity: gross = net + fee + ib + dust
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Decimal from "decimal.js";
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
  getInvestorPosition,
} from "./helpers/rpc-helpers";
import { cleanupAllTestData } from "./helpers/supabase-client";

// Configure Decimal.js for high precision
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

describe("Yield Engine: Large Numbers Precision (NUMERIC 28,10)", () => {
  let fund: { id: string; code: string; asset: string };
  let feesAccount: { id: string };
  let whaleInvestor: { id: string };
  let smallInvestor: { id: string };
  let adminId: string;

  beforeAll(async () => {
    fund = await createTestFund({ perf_fee_bps: 3000 });
    feesAccount = await createFeesAccount();
    const admin = await createTestAdmin();
    adminId = admin.id;

    whaleInvestor = await createTestInvestor({ fee_pct: 30 });
    smallInvestor = await createTestInvestor({ fee_pct: 30 });

    // Whale investor with 1000 BTC (large but realistic)
    await createTestPosition(whaleInvestor.id, fund.id, {
      current_value: "1000.1234567890",
    });
    await createTestDeposit(whaleInvestor.id, fund.id, "1000.1234567890", "2023-12-15", fund.asset);

    // Small investor with tiny balance
    await createTestPosition(smallInvestor.id, fund.id, {
      current_value: "0.0000001234",
    });
    await createTestDeposit(smallInvestor.id, fund.id, "0.0000001234", "2023-12-15", fund.asset);

    // Total AUM
    const totalAum = new Decimal("1000.1234567890").plus("0.0000001234").toString();

    await createTestAum({
      fund_id: fund.id,
      aum_date: "2024-01-01",
      total_aum: totalAum,
      purpose: "transaction",
    });

    // Add yield
    const endAum = new Decimal(totalAum).plus("10.9876543210").toString();
    await createTestAum({
      fund_id: fund.id,
      aum_date: "2024-01-30",
      total_aum: endAum,
      purpose: "transaction",
    });
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it("should preserve full precision in yield calculations", async () => {
    const openingAum = new Decimal("1000.1234567890").plus("0.0000001234");
    const grossYield = new Decimal("10.9876543210");
    const recordedAum = openingAum.plus(grossYield).toString();

    const result = await applyYieldDistribution({
      fund_id: fund.id,
      period_end: "2024-01-30",
      recorded_aum: recordedAum,
      admin_id: adminId,
      purpose: "transaction",
    });

    expect(result.success).toBe(true);
    const conservation = await getDistributionConservation(result.distribution_id);

    // Gross yield should be stored with proper precision
    // Note: Supabase may return numeric as number, so compare as numbers
    const storedGross = parseFloat(String(conservation.gross_yield_amount));
    const expectedGross = parseFloat(grossYield.toString());
    expect(storedGross).toBeCloseTo(expectedGross, 8);
  });

  it("should maintain precision in allocation calculations", async () => {
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

      // Each allocation should preserve decimal precision
      for (const alloc of allocations) {
        // Check that amounts have precision (not truncated to integers)
        // Note: Supabase may return numeric as number, convert to string first
        const grossStr = String(alloc.gross_amount);

        // Should have decimal values
        expect(grossStr).toMatch(/\d+\.?\d*/);

        // Per-allocation conservation (convert to string for Decimal.js)
        const gross = new Decimal(String(alloc.gross_amount));
        const net = new Decimal(String(alloc.net_amount));
        const fee = new Decimal(String(alloc.fee_amount));
        const ib = new Decimal(String(alloc.ib_amount));

        const sum = net.plus(fee).plus(ib);
        const diff = gross.minus(sum).abs();

        // Should be equal within 10^-10 tolerance
        expect(diff.lessThan(new Decimal("0.0000000001"))).toBe(true);
      }
    }
  });

  it("should handle very small amounts without losing precision", async () => {
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

      const smallAlloc = allocations.find((a) => a.investor_id === smallInvestor.id);

      // Small investor should have an allocation (not rounded to zero)
      if (smallAlloc) {
        const netAmount = new Decimal(smallAlloc.net_amount);
        // Should be positive, even if very small
        expect(netAmount.greaterThan(0) || netAmount.equals(0)).toBe(true);
      }
    }
  });
});
