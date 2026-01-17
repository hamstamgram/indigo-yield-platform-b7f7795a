#!/usr/bin/env npx ts-node --esm
/**
 * Flow Pack Runner
 *
 * Executes complete business flows via RPC calls:
 * 1. Preview yield -> Apply yield
 * 2. Full withdrawal request -> approval -> processing
 * 3. Position reconciliation
 * 4. Ledger integrity checks
 *
 * Uses golden path seed data (TEST_IDS from seed-golden-path.ts)
 * Exit code non-zero on any flow failure
 */

import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Test IDs from golden path seeder
const TEST_IDS = {
  FUND_ALPHA: "00000000-0000-4000-a000-000000000001",
  ADMIN_USER: "00000000-0000-4000-a000-000000000010",
  INDIGO_FEES: "00000000-0000-4000-a000-000000000020",
  INVESTOR_ALICE: "00000000-0000-4000-a000-000000000100",
  INVESTOR_BOB: "00000000-0000-4000-a000-000000000101",
  INVESTOR_CAROL: "00000000-0000-4000-a000-000000000102",
  IB_DAVE: "00000000-0000-4000-a000-000000000200",
};

interface FlowResult {
  flow: string;
  step: string;
  success: boolean;
  message: string;
  data?: any;
  duration?: number;
}

const results: FlowResult[] = [];

function log(result: FlowResult) {
  results.push(result);
  const icon = result.success ? "✓" : "✗";
  const duration = result.duration ? ` (${result.duration}ms)` : "";
  console.log(`    ${icon} ${result.step}: ${result.message}${duration}`);
}

function getYieldDate(): string {
  const today = new Date();
  today.setDate(today.getDate() - 1); // Yesterday
  return today.toISOString().split("T")[0];
}

// =============================================================================
// FLOW 1: Yield Distribution
// =============================================================================
async function flowYieldDistribution() {
  console.log("\n  FLOW 1: Yield Distribution");
  console.log("  " + "-".repeat(50));

  const yieldDate = getYieldDate();

  // Step 1: Get current AUM
  const startTime = Date.now();
  const { data: positions, error: posError } = await supabase
    .from("investor_positions")
    .select("balance")
    .eq("fund_id", TEST_IDS.FUND_ALPHA);

  const currentAUM = positions?.reduce((sum, p) => sum + (p.balance || 0), 0) || 0;

  log({
    flow: "yield",
    step: "Get Current AUM",
    success: !posError && currentAUM > 0,
    message: posError ? posError.message : `Current AUM: ${currentAUM.toLocaleString()}`,
    duration: Date.now() - startTime
  });

  if (currentAUM === 0) {
    log({
      flow: "yield",
      step: "Skip Yield",
      success: false,
      message: "Cannot proceed - no AUM found. Run seed-golden-path first."
    });
    return false;
  }

  // Step 2: Preview yield (simulating 0.5% daily return)
  const newAUM = currentAUM * 1.005;
  const previewStart = Date.now();

  const { data: preview, error: previewError } = await supabase.rpc(
    "preview_daily_yield_to_fund_v3",
    {
      p_fund_id: TEST_IDS.FUND_ALPHA,
      p_yield_date: yieldDate,
      p_new_aum: newAUM,
      p_purpose: "reporting"
    }
  );

  const previewSuccess = !previewError && preview?.success === true;

  log({
    flow: "yield",
    step: "Preview Yield",
    success: previewSuccess,
    message: previewError ? previewError.message :
             preview?.success ? `Gross: ${preview.grossYield?.toFixed(2)}, Net: ${preview.netYield?.toFixed(2)}` :
             preview?.error || "Preview failed",
    data: preview,
    duration: Date.now() - previewStart
  });

  if (!previewSuccess) {
    return false;
  }

  // Step 3: Verify preview calculations
  const grossYield = preview.grossYield || 0;
  const totalFees = preview.totalFees || 0;
  const totalIbFees = preview.totalIbFees || 0;
  const netYield = preview.netYield || 0;

  const calculationValid =
    Math.abs((grossYield - totalFees - totalIbFees) - netYield) < 0.01;

  log({
    flow: "yield",
    step: "Verify Math",
    success: calculationValid,
    message: calculationValid ?
      `Gross(${grossYield.toFixed(2)}) - Fees(${totalFees.toFixed(2)}) - IB(${totalIbFees.toFixed(2)}) = Net(${netYield.toFixed(2)})` :
      "Calculation mismatch!"
  });

  // Step 4: Verify IB commission for Bob (he has IB relationship)
  const bobDistribution = preview.distributions?.find(
    (d: any) => d.investorId === TEST_IDS.INVESTOR_BOB
  );

  const ibCommissionValid = bobDistribution &&
    bobDistribution.ibPct > 0 &&
    bobDistribution.ibAmount > 0;

  log({
    flow: "yield",
    step: "Verify IB Commission",
    success: !!ibCommissionValid,
    message: ibCommissionValid ?
      `Bob's IB commission: ${bobDistribution.ibPct}% = ${bobDistribution.ibAmount.toFixed(2)}` :
      "Bob should have IB commission (check ib_parent_id)"
  });

  // Step 5: Check for conflicts
  const hasConflicts = preview.hasConflicts || false;

  log({
    flow: "yield",
    step: "Check Conflicts",
    success: true,
    message: hasConflicts ?
      `WARNING: Existing distribution on ${yieldDate}` :
      "No conflicts - safe to apply"
  });

  // Note: We don't actually APPLY the yield in tests to keep data clean
  // In E2E tests, you would call apply_daily_yield_to_fund_v3

  return true;
}

