import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("❌ Missing .env credentials (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, ANON_KEY);

const SIMULATION_MONTHS = 3;
const START_DATE = new Date("2025-10-01");
const INVESTOR_PROFILES = [
  { name: "Saver", behavior: "hold", base: 100000 },
  { name: "Trader", behavior: "churn", base: 50000 },
  { name: "Whale", behavior: "hold", base: 1000000 },
  { name: "Leaker", behavior: "withdraw", base: 200000 },
  { name: "DCA", behavior: "deposit", base: 10000 },
];

async function runSimulation() {
  console.log("🚀 Starting Exhaustive Economy Simulation (User Mode)...");

  // 1. Authenticate as Admin
  const { data: auth, error: loginError } = await supabase.auth.signInWithPassword({
    email: "H.monoja@gmail.com",
    password: "TestAdmin2026!",
  });

  if (loginError || !auth.user) {
    console.error("❌ Admin Login Failed:", loginError?.message);
    process.exit(1);
  }

  console.log(`✅ Authenticated as Admin: ${auth.user.email} (${auth.user.id})`);
  const actorId = auth.user.id;

  // Create Fund
  const fundCode = `SIM-${Date.now().toString().slice(-6)}`;
  let fund;
  try {
    const { data, error } = await supabase
      .from("funds")
      .insert({
        name: `Simulation Fund ${fundCode}`,
        code: fundCode,
        asset: `SIM${Date.now().toString().slice(-4)}`,
        status: "active",
        fund_class: "liquid",
      })
      .select()
      .single();

    if (error) {
      console.error("Fund Create Error:", error);
      throw error;
    }
    fund = data;
  } catch (e) {
    console.error("Fund Creation Crash:", e);
    process.exit(1);
  }

  console.log(`✅ Created Fund: ${fund.name} (${fund.id})`);

  // Create Investors
  // Use Existing Investors (Service Role req for creation)
  const existingEmails = [
    "cfo-verify-1@indigo.fund",
    "cfo-verify-2@indigo.fund",
    "mid-month-investor@indigo.fund",
  ];

  // Supplement with any found profiles if needed
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, first_name")
    .limit(5);

  const investors = [];
  let pIdx = 0;

  for (const p of profiles || []) {
    if (pIdx >= INVESTOR_PROFILES.length) break;
    const profileDef = INVESTOR_PROFILES[pIdx];
    investors.push({
      ...profileDef,
      id: p.id,
      name: p.first_name || profileDef.name,
      email: p.email,
    });
    console.log(`   👤 Loaded Investor: ${p.email} as ${profileDef.name}`);
    pIdx++;
  }

  // 2. Time Loop
  const currentDate = new Date(START_DATE);
  const endDate = new Date(START_DATE);
  endDate.setMonth(endDate.getMonth() + SIMULATION_MONTHS);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const isMonthEnd =
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() ===
      currentDate.getDate();

    // console.log(`📅 Simulating Day: ${dateStr}`);

    // Random Transactions
    for (const inv of investors) {
      if (Math.random() > 0.8 || dateStr === START_DATE.toISOString().split("T")[0]) {
        // 20% chance of activity or Day 1
        let type = "";
        let amount = 0;

        if (dateStr === START_DATE.toISOString().split("T")[0]) {
          type = "DEPOSIT";
          amount = inv.base;
        } else {
          // Behavior Logic
          if (inv.behavior === "churn") {
            type = Math.random() > 0.5 ? "DEPOSIT" : "WITHDRAWAL";
            amount = Math.floor(Math.random() * 5000) + 100;
          } else if (inv.behavior === "withdraw") {
            type = "WITHDRAWAL";
            amount = Math.floor(Math.random() * 2000) + 100;
          } else if (inv.behavior === "deposit") {
            type = "DEPOSIT";
            amount = 1000;
          }
        }

        if (type) {
          const { error } = await supabase.rpc("apply_transaction_with_crystallization", {
            p_investor_id: inv.id,
            p_fund_id: fund.id,
            p_tx_type: type,
            p_amount: amount,
            p_tx_date: dateStr,
            p_reference_id: `sim-${dateStr}-${inv.id}-${Date.now()}`,
            p_admin_id: actorId,
            p_purpose: "transaction",
          });
          if (error && !error.message.includes("insufficient")) {
            // Ignore NSF
            console.error(`❌ Tx Error ${inv.name} ${type}:`, error.message);
          }
        }
      }
    }

    // Month End Yield
    if (isMonthEnd) {
      console.log(`💰 Generating Yield for ${dateStr}...`);

      // Simulating 5% APY roughly -> 0.4% Monthly
      const yieldAmount = 5000; // Flat amount for simplicity in verification

      try {
        const { data, error } = await supabase.rpc("apply_adb_yield_distribution_v3", {
          p_fund_id: fund.id,
          p_period_start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
            .toISOString()
            .split("T")[0],
          p_period_end: dateStr,
          p_gross_yield_amount: yieldAmount,
          p_admin_id: actorId,
          p_purpose: "transaction", // Use transaction purpose for real effect
        });

        if (error) console.error("❌ Yield Error:", error.message);
        else console.log("   ✅ Yield Distributed:", data?.distribution_id);
      } catch (e) {
        console.error("Yield Exception", e);
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // 3. Final Verification
  console.log("🔍 Running Post-Simulation Conservation Checks...");

  const { data: checks } = await supabase
    .from("v_yield_conservation_violations")
    .select("*")
    .eq("fund_id", fund.id);

  if (checks && checks.length > 0) {
    console.error("❌ CONSERVATION VIOLATIONS FOUND:", checks);
  } else {
    console.log("✅ ALL YIELD DISTRIBUTIONS CONSERVED MATERIALLY.");
  }

  const { data: mismatches } = await supabase
    .from("v_aum_position_mismatch")
    .select("*")
    .eq("fund_id", fund.id);
  if (mismatches && mismatches.length > 0 && mismatches[0].has_mismatch) {
    console.error("❌ AUM MISMATCH DETECTED:", mismatches);
  } else {
    console.log("✅ AUM == SUM(POSITIONS) CONFIRMED.");
  }
}

runSimulation();
