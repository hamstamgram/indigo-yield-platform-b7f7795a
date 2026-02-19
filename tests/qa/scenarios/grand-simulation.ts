import { SupabaseClient } from "@supabase/supabase-js";
import Decimal from "decimal.js";
import { ScenarioContext, ScenarioResult } from "./families";

// ============================================================================
// Helpers
// ============================================================================

const DUST_THRESHOLD = new Decimal("0.00000001");

async function doDeposit(
  sb: SupabaseClient,
  adminId: string,
  investorId: string,
  fundId: string,
  amount: number,
  effectiveDate: string,
  closingAum: number
) {
  const { data, error } = await sb.rpc("apply_transaction_with_crystallization", {
    p_investor_id: investorId,
    p_fund_id: fundId,
    p_type: "DEPOSIT",
    p_amount: amount,
    p_tx_date: effectiveDate,
    p_reference_id: `dep-${investorId}-${effectiveDate}-${Date.now()}`,
    p_admin_id: adminId,
    p_closing_aum: closingAum,
  });
  return { data, error };
}

async function applyYield(
  sb: SupabaseClient,
  adminId: string,
  fundId: string,
  targetDate: string,
  recordedAum: number,
  purpose: "reporting" | "transaction" = "reporting"
) {
  const { data, error } = await sb.rpc("apply_segmented_yield_distribution_v5", {
    p_fund_id: fundId,
    p_period_end: targetDate,
    p_recorded_aum: recordedAum,
    p_admin_id: adminId,
    p_purpose: purpose,
    p_distribution_date: targetDate,
  });
  return { data, error };
}

async function createReport(
  sb: SupabaseClient,
  investorId: string,
  year: number,
  month: number,
  assetCode: string
) {
  // First check if period exists, if not create it
  let { data: period } = await sb
    .from("statement_periods")
    .select("id")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (!period) {
    const lastDay = new Date(year, month, 0).getDate();
    const periodEndDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const { data: newPeriod } = await sb
      .from("statement_periods")
      .insert({
        year,
        month,
        period_name: `${new Date(year, month - 1).toLocaleString("default", { month: "long" })} ${year}`,
        period_end_date: periodEndDate,
        status: "FINALIZED",
      })
      .select("id")
      .single();
    period = newPeriod;
  }

  if (period) {
    await sb.from("investor_fund_performance").upsert({
      investor_id: investorId,
      period_id: period.id,
      fund_name: assetCode,
      mtd_beginning_balance: 0,
      mtd_ending_balance: 0,
      mtd_additions: 0,
      mtd_redemptions: 0,
      mtd_net_income: 0,
    });
  }
}

// ============================================================================
// Scenarios
// ============================================================================

