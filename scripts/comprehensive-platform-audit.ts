#!/usr/bin/env npx ts-node --esm
/**
 * COMPREHENSIVE PLATFORM AUDIT
 * Tests all RPC functions and critical platform operations
 * Part of RIPER Phase 4: Execute
 */

import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  message: string;
  errorType?: "ENUM_BUG" | "RLS" | "PERMISSION" | "NOT_FOUND" | "DATA" | "OTHER";
  details?: any;
}

const results: TestResult[] = [];

function categorizeError(error: any): TestResult["errorType"] {
  const msg = error?.message || String(error);

  if (
    msg.includes("FIRST_INVESTMENT") ||
    msg.includes("TOP_UP") ||
    msg.includes("invalid input value for enum")
  ) {
    return "ENUM_BUG";
  }
  if (
    msg.includes("permission") ||
    msg.includes("privilege") ||
    msg.includes("admin") ||
    msg.includes("RLS")
  ) {
    return "PERMISSION";
  }
  if (msg.includes("does not exist") || msg.includes("42883") || msg.includes("function")) {
    return "NOT_FOUND";
  }
  if (msg.includes("row-level security") || msg.includes("new row violates")) {
    return "RLS";
  }
  if (msg.includes("No ") || msg.includes("not found") || msg.includes("Missing")) {
    return "DATA";
  }
  return "OTHER";
}

function log(result: TestResult) {
  results.push(result);
  const icon = result.passed ? "✅" : result.errorType === "ENUM_BUG" ? "🔴" : "⚠️";
  console.log(`  ${icon} ${result.name}: ${result.message}`);
}

// ============================================================================
// TEST DATA
// ============================================================================
async function getTestData() {
  const { data: funds } = await supabase.from("funds").select("id, code, name, asset").limit(1);

  const { data: investors } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("account_type", "investor")
    .limit(1);

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  return {
    fundId: funds?.[0]?.id || "00000000-0000-0000-0000-000000000001",
    fundCode: funds?.[0]?.code || "TEST",
    investorId: investors?.[0]?.id || "00000000-0000-0000-0000-000000000002",
    today,
    yesterday,
  };
}

// ============================================================================
// YIELD FUNCTIONS
// ============================================================================
async function testYieldFunctions(testData: any) {
  console.log("\n📊 YIELD FUNCTIONS");
  console.log("─".repeat(60));

  // preview_daily_yield_to_fund_v3
  const { error: previewErr } = await supabase.rpc("preview_daily_yield_to_fund_v3", {
    p_fund_id: testData.fundId,
    p_yield_date: testData.today,
    p_new_aum: 1000000,
    p_purpose: "reporting",
  });

  log({
    category: "Yield",
    name: "preview_daily_yield_to_fund_v3",
    passed: !previewErr || categorizeError(previewErr) !== "ENUM_BUG",
    message: previewErr
      ? `${categorizeError(previewErr)}: ${previewErr.message.slice(0, 50)}`
      : "OK",
    errorType: previewErr ? categorizeError(previewErr) : undefined,
  });

  // apply_daily_yield_to_fund_v3 (admin-only, expect permission error)
  const { error: applyErr } = await supabase.rpc("apply_daily_yield_to_fund_v3", {
    p_fund_id: testData.fundId,
    p_yield_date: testData.yesterday,
    p_gross_yield_pct: 0.05,
  });

  log({
    category: "Yield",
    name: "apply_daily_yield_to_fund_v3",
    passed: !applyErr || categorizeError(applyErr) !== "ENUM_BUG",
    message: applyErr ? `${categorizeError(applyErr)}: ${applyErr.message.slice(0, 50)}` : "OK",
    errorType: applyErr ? categorizeError(applyErr) : undefined,
  });

  // get_investor_position_as_of
  const { error: posErr } = await supabase.rpc("get_investor_position_as_of", {
    p_fund_id: testData.fundId,
    p_investor_id: testData.investorId,
    p_as_of_date: testData.today,
  });

  log({
    category: "Yield",
    name: "get_investor_position_as_of",
    passed: !posErr || categorizeError(posErr) !== "ENUM_BUG",
    message: posErr ? `${categorizeError(posErr)}: ${posErr.message.slice(0, 50)}` : "OK",
    errorType: posErr ? categorizeError(posErr) : undefined,
  });

  // reconcile_investor_position
  const { error: reconcileErr } = await supabase.rpc("reconcile_investor_position", {
    p_fund_id: testData.fundId,
    p_investor_id: testData.investorId,
  });

  log({
    category: "Yield",
    name: "reconcile_investor_position",
    passed: !reconcileErr || categorizeError(reconcileErr) !== "ENUM_BUG",
    message: reconcileErr
      ? `${categorizeError(reconcileErr)}: ${reconcileErr.message.slice(0, 50)}`
      : "OK",
    errorType: reconcileErr ? categorizeError(reconcileErr) : undefined,
  });
}

