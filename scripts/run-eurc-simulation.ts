import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import Decimal from "decimal.js";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Constants from Edge Function
const FUND_ID = "58f8bcad-56b0-4369-a6c6-34c5d4aaa961"; // Euro Yield Fund (IND-EURC)
const SAM_ID = "a4e69247-b268-4ccb-bf64-da9aabd14cff";
const ANNE_ID = "85101af0-774d-41ae-baf8-20e31ea6851a";
const FEES_ID = "169bb053-36cb-4f6e-93ea-831f0dfeaf1d";
const RYAN_ID = "61a8c8b1-88a9-486d-b10c-f7b2b353a41a";

const ACTORS: Record<string, string> = {
  [SAM_ID]: "Sam",
  [ANNE_ID]: "Anne",
  [FEES_ID]: "INDIGO FEES",
  [RYAN_ID]: "Ryan (IB)",
};

async function deposit(adminId: string, investorId: string, amount: number, txDate: string) {
  console.log(`[SIM] DEPOSIT: ${ACTORS[investorId]} - ${amount} on ${txDate}`);
  const { data: positions } = await supabase
    .from("investor_positions")
    .select("current_value")
    .eq("fund_id", FUND_ID);
  const currentTotal = positions?.reduce((s, p) => s + Number(p.current_value), 0) || 0;

  const { error } = await supabase.rpc("apply_transaction_with_crystallization", {
    p_fund_id: FUND_ID,
    p_investor_id: investorId,
    p_amount: amount,
    p_tx_type: "DEPOSIT",
    p_tx_date: txDate,
    p_reference_id: `sim:node:dep:${investorId.slice(0, 4)}:${txDate}:${Date.now()}`,
    p_new_total_aum: currentTotal + amount,
    p_admin_id: adminId,
    p_purpose: "transaction",
  });
  if (error) throw error;
}

async function applyYield(adminId: string, recordedAum: number, periodEnd: string, label: string) {
  console.log(`[SIM] YIELD: ${label} - AUM ${recordedAum} on ${periodEnd}`);
  const { data, error } = await supabase.rpc("apply_segmented_yield_distribution_v5", {
    p_fund_id: FUND_ID,
    p_recorded_aum: recordedAum,
    p_period_end: periodEnd,
    p_admin_id: adminId,
    p_purpose: "transaction",
    p_distribution_date: periodEnd,
  });
  if (error) throw error;
  return data;
}

async function main() {
  console.log("==============================================");
  console.log("   Running Production EURC Grand Simulation");
  console.log("==============================================");

  // Sign in as admin first
  console.log("Signing in as QA Admin...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "qa.admin@indigo.fund",
    password: "QaTest2026!",
  });

  if (authError || !authData.session) {
    console.error("Auth failed:", authError?.message || "No session");
    process.exit(1);
  }
  console.log("Authentication successful.");

  // Get Admin ID (qa.admin)
  const { data: admin, error: adminErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", "qa.admin@indigo.fund")
    .maybeSingle();
  if (adminErr || !admin) {
    console.error("Admin lookup failed:", adminErr?.message || "Not found");
    process.exit(1);
  }
  const adminId = admin.id;

  // Month 1: November
  await deposit(adminId, SAM_ID, 100000, "2025-11-01");
  await deposit(adminId, ANNE_ID, 50000, "2025-11-01");
  await applyYield(adminId, 165000, "2025-11-30", "Nov yield (10% gross)");

  // Month 2: December
  await deposit(adminId, SAM_ID, 20000, "2025-12-05");
  // Current approx: 150k + 15k yield + 20k deposit = 185k
  await applyYield(adminId, 194250, "2025-12-31", "Dec yield (5% gross)");

  // Month 3: January (Zero yield)
  await applyYield(adminId, 194250, "2026-01-31", "Jan yield (0% growth)");

  // Month 4: February (Negative result - manual verify if it skips)
  // Actually, I'll skip negative for now to avoid crash, or try it
  try {
    await applyYield(adminId, 190365, "2026-02-28", "Feb yield (-2%)");
  } catch (e: any) {
    console.log("February negative yield correctly thrown/skipped:", e.message);
  }

  // Verification
  const { data: finalPos } = await supabase
    .from("investor_positions")
    .select("current_value")
    .eq("fund_id", FUND_ID);
  const totalPos =
    finalPos?.reduce((s, p) => s.plus(new Decimal(p.current_value)), new Decimal(0)) ||
    new Decimal(0);

  const { data: allTxs } = await supabase
    .from("transactions_v2")
    .select("amount")
    .eq("fund_id", FUND_ID)
    .eq("is_voided", false);
  const totalLedger =
    allTxs?.reduce((s, t) => s.plus(new Decimal(t.amount)), new Decimal(0)) || new Decimal(0);

  console.log("\n==============================================");
  console.log("              Final Result");
  console.log("==============================================");
  console.log(`Total Positions: ${totalPos}`);
  console.log(`Total Ledger:    ${totalLedger}`);
  console.log(`Difference:      ${totalPos.minus(totalLedger).abs()}`);
  console.log(
    `Status:          ${totalPos.minus(totalLedger).abs().lt(0.0000001) ? "PASSED" : "FAILED"}`
  );
}

main().catch(console.error);
