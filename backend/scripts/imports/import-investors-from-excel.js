#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";
import fs from "fs";
import path from "path";

// Use the Supabase URL and anon key we already have
const SUPABASE_URL = "https://nkfimvovosdehmyyjubn.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function importInvestors() {
  console.log("📊 Importing Investors from Excel File\n");

  try {
    // First, login as admin
    console.log("🔐 Logging in as admin...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: "hammadou@indigo.fund",
      password: "Boboba1967",
    });

    if (authError) {
      console.error("❌ Login failed:", authError.message);
      return;
    }

    console.log("✅ Logged in as admin");

    // Read the Excel file
    const filePath = path.join(process.cwd(), "ops/import/first_run.xlsx");
    console.log("\n📁 Reading Excel file:", filePath);

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`✅ Found ${data.length} rows in Excel file\n`);

    // Get available assets for portfolio creation
    const { data: assets, error: assetsError } = await supabase.from("assets").select("*");

    if (assetsError) {
      console.error("❌ Failed to fetch assets:", assetsError.message);
      return;
    }

    console.log(`📦 Found ${assets.length} available assets\n`);

    // Process each investor from Excel
    let successCount = 0;
    let skipCount = 0;

    for (const row of data) {
      try {
        // Extract investor data from Excel row
        const email = row["Email"] || row["email"];
        const firstName = row["First Name"] || row["first_name"] || row["Name"]?.split(" ")[0];
        const lastName = row["Last Name"] || row["last_name"] || row["Name"]?.split(" ")[1];

        if (!email) {
          console.log("⚠️  Skipping row - no email found");
          skipCount++;
          continue;
        }

        // Check if investor already exists
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", email)
          .single();

        if (existingProfile) {
          console.log(`⏭️  Skipping ${email} - already exists`);
          skipCount++;
          continue;
        }

        console.log(`\n📝 Creating investor: ${email}`);

        // Create auth user using admin API
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: email,
          password: `TempPass${Date.now()}!`, // Temporary password
          email_confirm: true,
          user_metadata: {
            first_name: firstName || "Investor",
            last_name: lastName || "User",
          },
        });

        if (createError) {
          console.error(`❌ Failed to create user ${email}:`, createError.message);
          continue;
        }

        // Create profile
        const { error: profileError } = await supabase.from("profiles").insert({
          id: newUser.user.id,
          email: email,
          first_name: firstName || "Investor",
          last_name: lastName || "User",
          is_admin: false,
          fee_percentage: 2.0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (profileError) {
          console.error(`❌ Failed to create profile for ${email}:`, profileError.message);
          continue;
        }

        // Add initial portfolios based on Excel data
        const portfolioEntries = [];

        // Check for asset columns in Excel (BTC, ETH, SOL, USDC)
        for (const asset of assets) {
          const symbol = asset.symbol.toUpperCase();
          const balance = parseFloat(row[symbol]) || 0;

          if (balance > 0) {
            portfolioEntries.push({
              user_id: newUser.user.id,
              asset_id: asset.id,
              balance: balance,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }

        if (portfolioEntries.length > 0) {
          const { error: portfolioError } = await supabase
            .from("portfolios")
            .insert(portfolioEntries);

          if (portfolioError) {
            console.error(`⚠️  Failed to create portfolios for ${email}:`, portfolioError.message);
          } else {
            console.log(`✅ Created ${portfolioEntries.length} portfolio entries`);
          }
        }

        console.log(`✅ Successfully created investor: ${email}`);
        successCount++;
      } catch (error) {
        console.error("❌ Error processing row:", error);
      }
    }

    console.log("\n========================================");
    console.log("📊 Import Summary:");
    console.log(`✅ Successfully imported: ${successCount} investors`);
    console.log(`⏭️  Skipped (already exist): ${skipCount} investors`);
    console.log("========================================\n");
  } catch (error) {
    console.error("❌ Fatal error:", error);
  }
}

// Run the import
importInvestors();
