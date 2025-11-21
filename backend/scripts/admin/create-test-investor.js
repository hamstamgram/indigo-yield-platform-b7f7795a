#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://nkfimvovosdehmyyjubn.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error("❌ Please set SUPABASE_SERVICE_ROLE_KEY environment variable");
  console.log("\nTo find your service role key:");
  console.log("1. Go to https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/settings/api");
  console.log('2. Copy the "service_role" key (starts with eyJ...)');
  console.log('3. Run: export SUPABASE_SERVICE_ROLE_KEY="your-key-here"');
  console.log("4. Then run this script again");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createTestInvestor() {
  console.log("🧪 Creating Test Investor...\n");

  try {
    // Create a test user
    const testEmail = `test.investor.${Date.now()}@example.com`;
    const testPassword = "TestInvestor123!";

    console.log("Creating user account...");
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        first_name: "Test",
        last_name: "Investor",
      },
    });

    if (authError) {
      console.error("❌ Failed to create user:", authError.message);
      return;
    }

    console.log("✅ User created:", authData.user.id);

    // Create profile
    console.log("Creating investor profile...");
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: authData.user.id,
        email: testEmail,
        first_name: "Test",
        last_name: "Investor",
        is_admin: false,
        fee_percentage: 2.0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (profileError) {
      console.error("❌ Failed to create profile:", profileError.message);
      return;
    }

    console.log("✅ Profile created");

    // Get available assets
    const { data: assets, error: assetsError } = await supabase.from("assets").select("*");

    if (assetsError) {
      console.error("❌ Failed to fetch assets:", assetsError.message);
      return;
    }

    // Add some initial portfolio entries (but not all, so we can test adding more)
    if (assets && assets.length > 2) {
      const initialAsset = assets[0];
      console.log(`Adding initial asset ${initialAsset.symbol} to portfolio...`);

      const { error: portfolioError } = await supabase.from("portfolios").insert({
        user_id: authData.user.id,
        asset_id: initialAsset.id,
        balance: 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (portfolioError) {
        console.error("⚠️ Failed to add initial portfolio:", portfolioError.message);
      } else {
        console.log("✅ Initial portfolio created");
      }
    }

    console.log("\n🎉 Test Investor Created Successfully!");
    console.log("=====================================");
    console.log("Email:", testEmail);
    console.log("Password:", testPassword);
    console.log("User ID:", authData.user.id);
    console.log("\nYou can now run the workflow test again.");
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

createTestInvestor();
