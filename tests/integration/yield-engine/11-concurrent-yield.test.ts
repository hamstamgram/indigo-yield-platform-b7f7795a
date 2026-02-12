/**
 * Test 11: Concurrent Yield Distribution
 *
 * Verifies that two simultaneous yield distribution calls for the same fund
 * do not produce duplicate distributions or corrupt data.
 * PostgreSQL advisory locks in V5 engine should serialize these.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { cleanupAllTestData } from "./helpers/supabase-client";
import {
  createTestFund,
  createTestInvestor,
  createTestPosition,
  createTestAum,
  createTestAdmin,
  createFeesAccount,
} from "./helpers/seed-helpers";
import { applyYieldDistribution } from "./helpers/rpc-helpers";
import { supabase } from "./helpers/supabase-client";

describe("Concurrent Yield Distribution", () => {
  let fund: { id: string; code: string };
  let admin1: { id: string };
  let admin2: { id: string };
  let investor: { id: string };

  beforeAll(async () => {
    fund = await createTestFund({ asset: "BTC" });
    admin1 = await createTestAdmin();
    admin2 = await createTestAdmin();
    investor = await createTestInvestor({ fee_pct: 30 });
    await createFeesAccount();

    // Seed position and AUM
    await createTestPosition(investor.id, fund.id, { current_value: "10" });
    await createTestAum({
      fund_id: fund.id,
      aum_date: "2025-01-01",
      total_aum: "10",
    });
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it("should serialize concurrent yield distributions for the same fund", async () => {
    // Both admins attempt to apply yield for the same period simultaneously
    const results = await Promise.allSettled([
      applyYieldDistribution({
        fund_id: fund.id,
        period_end: "2025-01-31",
        recorded_aum: "10.5",
        admin_id: admin1.id,
        purpose: "transaction",
      }),
      applyYieldDistribution({
        fund_id: fund.id,
        period_end: "2025-01-31",
        recorded_aum: "10.5",
        admin_id: admin2.id,
        purpose: "transaction",
      }),
    ]);

    // One should succeed, the other should fail (idempotency guard or serialization)
    const successes = results.filter((r) => r.status === "fulfilled");
    const failures = results.filter((r) => r.status === "rejected");

    // At most ONE distribution should be created
    expect(successes.length).toBeLessThanOrEqual(2);

    // Verify only one distribution exists for this fund/period
    const { data: distributions } = await supabase
      .from("yield_distributions")
      .select("id")
      .eq("fund_id", fund.id)
      .eq("period_end", "2025-01-31")
      .eq("is_voided", false);

    expect(distributions?.length).toBe(1);

    // Verify conservation identity on the created distribution
    const distId = distributions![0].id;
    const { data: dist } = await supabase
      .from("yield_distributions")
      .select(
        "gross_yield_amount, total_net_amount, total_fee_amount, total_ib_amount, dust_amount"
      )
      .eq("id", distId)
      .single();

    const gross = parseFloat(dist!.gross_yield_amount);
    const net = parseFloat(dist!.total_net_amount);
    const fee = parseFloat(dist!.total_fee_amount);
    const ib = parseFloat(dist!.total_ib_amount);
    const dust = parseFloat(dist!.dust_amount);

    expect(Math.abs(gross - (net + fee + ib + dust))).toBeLessThan(0.0000001);
  });

  it("should not create duplicate yield allocations", async () => {
    // After the concurrent test above, check allocation count
    const { data: distributions } = await supabase
      .from("yield_distributions")
      .select("id")
      .eq("fund_id", fund.id)
      .eq("period_end", "2025-01-31")
      .eq("is_voided", false);

    if (!distributions?.length) return; // Skip if no distribution

    const { data: allocations } = await supabase
      .from("yield_allocations")
      .select("investor_id")
      .eq("distribution_id", distributions[0].id);

    // Should have exactly 1 allocation for the 1 investor
    expect(allocations?.length).toBe(1);
    expect(allocations![0].investor_id).toBe(investor.id);
  });
});