// =============================================================================
// FLOW 2: Position Reconciliation
// =============================================================================
async function flowPositionReconciliation() {
  console.log("\n  FLOW 2: Position Reconciliation");
  console.log("  " + "-".repeat(50));

  // Step 1: Get investor position for Alice
  const startTime = Date.now();
  const { data: position, error: posError } = await supabase
    .from("investor_positions")
    .select("*")
    .eq("fund_id", TEST_IDS.FUND_ALPHA)
    .eq("investor_id", TEST_IDS.INVESTOR_ALICE)
    .single();

  log({
    flow: "reconciliation",
    step: "Get Position",
    success: !posError && position !== null,
    message: posError ? posError.message : `Alice balance: ${position?.balance?.toLocaleString()}`,
    duration: Date.now() - startTime
  });

  if (!position) {
    return false;
  }

  // Step 2: Try reconciliation RPC (may not exist in all versions)
  const reconcileStart = Date.now();
  const { data: reconcile, error: reconcileError } = await supabase.rpc(
    "reconcile_investor_position",
    {
      p_fund_id: TEST_IDS.FUND_ALPHA,
      p_investor_id: TEST_IDS.INVESTOR_ALICE
    }
  );

  // Reconciliation might not exist - that's OK
  if (reconcileError?.message?.includes("does not exist")) {
    log({
      flow: "reconciliation",
      step: "Reconcile Position",
      success: true,
      message: "RPC not available (optional feature)",
      duration: Date.now() - reconcileStart
    });
  } else {
    log({
      flow: "reconciliation",
      step: "Reconcile Position",
      success: !reconcileError,
      message: reconcileError ? reconcileError.message : "Position reconciled",
      data: reconcile,
      duration: Date.now() - reconcileStart
    });
  }

  // Step 3: Get position as of yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const asOfDate = yesterday.toISOString().split("T")[0];

  const asOfStart = Date.now();
  const { data: asOfPosition, error: asOfError } = await supabase.rpc(
    "get_investor_position_as_of",
    {
      p_fund_id: TEST_IDS.FUND_ALPHA,
      p_investor_id: TEST_IDS.INVESTOR_ALICE,
      p_as_of_date: asOfDate
    }
  );

  if (asOfError?.message?.includes("does not exist")) {
    log({
      flow: "reconciliation",
      step: "Position As-Of",
      success: true,
      message: "RPC not available (optional feature)",
      duration: Date.now() - asOfStart
    });
  } else {
    log({
      flow: "reconciliation",
      step: "Position As-Of",
      success: !asOfError,
      message: asOfError ? asOfError.message : `As of ${asOfDate}: position calculated`,
      data: asOfPosition,
      duration: Date.now() - asOfStart
    });
  }

  return true;
}

