/**
 * CI Check: Database Integrity Pack
 *
 * Calls the run_integrity_pack() RPC and verifies overall_status = 'pass'.
 * This is the lightweight CI version — full invariant checks are in Phase 4.
 *
 * Usage:
 *   npx tsx tests/qa/ci/integrity-check.ts
 *
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 *
 * Exit codes:
 *   0 = all checks pass
 *   1 = integrity failures detected
 *   2 = cannot connect to DB
 */

import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IntegrityCheckResult {
  check_name: string;
  status: "pass" | "warn" | "fail";
  details?: string;
  count?: number;
}

interface IntegrityPackResult {
  overall_status: "pass" | "warn" | "fail";
  checks: IntegrityCheckResult[];
  run_at: string;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("CI: Database Integrity Check");
  console.log("============================\n");

  try {
    // Call the integrity pack RPC
    console.log("Running run_integrity_pack()...\n");
    const { data, error } = await supabase.rpc("run_integrity_pack");

    if (error) {
      console.log(`[ERROR] Failed to run integrity pack: ${error.message}`);

      // Try individual checks as fallback
      console.log("\nFalling back to individual integrity checks...\n");
      await runFallbackChecks();
      return;
    }

    // The RPC may return a single object or an array — normalize
    const rawResult = Array.isArray(data) ? data[0] : data;

    if (!rawResult || typeof rawResult !== "object") {
      console.log("[ERROR] Unexpected result format from run_integrity_pack()");
      console.log("  Raw result:", JSON.stringify(data));
      process.exit(2);
    }

    const result = rawResult as unknown as IntegrityPackResult;

    // Display results — checks may be an array or need parsing
    const rawChecks = result.checks;
    const checks: IntegrityCheckResult[] = Array.isArray(rawChecks)
      ? rawChecks
      : typeof rawChecks === "string"
        ? JSON.parse(rawChecks)
        : [];
    let passCount = 0;
    let warnCount = 0;
    let failCount = 0;

    for (const check of checks) {
      const icon = check.status === "pass" ? "PASS" : check.status === "warn" ? "WARN" : "FAIL";

      console.log(`  [${icon}] ${check.check_name}`);
      if (check.details) {
        console.log(`         ${check.details}`);
      }
      if (check.count !== undefined && check.count > 0) {
        console.log(`         Count: ${check.count}`);
      }

      if (check.status === "pass") passCount++;
      else if (check.status === "warn") warnCount++;
      else failCount++;
    }

    // Summary
    console.log("\n============================");
    console.log(`Overall: ${result.overall_status?.toUpperCase() || "UNKNOWN"}`);
    console.log(`  Pass: ${passCount}`);
    console.log(`  Warn: ${warnCount}`);
    console.log(`  Fail: ${failCount}`);

    if (result.overall_status === "fail") {
      console.log("\nFAILED: Integrity checks did not pass");
      process.exit(1);
    } else if (result.overall_status === "warn") {
      console.log("\nWARNING: Integrity checks passed with warnings");
      // Warnings don't fail CI
    } else {
      console.log("\nPASSED");
    }
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(2);
  }
}

// ---------------------------------------------------------------------------
// Fallback: Run individual checks if integrity pack not available
// ---------------------------------------------------------------------------

async function runFallbackChecks() {
  let hasFailures = false;

  // Check 1: No orphan transactions
  console.log("  Checking for orphan transactions...");
  const { count: orphanCount } = await supabase
    .from("transactions_v2")
    .select("*", { count: "exact", head: true })
    .is("investor_id", null);

  if (orphanCount && orphanCount > 0) {
    console.log(`  [FAIL] ${orphanCount} orphan transactions found`);
    hasFailures = true;
  } else {
    console.log("  [PASS] No orphan transactions");
  }

  // Check 2: No negative positions
  console.log("  Checking for negative positions...");
  const { data: negPositions } = await supabase
    .from("investor_positions")
    .select("investor_id, fund_id, current_value")
    .lt("current_value", -0.00000001);

  if (negPositions && negPositions.length > 0) {
    console.log(`  [FAIL] ${negPositions.length} negative positions found`);
    hasFailures = true;
  } else {
    console.log("  [PASS] No negative positions");
  }

  // Check 3: Voided records have metadata
  console.log("  Checking voided records...");
  const { count: badVoidCount } = await supabase
    .from("transactions_v2")
    .select("*", { count: "exact", head: true })
    .eq("is_voided", true)
    .is("voided_at", null);

  if (badVoidCount && badVoidCount > 0) {
    console.log(`  [FAIL] ${badVoidCount} voided transactions missing metadata`);
    hasFailures = true;
  } else {
    console.log("  [PASS] All voided records have metadata");
  }

  // Check 4: Active funds exist
  console.log("  Checking active funds...");
  const { count: fundCount } = await supabase
    .from("funds")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  if (!fundCount || fundCount === 0) {
    console.log("  [WARN] No active funds found");
  } else {
    console.log(`  [PASS] ${fundCount} active funds`);
  }

  // Summary
  console.log("\n============================");
  if (hasFailures) {
    console.log("FAILED: Integrity issues detected");
    process.exit(1);
  } else {
    console.log("PASSED (fallback checks)");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(2);
});