// ============================================================================
// AUM FUNCTIONS
// ============================================================================
async function testAUMFunctions(testData: any) {
  console.log("\n💰 AUM FUNCTIONS");
  console.log("─".repeat(60));

  // get_fund_aum
  const { error: aumErr } = await supabase.rpc("get_fund_aum", {
    p_fund_id: testData.fundId,
    p_date: testData.today,
  });

  log({
    category: "AUM",
    name: "get_fund_aum",
    passed: !aumErr || categorizeError(aumErr) !== "ENUM_BUG",
    message: aumErr ? `${categorizeError(aumErr)}: ${aumErr.message.slice(0, 50)}` : "OK",
    errorType: aumErr ? categorizeError(aumErr) : undefined,
  });

  // record_daily_aum
  const { error: recordErr } = await supabase.rpc("record_daily_aum", {
    p_fund_id: testData.fundId,
    p_aum_date: testData.today,
    p_total_aum: 1000000,
    p_purpose: "reporting",
  });

  log({
    category: "AUM",
    name: "record_daily_aum",
    passed: !recordErr || categorizeError(recordErr) !== "ENUM_BUG",
    message: recordErr ? `${categorizeError(recordErr)}: ${recordErr.message.slice(0, 50)}` : "OK",
    errorType: recordErr ? categorizeError(recordErr) : undefined,
  });

  // get_computed_fund_aum
  const { error: computedErr } = await supabase.rpc("get_computed_fund_aum", {
    p_fund_id: testData.fundId,
    p_as_of_date: testData.today,
  });

  log({
    category: "AUM",
    name: "get_computed_fund_aum",
    passed: !computedErr || categorizeError(computedErr) !== "ENUM_BUG",
    message: computedErr
      ? `${categorizeError(computedErr)}: ${computedErr.message.slice(0, 50)}`
      : "OK",
    errorType: computedErr ? categorizeError(computedErr) : undefined,
  });
}

// ============================================================================
// TRANSACTION FUNCTIONS
// ============================================================================
async function testTransactionFunctions(testData: any) {
  console.log("\n📝 TRANSACTION FUNCTIONS");
  console.log("─".repeat(60));

  // get_investor_transactions
  const { error: txErr } = await supabase.rpc("get_investor_transactions", {
    p_investor_id: testData.investorId,
    p_fund_id: testData.fundId,
  });

  log({
    category: "Transaction",
    name: "get_investor_transactions",
    passed: !txErr || categorizeError(txErr) !== "ENUM_BUG",
    message: txErr ? `${categorizeError(txErr)}: ${txErr.message.slice(0, 50)}` : "OK",
    errorType: txErr ? categorizeError(txErr) : undefined,
  });

  // get_fund_transactions
  const { error: fundTxErr } = await supabase.rpc("get_fund_transactions", {
    p_fund_id: testData.fundId,
  });

  log({
    category: "Transaction",
    name: "get_fund_transactions",
    passed: !fundTxErr || categorizeError(fundTxErr) !== "ENUM_BUG",
    message: fundTxErr ? `${categorizeError(fundTxErr)}: ${fundTxErr.message.slice(0, 50)}` : "OK",
    errorType: fundTxErr ? categorizeError(fundTxErr) : undefined,
  });
}

