import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface TestResult {
  category: string;
  operation: string;
  status: "PASS" | "FAIL";
  details: string;
  timestamp: string;
}

const results: TestResult[] = [];

function log(category: string, operation: string, status: "PASS" | "FAIL", details: string) {
  const result = { category, operation, status, details, timestamp: new Date().toISOString() };
  results.push(result);
  console.log(`${status === "PASS" ? "✅" : "❌"} [${category}] ${operation}: ${details}`);
}

async function runExpertVerification() {
  console.log("🔬 EXPERT PLATFORM OPERATIONS VERIFICATION");
  console.log("=".repeat(60));

  // 1. Authenticate Admin
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "testadmin@indigo.fund",
    password: "Indigo!Admin2026#Secure",
  });

  if (authError || !authData.session) {
    log("AUTH", "Admin Login", "FAIL", authError?.message || "No session");
    throw new Error("Admin authentication failed");
  }
  log("AUTH", "Admin Login", "PASS", `Authenticated as ${authData.user.email}`);

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${authData.session.access_token}` } },
  });

  // =========== PHASE 2A: INVESTOR MANAGEMENT ===========
  console.log("\n📋 PHASE 2A: Investor Management");

  // List investors
  const { data: investors, error: invError } = await adminClient
    .from("profiles")
    .select("id, email, status, account_type")
    .limit(10);
  if (invError) {
    log("INVESTOR", "List Investors", "FAIL", invError.message);
  } else {
    log("INVESTOR", "List Investors", "PASS", `Found ${investors?.length || 0} investors`);
  }

  // =========== PHASE 2B: FUND MANAGEMENT ===========
  console.log("\n📊 PHASE 2B: Fund Management");

  const { data: funds, error: fundError } = await adminClient
    .from("funds")
    .select("id, asset, code, status");
  if (fundError) {
    log("FUND", "List Funds", "FAIL", fundError.message);
  } else {
    log(
      "FUND",
      "List Funds",
      "PASS",
      `Found ${funds?.length || 0} funds: ${funds?.map((f) => f.asset).join(", ")}`
    );
  }

  const testFundId = funds?.[0]?.id;
  const testInvestorId = investors?.[0]?.id;

  if (!testFundId || !testInvestorId) {
    log("SETUP", "Test Data", "FAIL", "Missing fund or investor for testing");
    return;
  }

  // =========== PHASE 2C: TRANSACTION OPERATIONS ===========
  console.log("\n💸 PHASE 2C: Transaction Operations");
  const today = new Date().toISOString().split("T")[0];
  const uniqueRef = `expert-test-${Date.now()}`;

  // Test Deposit
  const { data: depResult, error: depError } = await adminClient.rpc(
    "apply_deposit_with_crystallization",
    {
      p_fund_id: testFundId,
      p_investor_id: testInvestorId,
      p_amount: 100,
      p_new_total_aum: 1000000,
      p_tx_date: today,
      p_admin_id: authData.user.id,
      p_notes: `Expert Test Deposit - ${uniqueRef}`,
      p_purpose: "transaction",
    }
  );
  if (depError) {
    log("TRANSACTION", "Deposit", "FAIL", depError.message);
  } else {
    log("TRANSACTION", "Deposit", "PASS", `Deposit executed for investor ${testInvestorId}`);
  }

  // Test Yield Application - Using correct signature: (p_fund_id, p_yield_date, p_gross_yield_pct, p_created_by, p_purpose)
  const { data: yieldResult, error: yieldError } = await adminClient.rpc(
    "apply_daily_yield_to_fund_v3",
    {
      p_fund_id: testFundId,
      p_yield_date: today,
      p_gross_yield_pct: 0.1, // 0.1% daily yield
      p_created_by: authData.user.id,
      p_purpose: "transaction",
    }
  );
  if (yieldError) {
    log("TRANSACTION", "Yield Distribution", "FAIL", yieldError.message);
  } else {
    log("TRANSACTION", "Yield Distribution", "PASS", `Yield applied to fund ${testFundId}`);
  }

  // =========== PHASE 3: FINANCIAL CALCULATIONS ===========
  console.log("\n🧮 PHASE 3: Financial Calculations");

  // Verify position updated correctly
  const { data: positions, error: posError } = await adminClient
    .from("investor_positions")
    .select("current_value, cost_basis, shares")
    .eq("fund_id", testFundId)
    .eq("investor_id", testInvestorId)
    .limit(1);

  if (posError) {
    log("CALCULATION", "Position Check", "FAIL", posError.message);
  } else if (!positions || positions.length === 0) {
    log("CALCULATION", "Position Check", "FAIL", "No position found");
  } else {
    log("CALCULATION", "Position Check", "PASS", `Position value: ${positions[0]?.current_value}`);
  }

  // =========== PHASE 4: BACKEND INTEGRITY ===========
  console.log("\n🔒 PHASE 4: Backend Integrity");

  // AUM Reconciliation
  const { data: reconResult, error: reconError } = await adminClient.rpc(
    "check_aum_reconciliation",
    {
      p_fund_id: testFundId,
    }
  );
  if (reconError) {
    log("INTEGRITY", "AUM Reconciliation", "FAIL", reconError.message);
  } else {
    const reconStr =
      typeof reconResult === "object" ? JSON.stringify(reconResult) : String(reconResult);
    log("INTEGRITY", "AUM Reconciliation", reconStr.includes("OK") ? "PASS" : "FAIL", reconStr);
  }

  // Check integrity views
  const { data: mismatch, error: mismatchError } = await adminClient
    .from("v_aum_position_mismatch")
    .select("*")
    .limit(5);

  if (mismatchError) {
    log("INTEGRITY", "Position Mismatch View", "FAIL", mismatchError.message);
  } else {
    log(
      "INTEGRITY",
      "Position Mismatch View",
      (mismatch?.length || 0) === 0 ? "PASS" : "FAIL",
      `${mismatch?.length || 0} discrepancies found`
    );
  }

  // =========== SUMMARY ===========
  console.log("\n" + "=".repeat(60));
  console.log("📊 EXPERT VERIFICATION SUMMARY");
  console.log("=".repeat(60));

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;

  console.log(`✅ PASSED: ${passed}`);
  console.log(`❌ FAILED: ${failed}`);
  console.log(`📈 SUCCESS RATE: ${((passed / results.length) * 100).toFixed(1)}%`);

  // Save results
  const artifactsDir = path.resolve(__dirname, "../artifacts");
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactsDir, "expert-test-results.json"),
    JSON.stringify(results, null, 2)
  );

  console.log("\n📁 Results saved to artifacts/expert-test-results.json");

  return { passed, failed, total: results.length, results };
}

runExpertVerification().catch(console.error);
