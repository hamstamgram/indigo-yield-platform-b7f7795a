#!/usr/bin/env npx ts-node --esm
/**
 * Apply enum fix migration via Supabase RPC
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
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
  console.log("Testing preview_daily_yield_to_fund_v3...");

  // First, let's test if the function works now
  const { data: funds } = await supabase.from("funds").select("id").limit(1);

  if (!funds || funds.length === 0) {
    console.log("No funds found to test with");
    return;
  }

  const fundId = funds[0].id;
  const today = new Date().toISOString().split("T")[0];

  console.log(`Testing with fund: ${fundId}, date: ${today}`);

  const { data, error } = await supabase.rpc("preview_daily_yield_to_fund_v3", {
    p_fund_id: fundId,
    p_yield_date: today,
    p_new_aum: 1000000,
    p_purpose: "reporting",
  });

  if (error) {
    console.error("❌ Error:", error.message);
    if (error.message.includes("FIRST_INVESTMENT")) {
      console.log("\n⚠️  The FIRST_INVESTMENT enum bug is still present!");
      console.log("The migration needs to be applied manually in Supabase Dashboard.");
    }
  } else {
    console.log("✅ Function works! Result:", JSON.stringify(data, null, 2).slice(0, 500));
  }
}

main().catch(console.error);