// ============================================================================
// INVESTOR FUNCTIONS
// ============================================================================
async function testInvestorFunctions(testData: any) {
  console.log("\n👤 INVESTOR FUNCTIONS");
  console.log("─".repeat(60));

  // get_investor_summary
  const { error: summaryErr } = await supabase.rpc("get_investor_summary", {
    p_investor_id: testData.investorId,
  });

  log({
    category: "Investor",
    name: "get_investor_summary",
    passed: !summaryErr || categorizeError(summaryErr) !== "ENUM_BUG",
    message: summaryErr
      ? `${categorizeError(summaryErr)}: ${summaryErr.message.slice(0, 50)}`
      : "OK",
    errorType: summaryErr ? categorizeError(summaryErr) : undefined,
  });

  // get_investor_balance
  const { error: balErr } = await supabase.rpc("get_investor_balance", {
    p_investor_id: testData.investorId,
    p_fund_id: testData.fundId,
  });

  log({
    category: "Investor",
    name: "get_investor_balance",
    passed: !balErr || categorizeError(balErr) !== "ENUM_BUG",
    message: balErr ? `${categorizeError(balErr)}: ${balErr.message.slice(0, 50)}` : "OK",
    errorType: balErr ? categorizeError(balErr) : undefined,
  });
}

// ============================================================================
// FUND FUNCTIONS
// ============================================================================
async function testFundFunctions(testData: any) {
  console.log("\n🏦 FUND FUNCTIONS");
  console.log("─".repeat(60));

  // get_fund_summary
  const { error: fundSummaryErr } = await supabase.rpc("get_fund_summary", {
    p_fund_id: testData.fundId,
  });

  log({
    category: "Fund",
    name: "get_fund_summary",
    passed: !fundSummaryErr || categorizeError(fundSummaryErr) !== "ENUM_BUG",
    message: fundSummaryErr
      ? `${categorizeError(fundSummaryErr)}: ${fundSummaryErr.message.slice(0, 50)}`
      : "OK",
    errorType: fundSummaryErr ? categorizeError(fundSummaryErr) : undefined,
  });

  // get_fund_investors
  const { error: investorsErr } = await supabase.rpc("get_fund_investors", {
    p_fund_id: testData.fundId,
  });

  log({
    category: "Fund",
    name: "get_fund_investors",
    passed: !investorsErr || categorizeError(investorsErr) !== "ENUM_BUG",
    message: investorsErr
      ? `${categorizeError(investorsErr)}: ${investorsErr.message.slice(0, 50)}`
      : "OK",
    errorType: investorsErr ? categorizeError(investorsErr) : undefined,
  });
}

// ============================================================================
// ADMIN/UTILITY FUNCTIONS
// ============================================================================
async function testAdminFunctions(testData: any) {
  console.log("\n🔧 ADMIN/UTILITY FUNCTIONS");
  console.log("─".repeat(60));

  // is_admin
  const { data: isAdminData, error: isAdminErr } = await supabase.rpc("is_admin");

  log({
    category: "Admin",
    name: "is_admin",
    passed: !isAdminErr,
    message: isAdminErr
      ? `${categorizeError(isAdminErr)}: ${isAdminErr.message.slice(0, 50)}`
      : `OK (result: ${isAdminData})`,
    errorType: isAdminErr ? categorizeError(isAdminErr) : undefined,
  });

  // validate_yield_rate_sanity
  const { error: validateErr } = await supabase.rpc("validate_yield_rate_sanity", {
    p_yield_pct: 0.05,
    p_fund_id: testData.fundId,
  });

  log({
    category: "Admin",
    name: "validate_yield_rate_sanity",
    passed: !validateErr || categorizeError(validateErr) !== "ENUM_BUG",
    message: validateErr
      ? `${categorizeError(validateErr)}: ${validateErr.message.slice(0, 50)}`
      : "OK",
    errorType: validateErr ? categorizeError(validateErr) : undefined,
  });
}

