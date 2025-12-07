#!/usr/bin/env node

/**
 * Critical Workflow Test Script
 * Tests the addAssetsToInvestor workflow after RLS policy deployment
 */

import { createClient } from "@supabase/supabase-js";
import readline from "readline";

// Configuration
const SUPABASE_URL = "https://nkfimvovosdehmyyjubn.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function testCriticalWorkflow() {
  console.log("🧪 Testing Critical Workflow: addAssetsToInvestor");
  console.log("================================================\n");

  try {
    // Step 1: Login as admin
    console.log("📝 Step 1: Logging in as admin...");
    const email = "hammadou@indigo.fund";
    const password = await question("Enter password for hammadou@indigo.fund: ");

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error("❌ Login failed:", authError.message);
      return;
    }

    console.log("✅ Logged in successfully");
    console.log("User ID:", authData.user.id);

    // Step 2: Verify admin status
    console.log("\n📝 Step 2: Verifying admin status...");
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", authData.user.id)
      .single();

    if (profileError) {
      console.error("❌ Failed to fetch profile:", profileError.message);
      return;
    }

    if (!profile.is_admin) {
      console.error("❌ User is not an admin");
      return;
    }

    console.log("✅ Admin status confirmed");

    // Step 3: Get list of investors
    console.log("\n📝 Step 3: Fetching investors...");
    const { data: investors, error: investorsError } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name")
      .eq("is_admin", false)
      .limit(5);

    if (investorsError) {
      console.error("❌ Failed to fetch investors:", investorsError.message);
      return;
    }

    if (!investors || investors.length === 0) {
      console.log("⚠️  No investors found. Creating a test investor...");
      // Create test investor logic here if needed
      return;
    }

    console.log(`✅ Found ${investors.length} investors`);
    investors.forEach((inv, idx) => {
      console.log(`  ${idx + 1}. ${inv.email} (${inv.first_name} ${inv.last_name})`);
    });

    // Step 4: Select an investor
    const investorIndex = await question("\nSelect investor number to test with: ");
    const selectedInvestor = investors[parseInt(investorIndex) - 1];

    if (!selectedInvestor) {
      console.error("❌ Invalid selection");
      return;
    }

    console.log(`\n✅ Selected investor: ${selectedInvestor.email}`);

    // Step 5: Get available assets
    console.log("\n📝 Step 4: Fetching available assets...");
    const { data: assets, error: assetsError } = await supabase.from("assets").select("*");

    if (assetsError) {
      console.error("❌ Failed to fetch assets:", assetsError.message);
      return;
    }

    console.log(`✅ Found ${assets.length} assets`);
    assets.forEach((asset, idx) => {
      console.log(`  ${idx + 1}. ${asset.symbol} - ${asset.name}`);
    });

    // Step 6: Check existing portfolio
    console.log("\n📝 Step 5: Checking existing portfolio...");
    const { data: existingPortfolio, error: portfolioError } = await supabase
      .from("portfolios")
      .select("asset_id")
      .eq("user_id", selectedInvestor.id);

    if (portfolioError) {
      console.error("❌ Failed to fetch portfolio:", portfolioError.message);
      return;
    }

    const existingAssetIds = existingPortfolio.map((p) => p.asset_id);
    const availableAssets = assets.filter((a) => !existingAssetIds.includes(a.id));

    if (availableAssets.length === 0) {
      console.log("⚠️  This investor already has all assets");
      return;
    }

    console.log(`\n✅ Available assets to add: ${availableAssets.length}`);
    availableAssets.forEach((asset, idx) => {
      console.log(`  ${idx + 1}. ${asset.symbol} - ${asset.name}`);
    });

    // Step 7: Test adding an asset
    const assetIndex = await question("\nSelect asset number to add: ");
    const selectedAsset = availableAssets[parseInt(assetIndex) - 1];

    if (!selectedAsset) {
      console.error("❌ Invalid selection");
      return;
    }

    console.log(`\n📝 Step 6: Adding ${selectedAsset.symbol} to investor's portfolio...`);

    const { data: insertData, error: insertError } = await supabase
      .from("portfolios")
      .insert({
        user_id: selectedInvestor.id,
        asset_id: selectedAsset.id,
        balance: 0,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Failed to add asset:", insertError.message);
      console.error("Error code:", insertError.code);
      console.error("Details:", insertError.details);
      console.error("Hint:", insertError.hint);

      if (insertError.code === "42501") {
        console.error("\n⚠️  RLS Policy Issue: The new policy may not be active yet.");
        console.error("Try refreshing the Supabase connection or waiting a moment.");
      }
      return;
    }

    console.log("✅ Asset added successfully!");
    console.log("Portfolio record:", insertData);

    // Step 8: Verify the addition
    console.log("\n📝 Step 7: Verifying the addition...");
    const { data: verifyData, error: verifyError } = await supabase
      .from("portfolios")
      .select(
        `
        *,
        assets (symbol, name)
      `
      )
      .eq("user_id", selectedInvestor.id)
      .eq("asset_id", selectedAsset.id)
      .single();

    if (verifyError) {
      console.error("❌ Failed to verify:", verifyError.message);
      return;
    }

    console.log("✅ Verification successful!");
    console.log(`  Asset: ${verifyData.assets.symbol} (${verifyData.assets.name})`);
    console.log(`  Balance: ${verifyData.balance}`);
    console.log(`  Created at: ${verifyData.created_at}`);
    console.log(`  Updated at: ${verifyData.updated_at}`);

    console.log("\n🎉 Critical Workflow Test PASSED!");
    console.log("The addAssetsToInvestor workflow is now functional.");
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  } finally {
    rl.close();
    process.exit(0);
  }
}

// Run the test
console.log("Starting Critical Workflow Test...\n");
testCriticalWorkflow();
