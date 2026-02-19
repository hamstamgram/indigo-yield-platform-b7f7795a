import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { runGrandSimulation } from "../tests/qa/scenarios/grand-simulation";
import { ReferenceModel } from "../tests/qa/scenarios/reference-model";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("==============================================");
  console.log("      Grand Simulation Execution Wrapper");
  console.log("==============================================");

  // 1. Identify common entities
  console.log("Identifying entities...");

  const testWorld = {
    adminId: "",
    fundId: "",
    investorId: "",
    ibUserId: "",
    btcFundId: "",
    assetId: "",
  };

  // Find QA admin
  console.log("Attempting to sign in as QA Admin...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "qa.admin@indigo.fund",
    password: "QaTest2026!",
  });

  if (authError || !authData.user) {
    console.warn("Failed to sign in as QA Admin:", authError?.message);
    console.log("Searching for any admin without login (will fail if RLS is strict)...");

    const { data: anyAdmin } = await supabase
      .from("profiles")
      .select("id")
      .eq("is_admin", true)
      .limit(1)
      .maybeSingle();

    if (!anyAdmin) {
      console.error("No admin found. Simulation cannot run.");
      process.exit(1);
    }
    testWorld.adminId = anyAdmin.id;
  } else {
    testWorld.adminId = authData.user.id;
    console.log("Successfully signed in as QA Admin.");
  }
  console.log(`Using Admin ID: ${testWorld.adminId}`);

  // Ensure XRP fund exists
  console.log("Finding/Creating XRP fund...");
  const { data: existingFund } = await supabase
    .from("funds")
    .select("id")
    .eq("code", "IND-XRP")
    .maybeSingle();

  if (existingFund) {
    testWorld.fundId = existingFund.id;
    console.log(`Using existing XRP Fund: ${testWorld.fundId}`);
  } else {
    console.log("XRP Fund (IND-XRP) not found. Creating it...");
    const { data: newFund, error: fundError } = await supabase
      .from("funds")
      .insert({
        code: "IND-XRP",
        name: "Ripple Yield Fund",
        asset: "XRP",
        fund_class: "XRP",
        status: "active",
        inception_date: "2025-11-01",
        mgmt_fee_bps: 0,
        perf_fee_bps: 2000,
        min_investment: 0,
      })
      .select("id")
      .single();

    if (fundError || !newFund) {
      console.error("Failed to create XRP Fund:", fundError?.message);
      process.exit(1);
    }
    testWorld.fundId = newFund.id;
    console.log(`Created XRP Fund ID: ${testWorld.fundId}`);
  }

  // Ensure investors exist (Sam and Investor B)
  const investors = [
    {
      email: "qa-early-depositor@test.indigo.fund",
      password: "QaTest2026!",
      fallbackId: "3274cdf5-f707-4f0b-b026-66e684180996",
    },
    {
      email: "qa-mid-month-dep@test.indigo.fund",
      password: "QaTest2026!",
      fallbackId: "5cf9484a-b9c3-47ce-87ac-ee0093d65a7f",
    },
  ];

  // 2. Run simulation
  const ctx = {
    supabase,
    referenceModel: new ReferenceModel(),
    testWorld,
  };

  const result = await runGrandSimulation(ctx as any);

  console.log("\n==============================================");
  console.log("              Simulation Result");
  console.log("==============================================");
  console.log(`Status: ${result.passed ? "PASSED" : "FAILED"}`);
  console.log(`Description: ${result.description}`);
  console.log(`Details: ${result.details}`);

  // 3. Generate Transaction Ledger Log
  console.log("\nGenerating Transaction Ledger Log...");

  const { data: txs, error: txError } = await supabase
    .from("transactions_v2")
    .select("tx_date, investor_id, type, amount, profiles!fk_transactions_v2_investor(email)")
    .eq("fund_id", testWorld.fundId)
    .order("tx_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (txError) {
    console.error("Error fetching transactions for log:", txError);
  } else {
    console.log("\n### Transaction Ledger Log\n");
    console.log("| Date | Investor | Type | Amount |");
    console.log("| :--- | :--- | :--- | :--- |");
    txs?.forEach((tx) => {
      const email = (tx.profiles as any)?.email || tx.investor_id;
      console.log(`| ${tx.tx_date} | ${email} | ${tx.type} | ${tx.amount} |`);
    });
  }
}

main().catch(console.error);
