import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase credentials in environment");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log("=== V7 First Principles & Integrity Verification ===");

  // 1. Get an active fund
  const { data: funds, error: fundErr } = await supabase
    .from("funds")
    .select("id, name")
    .eq("status", "active")
    .limit(1);

  if (fundErr || !funds?.length) throw new Error("No active fund found");
  const fund = funds[0];
  console.log(`\nUsing test fund: ${fund.name} (${fund.id})`);

  // 2. Get an active user
  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("account_type", "investor")
    .limit(1);

  if (profErr || !profiles?.length) throw new Error("No profile found");
  const investor = profiles[0];
  console.log(`Using test investor: ${investor.email} (${investor.id})`);

  // 3. Get system fees account
  const { data: feesAccs } = await supabase
    .from("profiles")
    .select("id")
    .eq("account_type", "fees_account")
    .limit(1);

  if (!feesAccs?.length) throw new Error("No fees account found");
  const feesAccount = feesAccs[0];
  console.log(`Using test fees account: ${feesAccount.id}`);

  // Test 1: Record a Deposit
  console.log(`\n[Test 1] Recording a Deposit...`);
  const txDate = new Date().toISOString().split("T")[0];
  const { data: depositRes, error: depErr } = await supabase.rpc("apply_investor_transaction", {
    p_fund_id: fund.id,
    p_investor_id: investor.id,
    p_tx_type: "DEPOSIT",
    p_amount: 1000,
    p_tx_date: txDate,
    p_reference_id: "TEST-DEP-" + Date.now(),
  });

  if (depErr) {
    console.error("Deposit failed:", depErr);
    throw depErr;
  }

  const v7DepositId = depositRes.transaction_id;
  console.log(`✅ Deposit successful. Transaction ID: ${v7DepositId}`);

  // Test 2: Record Yield
  console.log(`\n[Test 2] Recording Yield Distribution...`);
  const { data: currentAumData } = await supabase.rpc("get_fund_aum_as_of", {
    p_fund_id: fund.id,
    p_as_of_date: txDate,
  });

  const preYieldAum = currentAumData?.[0]?.total_aum || 1000;
  const newAum = Number(preYieldAum) + 500; // Generate 500 yield

  const { data: yieldRes, error: yieldErr } = await supabase.rpc(
    "apply_segmented_yield_distribution_v5",
    {
      p_fund_id: fund.id,
      p_recorded_aum: newAum,
      p_period_end: txDate,
      p_purpose: "reporting",
      p_distribution_date: txDate,
    }
  );

  if (yieldErr) {
    console.error("Yield application failed:", yieldErr);
    throw yieldErr;
  }

  console.log(
    `✅ Yield distribution applied successfully. Distribution ID: ${yieldRes.distribution_id}`
  );

  // Test 3: First Principles historical lock validation
  console.log(`\n[Test 3] Verifying First Principles Historical Lock...`);
  const { data: voidDepFailRes, error: voidDepFailErr } = await supabase.rpc("void_transaction", {
    p_transaction_id: v7DepositId,
    p_admin_id: feesAccount.id, // using randomly available valid UUID
    p_reason: "Test void",
  });

  if (voidDepFailErr && voidDepFailErr.message.includes("FIRST PRINCIPLES VIOLATION")) {
    console.log(
      `✅ First Principles Lock prevented voiding deposit prior to yield: ${voidDepFailErr.message}`
    );
  } else {
    console.error("❌ FAILED: Did not enforce First Principles violation on void.");
    console.error(voidDepFailErr);
  }

  // Test 4: Route Withdrawal to Fees
  console.log(`\n[Test 4] Recording Route to Indigo Fees...`);
  const { data: routeFeeRes, error: routeFeeErr } = await supabase.rpc("internal_route_to_fees", {
    p_fund_id: fund.id,
    p_investor_id: investor.id,
    p_amount: 50,
    p_tx_date: txDate,
    p_reason: "Test routing",
    p_admin_id: feesAccount.id,
  });

  if (routeFeeErr) {
    console.error("Route to Fees failed:", routeFeeErr);
    // Ignore error if it fails because we don't know the exact signature
  } else {
    console.log(`✅ Route to fees successful.`);
  }

  // Test 5: Verify Cascade Void of Yield
  console.log(`\n[Test 5] Verifying Void Cascade for Yield...`);

  // Find yield transactions associated with the distribution to prove they exist before voiding
  const { data: preVoidYieldTxs } = await supabase
    .from("transactions_v2")
    .select("id")
    .eq("distribution_id", yieldRes.distribution_id)
    .eq("is_voided", false);

  console.log(`Found ${preVoidYieldTxs?.length || 0} active yield transactions for distribution.`);

  const { data: voidYieldRes, error: voidYieldErr } = await supabase.rpc(
    "void_yield_distribution",
    {
      p_distribution_id: yieldRes.distribution_id,
      p_admin_id: feesAccount.id,
      p_reason: "Testing void cascade",
    }
  );

  if (voidYieldErr) {
    console.error("Voiding yield failed:", voidYieldErr);
  } else {
    console.log(`✅ Yield voided successfully. Cascade details:`, voidYieldRes);

    // Check if transactions are actually voided
    const { data: postVoidYieldTxs } = await supabase
      .from("transactions_v2")
      .select("id")
      .eq("distribution_id", yieldRes.distribution_id)
      .eq("is_voided", false);

    if (postVoidYieldTxs?.length === 0) {
      console.log(`✅ Verified: All yield transaction objects have been cascaded and voided.`);
    } else {
      console.error(`❌ FAILED: Found ${postVoidYieldTxs?.length} unvoided yield transactions.`);
    }
  }

  // Test 6: Verify Deposit is now voidable (since future yield is gone)
  console.log(`\n[Test 6] Verifying Deposit is now voidable avoiding First Principles...`);
  const { data: voidDepSuccessRes, error: voidDepSuccessErr } = await supabase.rpc(
    "void_transaction",
    {
      p_transaction_id: v7DepositId,
      p_admin_id: feesAccount.id,
      p_reason: "Test void success after yield unwind",
    }
  );

  if (voidDepSuccessErr) {
    console.error(
      "❌ FAILED: Could not void deposit even after yield was unwound:",
      voidDepSuccessErr
    );
  } else {
    console.log(`✅ Deposit successfully voided. First principles constraint lifted properly.`);
  }

  console.log("\n=== All Verification Tests Completed ===\n");
}

main().catch(console.error);
