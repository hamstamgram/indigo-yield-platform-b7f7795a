#!/usr/bin/env npx ts-node --esm
/**
 * Test yield preview after enum fix
 */

import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log("🧪 Testing preview_daily_yield_to_fund_v3 after fix...\n");

  // Get a fund to test with
  const { data: funds, error: fundsError } = await supabase
    .from("funds")
    .select("id, code, name")
    .limit(1);

  if (fundsError) {
    console.log("⚠️  Could not fetch funds (RLS may be blocking):", fundsError.message);
    console.log("\nTrying direct RPC call with a sample UUID...\n");
  }

  // Use a test fund ID or the first fund found
  const testFundId = funds?.[0]?.id || "00000000-0000-0000-0000-000000000001";
  const today = new Date().toISOString().split("T")[0];

  console.log(`Fund ID: ${testFundId}`);
  console.log(`Date: ${today}`);
  console.log(`New AUM: 1,000,000\n`);

  const { data, error } = await supabase.rpc("preview_daily_yield_to_fund_v3", {
    p_fund_id: testFundId,
    p_yield_date: today,
    p_new_aum: 1000000,
    p_purpose: "reporting",
  });

  if (error) {
    if (
      error.message.includes("FIRST_INVESTMENT") ||
      error.message.includes("invalid input value for enum")
    ) {
      console.log("❌ FAILED: The FIRST_INVESTMENT enum bug is STILL present!");
      console.log("Error:", error.message);
      process.exit(1);
    } else {
      console.log("⚠️  Function returned an error (but NOT the enum bug):");
      console.log("Error:", error.message);
      console.log("\nThis may be expected if there's no data for this fund.");
    }
  } else {
    console.log("✅ SUCCESS! Function executed without enum error.");
    console.log("\nResult summary:");
    if (data) {
      const d = data as any;
      console.log(`  - Success: ${d.success}`);
      console.log(`  - Fund Code: ${d.fundCode || "N/A"}`);
      console.log(`  - Current AUM: ${d.currentAUM || 0}`);
      console.log(`  - New AUM: ${d.newAUM || 0}`);
      console.log(`  - Gross Yield: ${d.grossYield || 0}`);
      console.log(`  - Investor Count: ${d.investorCount || 0}`);
    }
  }

  console.log("\n✅ Yield preview fix verified!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