export async function runGrandSimulation(ctx: ScenarioContext): Promise<ScenarioResult> {
  const { supabase: sb, testWorld } = ctx;
  const adminId = testWorld.adminId;
  const xrpFundId = testWorld.fundId; // Assuming this is the XRP fund for the simulation
  const assetCode = "XRP";

  // 1. Identification / Creation of Investors
  // Using identified QA test emails
  const samEmail = "qa-early-depositor@test.indigo.fund";
  const bEmail = "qa-mid-month-dep@test.indigo.fund";

  const { data: samResult } = await sb
    .from("profiles")
    .select("id")
    .eq("email", samEmail)
    .maybeSingle();
  const { data: investorBResult } = await sb
    .from("profiles")
    .select("id")
    .eq("email", bEmail)
    .maybeSingle();

  let samId = samResult?.id;
  let bId = investorBResult?.id;

  // Fallback if not found (due to rate limits on signUp)
  if (!samId) {
    samId = "3274cdf5-f707-4f0b-b026-66e684180996"; // qa.investor@indigo.fund
    console.log(`Using fallback Sam ID: ${samId}`);
  }
  if (!bId) {
    bId = "5cf9484a-b9c3-47ce-87ac-ee0093d65a7f"; // bokriek@example.com
    console.log(`Using fallback Investor B ID: ${bId}`);
  }

  if (!samId || !bId) {
    return {
      passed: false,
      description: `Test investors not found and fallbacks failed.`,
    };
  }

  // Month 1: November (Foundation)
  console.log("--- Executing Month 1: November ---");

  // Nov 1: Deposits
  await doDeposit(sb, adminId, samId, xrpFundId, 100000, "2025-11-01", 100000);
  await doDeposit(sb, adminId, bId, xrpFundId, 50000, "2025-11-01", 150000);

  // Nov 30: Apply +10% Yield (Gross = 150k + 15k = 165k)
  await applyYield(sb, adminId, xrpFundId, "2025-11-30", 165000, "transaction");
  await applyYield(sb, adminId, xrpFundId, "2025-11-30", 165000, "reporting");

  // Produce Reports
  await createReport(sb, samId, 2025, 11, assetCode);
  await createReport(sb, bId, 2025, 11, assetCode);

  // Month 2: December (Compounding & Top-Up)
  console.log("--- Executing Month 2: December ---");

  // Dec 1: Sam top-up
  await doDeposit(sb, adminId, samId, xrpFundId, 20000, "2025-12-01", 185000);

  // Dec 31: Apply +5% Yield
  // Current AUM (Net) = 185,000. Dec 31: Apply +5% Gross Yield on 185k = 9.25k. New AUM = 194,250.
  await applyYield(sb, adminId, xrpFundId, "2025-12-31", 194250, "transaction");
  await applyYield(sb, adminId, xrpFundId, "2025-12-31", 194250, "reporting");

  await createReport(sb, samId, 2025, 12, assetCode);
  await createReport(sb, bId, 2025, 12, assetCode);

  // Month 3: January (Bug Fix - 0% Yield)
  console.log("--- Executing Month 3: January ---");
  // Jan 31: 0% Yield. AUM remains 194.25k.
  await applyYield(sb, adminId, xrpFundId, "2026-01-31", 194250, "transaction");
  await applyYield(sb, adminId, xrpFundId, "2026-01-31", 194250, "reporting");

  await createReport(sb, samId, 2026, 1, assetCode);
  await createReport(sb, bId, 2026, 1, assetCode);

  // Month 4: February (Crash Test - Negative Yield)
  console.log("--- Executing Month 4: February ---");
  // Feb 28: -2.00% Yield.
  const febAum = 194250 * 0.98; // 190365
  await applyYield(sb, adminId, xrpFundId, "2026-02-28", febAum, "transaction");
  await applyYield(sb, adminId, xrpFundId, "2026-02-28", febAum, "reporting");

  await createReport(sb, samId, 2026, 2, assetCode);
  await createReport(sb, bId, 2026, 2, assetCode);

  // Final Verification
  console.log("--- Running Final Verification ---");

  // Sum of all balances (Transactions)
  const { data: allTxs } = await sb
    .from("transactions_v2")
    .select("amount")
    .eq("fund_id", xrpFundId)
    .eq("is_voided", false);
  const totalLedger = (allTxs || []).reduce(
    (sum, tx) => sum.plus(new Decimal(tx.amount)),
    new Decimal(0)
  );

  // Sum of all positions
  const { data: allPos } = await sb
    .from("investor_positions")
    .select("current_value")
    .eq("fund_id", xrpFundId);
  const totalPositions = (allPos || []).reduce(
    (sum, pos) => sum.plus(new Decimal(pos.current_value)),
    new Decimal(0)
  );

  console.log(`Total Ledger: ${totalLedger}`);
  console.log(`Total Positions: ${totalPositions}`);

  const diff = totalLedger.minus(totalPositions).abs();
  const passDust = diff.lt(DUST_THRESHOLD);

  return {
    passed: passDust,
    description: "Grand Simulation completed.",
    details: `Ledger: ${totalLedger}, Positions: ${totalPositions}, Diff: ${diff}, Dust Pass: ${passDust}`,
  };
}