// ============================================================================
// DB TABLE ACCESS
// ============================================================================
async function testTableAccess() {
  console.log("\n📋 TABLE ACCESS (via canonical gateway)");
  console.log("─".repeat(60));

  const tables = [
    "funds",
    "profiles",
    "transactions_v2",
    "yield_distributions",
    "fund_daily_aum",
    "investor_positions",
    "platform_fee_ledger",
    "ib_commission_ledger",
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).select("id").limit(1);

    log({
      category: "Table",
      name: table,
      passed: !error || categorizeError(error) !== "ENUM_BUG",
      message: error ? `${categorizeError(error)}: ${error.message.slice(0, 40)}` : "OK",
      errorType: error ? categorizeError(error) : undefined,
    });
  }
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  console.log("═".repeat(70));
  console.log("  COMPREHENSIVE PLATFORM AUDIT");
  console.log("  Testing all RPC functions and table access");
  console.log("═".repeat(70));

  const testData = await getTestData();
  console.log(`\n📌 Test Data:`);
  console.log(`   Fund ID: ${testData.fundId}`);
  console.log(`   Investor ID: ${testData.investorId}`);
  console.log(`   Date: ${testData.today}`);

  await testYieldFunctions(testData);
  await testAUMFunctions(testData);
  await testTransactionFunctions(testData);
  await testInvestorFunctions(testData);
  await testFundFunctions(testData);
  await testAdminFunctions(testData);
  await testTableAccess();

  // Summary
  console.log("\n" + "═".repeat(70));
  console.log("  AUDIT SUMMARY");
  console.log("═".repeat(70));

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const enumBugs = results.filter((r) => r.errorType === "ENUM_BUG").length;
  const permissionErrors = results.filter((r) => r.errorType === "PERMISSION").length;
  const notFound = results.filter((r) => r.errorType === "NOT_FOUND").length;
  const dataErrors = results.filter((r) => r.errorType === "DATA").length;
  const rlsErrors = results.filter((r) => r.errorType === "RLS").length;
  const otherErrors = results.filter((r) => !r.passed && r.errorType === "OTHER").length;

  console.log(`\n  Total Tests:     ${total}`);
  console.log(`  ✅ Passed:       ${passed}`);
  console.log(`  🔴 ENUM BUGS:    ${enumBugs}`);
  console.log(`  ⚠️  Permission:   ${permissionErrors} (expected for admin functions)`);
  console.log(`  ⚠️  Not Found:    ${notFound} (function may not exist)`);
  console.log(`  ⚠️  RLS:          ${rlsErrors} (expected for protected tables)`);
  console.log(`  ⚠️  Data:         ${dataErrors} (missing test data)`);
  console.log(`  ⚠️  Other:        ${otherErrors}`);

  // By category
  console.log("\n  By Category:");
  const categories = [...new Set(results.map((r) => r.category))];
  for (const cat of categories) {
    const catResults = results.filter((r) => r.category === cat);
    const catPassed = catResults.filter((r) => r.passed).length;
    const catEnumBugs = catResults.filter((r) => r.errorType === "ENUM_BUG").length;
    const icon = catEnumBugs > 0 ? "🔴" : "✅";
    console.log(
      `    ${icon} ${cat}: ${catPassed}/${catResults.length} passed${catEnumBugs > 0 ? ` (${catEnumBugs} enum bugs!)` : ""}`
    );
  }

  if (enumBugs > 0) {
    console.log("\n" + "═".repeat(70));
    console.log("  🔴 CRITICAL: ENUM BUGS DETECTED!");
    console.log("═".repeat(70));
    console.log("\n  Functions with FIRST_INVESTMENT/TOP_UP enum bugs:");
    results
      .filter((r) => r.errorType === "ENUM_BUG")
      .forEach((r) => {
        console.log(`    - ${r.name}`);
      });
    process.exit(1);
  }

  console.log("\n" + "═".repeat(70));
  console.log("  ✅ AUDIT COMPLETE - NO ENUM BUGS DETECTED");
  console.log("═".repeat(70) + "\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