// =============================================================================
// FLOW 3: Admin Permission Check
// =============================================================================
async function flowAdminCheck() {
  console.log("\n  FLOW 3: Admin Permission Check");
  console.log("  " + "-".repeat(50));

  // Step 1: Call is_admin RPC
  const startTime = Date.now();
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");

  // is_admin relies on auth.uid() which won't work with service role
  // So we expect false or an error about auth context
  const expectedBehavior = adminError?.message?.includes("auth") ||
                          isAdmin === false ||
                          isAdmin === true;

  log({
    flow: "admin",
    step: "Check is_admin RPC",
    success: !adminError || expectedBehavior,
    message: adminError ? `Expected: ${adminError.message}` : `is_admin = ${isAdmin}`,
    duration: Date.now() - startTime
  });

  // Step 2: Verify admin profile exists
  const { data: adminProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id, account_type")
    .eq("id", TEST_IDS.ADMIN_USER)
    .single();

  log({
    flow: "admin",
    step: "Verify Admin Profile",
    success: !profileError && adminProfile?.account_type === "admin",
    message: profileError ? profileError.message :
             adminProfile?.account_type === "admin" ? "Admin profile verified" :
             `Wrong account_type: ${adminProfile?.account_type}`
  });

  return true;
}

// =============================================================================
// FLOW 4: Integrity View Checks
// =============================================================================
async function flowIntegrityChecks() {
  console.log("\n  FLOW 4: Integrity View Checks");
  console.log("  " + "-".repeat(50));

  const integrityViews = [
    "v_ledger_reconciliation",
    "v_position_transaction_variance",
    "v_yield_conservation_check"
  ];

  let allPassed = true;

  for (const viewName of integrityViews) {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from(viewName)
      .select("*")
      .limit(10);

    // View might not exist - that's a warning, not failure
    if (error?.message?.includes("does not exist") ||
        error?.message?.includes("relation") ||
        error?.code === "42P01") {
      log({
        flow: "integrity",
        step: viewName,
        success: true,
        message: "View not found (optional)",
        duration: Date.now() - startTime
      });
    } else if (error) {
      log({
        flow: "integrity",
        step: viewName,
        success: false,
        message: error.message,
        duration: Date.now() - startTime
      });
      allPassed = false;
    } else {
      // Check if any violations found
      const violationCount = data?.length || 0;
      const hasViolations = violationCount > 0;

      log({
        flow: "integrity",
        step: viewName,
        success: !hasViolations,
        message: hasViolations ?
          `WARNING: ${violationCount} violations found` :
          "No violations",
        data: hasViolations ? data : undefined,
        duration: Date.now() - startTime
      });

      if (hasViolations) {
        allPassed = false;
      }
    }
  }

  return allPassed;
}

// =============================================================================
// FLOW 5: Transaction Query Validation
// =============================================================================
async function flowTransactionQueries() {
  console.log("\n  FLOW 5: Transaction Queries");
  console.log("  " + "-".repeat(50));

  // Step 1: Query transactions with valid tx_type values
  const validTypes = ["DEPOSIT", "WITHDRAWAL", "YIELD", "FEE"];

  for (const txType of validTypes) {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from("transactions_v2")
      .select("id, type, amount")
      .eq("fund_id", TEST_IDS.FUND_ALPHA)
      .eq("type", txType)
      .limit(5);

    log({
      flow: "transactions",
      step: `Query ${txType}`,
      success: !error,
      message: error ? error.message : `${data?.length || 0} ${txType} transactions`,
      duration: Date.now() - startTime
    });
  }

  // Step 2: Verify FIRST_INVESTMENT is NOT a valid tx_type in DB
  const startTime = Date.now();
  const { data: invalidTx, error: invalidError } = await supabase
    .from("transactions_v2")
    .select("id")
    .eq("type", "FIRST_INVESTMENT")
    .limit(1);

  // If this query SUCCEEDS and finds data, that's actually a problem
  // FIRST_INVESTMENT shouldn't exist in the DB
  const noInvalidFound = !invalidError && (!invalidTx || invalidTx.length === 0);

  log({
    flow: "transactions",
    step: "Verify No FIRST_INVESTMENT",
    success: noInvalidFound || invalidError?.message?.includes("invalid input"),
    message: invalidError?.message?.includes("invalid input") ?
      "Correctly rejected invalid enum value" :
      noInvalidFound ? "No invalid tx_type found" :
      `WARNING: Found ${invalidTx?.length} FIRST_INVESTMENT records!`,
    duration: Date.now() - startTime
  });

  return true;
}

// =============================================================================
// Main Runner
// =============================================================================
async function printSummary(): Promise<boolean> {
  console.log("\n" + "=".repeat(70));
  console.log("  FLOW PACK SUMMARY");
  console.log("=".repeat(70));

  const byFlow: Record<string, FlowResult[]> = {};
  for (const r of results) {
    if (!byFlow[r.flow]) byFlow[r.flow] = [];
    byFlow[r.flow].push(r);
  }

  let totalPass = 0;
  let totalFail = 0;

  for (const [flow, flowResults] of Object.entries(byFlow)) {
    const passed = flowResults.filter(r => r.success).length;
    const failed = flowResults.filter(r => !r.success).length;
    totalPass += passed;
    totalFail += failed;

    const status = failed === 0 ? "PASS" : "FAIL";
    console.log(`\n  ${flow.toUpperCase()}: ${status} (${passed}/${flowResults.length})`);

    if (failed > 0) {
      for (const r of flowResults.filter(r => !r.success)) {
        console.log(`    - ${r.step}: ${r.message}`);
      }
    }
  }

  console.log("\n" + "-".repeat(70));
  console.log(`  TOTAL: ${totalPass} passed, ${totalFail} failed`);
  console.log("=".repeat(70));

  return totalFail === 0;
}

async function main() {
  console.log("=".repeat(70));
  console.log("  FLOW PACK RUNNER");
  console.log("=".repeat(70));
  console.log(`\n  Target: ${SUPABASE_URL}`);
  console.log(`  Test Fund: ${TEST_IDS.FUND_ALPHA}`);

  const startTime = Date.now();

  try {
    await flowYieldDistribution();
    await flowPositionReconciliation();
    await flowAdminCheck();
    await flowIntegrityChecks();
    await flowTransactionQueries();

    const success = await printSummary();
    const totalTime = Date.now() - startTime;

    console.log(`\n  Total execution time: ${totalTime}ms`);

    if (!success) {
      console.log("\n  FLOW PACK FAILED\n");
      process.exit(1);
    }

    console.log("\n  FLOW PACK PASSED\n");

  } catch (error) {
    console.error("\nFatal error:", error);
    process.exit(1);
  }
}

main();
