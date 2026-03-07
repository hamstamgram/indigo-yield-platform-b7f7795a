import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env", override: true });

const SUPABASE_URL = "http://127.0.0.1:54321";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) throw new Error("Missing SERVICE_KEY");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function runMathCheck() {
    console.log("=== STARTING MATHEMATICAL ENGINE VERIFICATION (SOL SCENARIO) ===\n");

    // 1. Fetch exact UUIDs from local DB
    const { data: lpUser, error: e1 } = await supabase.from("profiles").select("id").eq("email", "indigo.lp@test.com").single();
    const { data: paulUser, error: e2 } = await supabase.from("profiles").select("id").eq("email", "paul@test.com").single();
    const { data: alexUser, error: e3 } = await supabase.from("profiles").select("id").eq("email", "alex@test.com").single();
    const { data: feesUser, error: e4 } = await supabase.from("profiles").select("id").eq("email", "fees@indigo.fund").single();
    const { data: fund, error: e5 } = await supabase.from("funds").select("id").eq("name", "Solana Yield Fund").single();

    if (!lpUser || !paulUser || !alexUser || !feesUser || !fund) {
        console.error("Missing data from DB:");
        console.error("LP error:", e1, "User:", lpUser);
        console.error("Paul error:", e2, "User:", paulUser);
        console.error("Alex error:", e3, "User:", alexUser);
        console.error("Fees error:", e4, "User:", feesUser);
        console.error("Fund error:", e5, "Fund:", fund);
        return;
    }

    // 2. Allow Direct Manipulations
    const { error: execErr } = await supabase.rpc("exec_sql", { sql: "SELECT set_config('indigo.canonical_rpc', 'true', true);" });
    if (execErr) console.log("Note: exec_sql failed, which is expected if not deployed:", execErr.message);

    // Clean previous transactions in this fund just in case
    await supabase.from("transactions_v2").delete().eq("fund_id", fund.id);

    console.log("-> 1. Action: INDIGO LP Deposits +1250 SOL (02/09/2025, Fee 0%)");
    // Set Investor LP fee to 0% (if not already)
    await supabase.from("investor_fund_fees").upsert({
        investor_id: lpUser.id,
        fund_id: fund.id,
        performance_fee_pct: 0
    });

    const { error: dErr1 } = await supabase.from("transactions_v2").insert({
        type: "DEPOSIT",
        fund_id: fund.id,
        investor_id: lpUser.id,
        amount: 1250,
        asset: "SOL",
        fund_class: "Yield",
        tx_date: "2025-09-02",
        source: "migration"
    });
    if (dErr1) console.error("Deposit 1 Error:", dErr1.message);

    console.log("-> 2. Yield Preview: 1252 SOL (04/09/2025)");
    const { data: preview1, error: err1 } = await supabase.rpc("preview_segmented_yield_distribution_v5", {
        p_fund_id: fund.id,
        p_period_end: "2025-09-04",
        p_recorded_aum: 1252,
        p_purpose: "transaction"
    });

    if (err1) console.error("Preview 1 Error:", err1.message);
    console.log("Preview 1 Response (Expected: LP +2):");
    if (preview1) {
        preview1.allocations.forEach((a) => {
            console.log(`  - Investor ID ${a.investor_id}: Net Yield = ${a.net_yield}, IB = ${a.ib_commission}, Fees = ${a.fund_fees}`);
        });
    }

    console.log("\n-> Applying Yield 1");
    await supabase.rpc("apply_segmented_yield_distribution_v5", {
        p_fund_id: fund.id,
        p_period_end: "2025-09-04",
        p_recorded_aum: 1252,
        p_purpose: "transaction",
        p_admin_id: lpUser.id // mock admin
    });

    console.log("\n-> 3. Action: Paul Johnson Deposits +234.17 SOL (04/09/2025) (Fee 16%, IB Alex Jacobs 4%)");
    await supabase.from("investor_fund_fees").upsert({
        investor_id: paulUser.id,
        fund_id: fund.id,
        performance_fee_pct: 13.5
    });

    await supabase.from("ib_commission_schedule").insert({
        investor_id: paulUser.id,
        fund_id: fund.id,
        ib_user_id: alexUser.id,
        commission_pct: 1.5,
        effective_from: "2025-09-04"
    });

    const { error: dErr2 } = await supabase.from("transactions_v2").insert({
        type: "DEPOSIT",
        fund_id: fund.id,
        investor_id: paulUser.id,
        amount: 234.17,
        asset: "SOL",
        fund_class: "Yield",
        tx_date: "2025-09-04",
        source: "migration"
    });
    if (dErr2) console.error("Deposit 2 Error:", dErr2.message);

    console.log("-> 4. Yield Preview: 1500 SOL (30/09/2025)");
    const { data: preview2, error: err2 } = await supabase.rpc("preview_segmented_yield_distribution_v5", {
        p_fund_id: fund.id,
        p_period_end: "2025-09-30",
        p_recorded_aum: 1500,
        p_purpose: "reporting"
    });

    if (err2) console.error("Preview 2 Error:", err2.message);

    console.log("RAW ALLOCATIONS DUMP:");
    console.log(JSON.stringify(preview2.allocations, null, 2));

    console.log("\n--- FINAL BENCHMARK ASSERTS (30/09/2025) ---");
    console.log("Expected INDIGO LP : +11.65 SOL");
    console.log("Expected Paul Johnson : +1.85 SOL");
    console.log("Expected Alex Jacobs : +0.0327 SOL");
    console.log("Expected INDIGO Fees : +0.2942 SOL\n");

    console.log("ACTUAL ENGINE CALCULATION:");
    if (preview2) {
        preview2.allocations.forEach((a) => {
            let name = "Unknown";
            if (a.investor_id === lpUser.id) name = "INDIGO LP";
            if (a.investor_id === paulUser.id) name = "Paul Johnson";
            if (a.investor_id === feesUser.id) name = "INDIGO Fees";

            console.log(`- ${name}: Net Yield = ${a.net_yield.toFixed(4)}`);

            if (a.ib_commission > 0) {
                console.log(`   └─ IB (Alex Jacobs): +${a.ib_commission.toFixed(4)}`);
            }
            if (a.fund_fees > 0) {
                console.log(`   └─ Fees: +${a.fund_fees.toFixed(4)}`);
            }
        });

        console.log(`\nEngine Total Gross Yield Calculated: ${preview2.gross_yield.toFixed(4)}`);
        console.log(`Engine Total Net Yield: ${preview2.net_yield.toFixed(4)}`);
        console.log(`Engine Total IB Commission: ${preview2.total_ib.toFixed(4)}`);
        console.log(`Engine Total Fund Fees: ${preview2.total_fees.toFixed(4)}`);
    }
}

runMathCheck().catch(console.error);
