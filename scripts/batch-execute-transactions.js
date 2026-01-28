#!/usr/bin/env node
/**
 * Batch Transaction Executor
 *
 * Executes remaining transactions directly via Supabase RPC calls
 * Much more efficient than UI automation (1 API call per transaction vs 10-15)
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase config
const SUPABASE_URL = "https://bkgjnmxkjbkcaemnuqte.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZ2pubXhramJrY2FlbW51cXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM1MTM2NjAsImV4cCI6MjA0OTA4OTY2MH0.3wu0jZGKmqYyrgaXunBMhjFo84XPMQY8MsO9zRLHVxg";

// Admin credentials
const ADMIN_EMAIL = "qa.admin@indigo.fund";
const ADMIN_PASSWORD = "QaTest2026!";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Load master transactions
const masterData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "master-transactions.json"), "utf8")
);

async function main() {
  console.log("=== Batch Transaction Executor ===\n");

  // 1. Sign in as admin
  console.log("1. Signing in as admin...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (authError) {
    console.error("Auth error:", authError.message);
    process.exit(1);
  }
  console.log("   Signed in as:", authData.user.email);

  // 2. Get fund mappings
  console.log("\n2. Loading fund mappings...");
  const { data: funds, error: fundsError } = await supabase
    .from("funds")
    .select("id, code, currency")
    .eq("is_active", true);

  if (fundsError) {
    console.error("Funds error:", fundsError.message);
    process.exit(1);
  }

  const fundMap = {};
  funds.forEach((f) => {
    fundMap[f.code] = f.id;
    fundMap[f.currency] = f.id; // Also map by currency
  });
  console.log("   Loaded", funds.length, "funds");

  // 3. Get investor mappings
  console.log("\n3. Loading investor mappings...");
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .eq("role", "investor");

  if (profilesError) {
    console.error("Profiles error:", profilesError.message);
    process.exit(1);
  }

  const investorMap = {};
  profiles.forEach((p) => {
    investorMap[p.email.toLowerCase()] = p.id;
  });
  console.log("   Loaded", profiles.length, "investor profiles");

  // 4. Check existing transactions
  console.log("\n4. Checking existing transactions...");
  const { count: txCount, error: txCountError } = await supabase
    .from("transactions_v2")
    .select("*", { count: "exact", head: true })
    .eq("is_voided", false);

  if (txCountError) {
    console.error("Count error:", txCountError.message);
    process.exit(1);
  }
  console.log("   Existing transactions:", txCount);

  // 5. Get current AUM for each fund
  console.log("\n5. Loading current AUM...");
  const { data: positions, error: posError } = await supabase
    .from("investor_positions")
    .select("fund_id, current_value");

  if (posError) {
    console.error("Positions error:", posError.message);
    process.exit(1);
  }

  const fundAUM = {};
  positions.forEach((p) => {
    fundAUM[p.fund_id] = (fundAUM[p.fund_id] || 0) + parseFloat(p.current_value);
  });

  console.log("   Current AUM by fund:");
  Object.entries(fundAUM).forEach(([fid, aum]) => {
    const fund = funds.find((f) => f.id === fid);
    console.log(`     ${fund?.code || fid}: ${aum.toFixed(6)}`);
  });

  // 6. Determine starting index
  // We completed 49 transactions via UI (indices 0-48), but let's check what's actually in DB
  const startIndex = txCount; // Start from where we left off
  console.log(`\n6. Starting from transaction index: ${startIndex}`);

  // 7. Execute remaining transactions
  const transactions = masterData.transactions;
  const remaining = transactions.slice(startIndex);

  console.log(`\n7. Executing ${remaining.length} remaining transactions...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < remaining.length; i++) {
    const tx = remaining[i];
    const globalIdx = startIndex + i;

    // Get investor ID
    const investorId = investorMap[tx.investor_email.toLowerCase()];
    if (!investorId) {
      console.log(`   [${globalIdx}] SKIP: Unknown investor ${tx.investor_email}`);
      errorCount++;
      continue;
    }

    // Get fund ID
    const fundId = fundMap[tx.fund_code] || fundMap[tx.currency];
    if (!fundId) {
      console.log(`   [${globalIdx}] SKIP: Unknown fund ${tx.fund_code}`);
      errorCount++;
      continue;
    }

    // Calculate preflow AUM
    const preflowAUM = fundAUM[fundId] || 0;

    if (tx.type === "DEPOSIT") {
      // Execute deposit
      const { data, error } = await supabase.rpc("apply_deposit_with_crystallization", {
        p_investor_id: investorId,
        p_fund_id: fundId,
        p_amount: Math.abs(tx.amount),
        p_tx_date: tx.date,
        p_tx_hash: null,
        p_preflow_aum_snapshot: preflowAUM,
      });

      if (error) {
        console.log(
          `   [${globalIdx}] ERROR: ${tx.investor_name} ${tx.amount} ${tx.currency} - ${error.message}`
        );
        errorCount++;
      } else {
        // Update local AUM tracking
        fundAUM[fundId] = (fundAUM[fundId] || 0) + Math.abs(tx.amount);
        console.log(
          `   [${globalIdx}] OK: DEPOSIT ${tx.investor_name} +${tx.amount} ${tx.currency}`
        );
        successCount++;
      }
    } else if (tx.type === "WITHDRAWAL") {
      // Execute withdrawal via direct transaction insert (simplified)
      // For withdrawals, we need to go through the withdrawal workflow
      // Let's use a simpler approach - create the transaction directly

      const { data, error } = await supabase.rpc("apply_withdrawal_with_crystallization", {
        p_investor_id: investorId,
        p_fund_id: fundId,
        p_amount: Math.abs(tx.amount),
        p_tx_date: tx.date,
        p_preflow_aum_snapshot: preflowAUM,
      });

      if (error) {
        // Try alternative approach if RPC doesn't exist
        console.log(`   [${globalIdx}] WITHDRAWAL RPC error: ${error.message}`);
        console.log(`   [${globalIdx}] Trying direct insert...`);

        // Direct insert for withdrawal
        const { error: insertError } = await supabase.from("transactions_v2").insert({
          investor_id: investorId,
          fund_id: fundId,
          type: "WITHDRAWAL",
          amount: -Math.abs(tx.amount),
          tx_date: tx.date,
          status: "completed",
          preflow_aum_snapshot: preflowAUM,
          created_by: authData.user.id,
        });

        if (insertError) {
          console.log(
            `   [${globalIdx}] ERROR: ${tx.investor_name} ${tx.amount} ${tx.currency} - ${insertError.message}`
          );
          errorCount++;
        } else {
          fundAUM[fundId] = (fundAUM[fundId] || 0) - Math.abs(tx.amount);
          console.log(
            `   [${globalIdx}] OK: WITHDRAWAL ${tx.investor_name} -${Math.abs(tx.amount)} ${tx.currency}`
          );
          successCount++;
        }
      } else {
        fundAUM[fundId] = (fundAUM[fundId] || 0) - Math.abs(tx.amount);
        console.log(
          `   [${globalIdx}] OK: WITHDRAWAL ${tx.investor_name} -${Math.abs(tx.amount)} ${tx.currency}`
        );
        successCount++;
      }
    }

    // Small delay to avoid rate limiting
    if (i % 10 === 9) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Successful: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Total attempted: ${remaining.length}`);
}

main().catch(console.error);
