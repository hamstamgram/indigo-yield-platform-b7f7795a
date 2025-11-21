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

// Helper to generate a temporary email from investor name
function generateEmail(investorName) {
  const sanitized = investorName.toLowerCase().replace(/\s+/g, ".");
  return `${sanitized}@indigo-temp.fund`;
}

// Helper to convert Excel date serial to JavaScript Date
function excelDateToJSDate(serial) {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);

  const fractional_day = serial - Math.floor(serial) + 0.0000001;
  let total_seconds = Math.floor(86400 * fractional_day);
  const seconds = total_seconds % 60;
  total_seconds -= seconds;
  const hours = Math.floor(total_seconds / (60 * 60));
  const minutes = Math.floor(total_seconds / 60) % 60;

  return new Date(
    date_info.getFullYear(),
    date_info.getMonth(),
    date_info.getDate(),
    hours,
    minutes,
    seconds
  );
}

async function importInvestors() {
  console.log("📊 Importing Investors from Excel File (Investments Sheet)\n");

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

    // Find the Investments sheet
    const investmentsSheet = workbook.Sheets["Investments"];
    if (!investmentsSheet) {
      console.error('❌ Could not find "Investments" sheet in Excel file');
      return;
    }

    const investmentData = XLSX.utils.sheet_to_json(investmentsSheet);

    console.log(`✅ Found ${investmentData.length} investment records in Excel file\n`);

    // Get available assets for portfolio creation
    const { data: assets, error: assetsError } = await supabase.from("assets").select("*");

    if (assetsError) {
      console.error("❌ Failed to fetch assets:", assetsError.message);
      return;
    }

    console.log(`📦 Found ${assets.length} available assets`);

    // Create a map of asset symbols to asset records
    const assetMap = {};
    for (const asset of assets) {
      assetMap[asset.symbol.toUpperCase()] = asset;
    }
    console.log("Available assets:", Object.keys(assetMap).join(", "));

    // Group investments by investor
    const investorData = {};

    for (const row of investmentData) {
      const investorName = row["Investor Name"];
      const currency = row["Currency"]?.toUpperCase();
      const amount = parseFloat(row["Amount"]) || 0;
      const investmentDate = row["Investment Date"];

      if (!investorName || !currency || amount <= 0) {
        console.log(`⚠️  Skipping invalid row: ${JSON.stringify(row)}`);
        continue;
      }

      if (!investorData[investorName]) {
        investorData[investorName] = {
          name: investorName,
          portfolios: {},
          firstInvestmentDate: investmentDate,
        };
      }

      // Aggregate amounts by currency
      if (!investorData[investorName].portfolios[currency]) {
        investorData[investorName].portfolios[currency] = 0;
      }
      investorData[investorName].portfolios[currency] += amount;

      // Track earliest investment date
      if (investmentDate < investorData[investorName].firstInvestmentDate) {
        investorData[investorName].firstInvestmentDate = investmentDate;
      }
    }

    console.log(`\n📊 Found ${Object.keys(investorData).length} unique investors\n`);

    // Process each unique investor
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const [investorName, data] of Object.entries(investorData)) {
      try {
        // Parse name
        const nameParts = investorName.split(" ");
        const firstName = nameParts[0] || "Investor";
        const lastName = nameParts.slice(1).join(" ") || "User";
        const email = generateEmail(investorName);

        console.log(`\n📝 Processing investor: ${investorName}`);
        console.log(`   Email: ${email}`);
        console.log(`   Portfolio:`, data.portfolios);

        // Check if investor already exists by checking profiles with similar names
        const { data: existingProfiles } = await supabase
          .from("profiles")
          .select("id, email, first_name, last_name")
          .or(`first_name.ilike.%${firstName}%,last_name.ilike.%${lastName}%`);

        let userId;

        if (existingProfiles && existingProfiles.length > 0) {
          // Check for exact or close match
          const exactMatch = existingProfiles.find(
            (p) =>
              p.first_name?.toLowerCase() === firstName.toLowerCase() &&
              p.last_name?.toLowerCase() === lastName.toLowerCase()
          );

          if (exactMatch) {
            console.log(`⏭️  Investor already exists: ${exactMatch.email}`);
            userId = exactMatch.id;
            skipCount++;
          } else {
            console.log(`⚠️  Found similar profile(s), creating new investor anyway`);
          }
        }

        // Create new investor if not found
        if (!userId) {
          // Create auth user using admin API
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: email,
            password: `TempPass${Date.now()}!`, // Temporary password
            email_confirm: true,
            user_metadata: {
              first_name: firstName,
              last_name: lastName,
            },
          });

          if (createError) {
            console.error(`❌ Failed to create user ${email}:`, createError.message);
            errorCount++;
            continue;
          }

          userId = newUser.user.id;

          // Create profile
          const { error: profileError } = await supabase.from("profiles").insert({
            id: userId,
            email: email,
            first_name: firstName,
            last_name: lastName,
            is_admin: false,
            fee_percentage: 2.0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          if (profileError) {
            console.error(`❌ Failed to create profile for ${email}:`, profileError.message);
            errorCount++;
            continue;
          }

          console.log(`✅ Created new investor: ${email}`);
          successCount++;
        }

        // Add or update portfolios
        const portfolioEntries = [];

        for (const [currency, balance] of Object.entries(data.portfolios)) {
          const asset = assetMap[currency];

          if (!asset) {
            console.warn(`⚠️  Asset not found for currency: ${currency}`);
            continue;
          }

          // Check if portfolio entry already exists
          const { data: existingPortfolio } = await supabase
            .from("portfolios")
            .select("id, balance")
            .eq("user_id", userId)
            .eq("asset_id", asset.id)
            .single();

          if (existingPortfolio) {
            // Update existing portfolio
            const { error: updateError } = await supabase
              .from("portfolios")
              .update({
                balance: existingPortfolio.balance + balance,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingPortfolio.id);

            if (updateError) {
              console.error(`⚠️  Failed to update portfolio for ${currency}:`, updateError.message);
            } else {
              console.log(
                `✅ Updated ${currency} balance: ${existingPortfolio.balance} → ${existingPortfolio.balance + balance}`
              );
            }
          } else {
            // Create new portfolio entry
            portfolioEntries.push({
              user_id: userId,
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
            console.error(`⚠️  Failed to create portfolios:`, portfolioError.message);
          } else {
            console.log(`✅ Created ${portfolioEntries.length} new portfolio entries`);
          }
        }
      } catch (error) {
        console.error(`❌ Error processing investor ${investorName}:`, error);
        errorCount++;
      }
    }

    console.log("\n========================================");
    console.log("📊 Import Summary:");
    console.log(`✅ Successfully created: ${successCount} new investors`);
    console.log(`⏭️  Already existed: ${skipCount} investors`);
    console.log(`❌ Errors: ${errorCount} investors`);
    console.log("========================================\n");

    // Show a summary of all investors and their portfolios
    console.log("\n📋 Investor Portfolio Summary:");
    const { data: allProfiles } = await supabase
      .from("profiles")
      .select(
        `
        id,
        email,
        first_name,
        last_name,
        portfolios (
          balance,
          assets (
            symbol,
            name
          )
        )
      `
      )
      .eq("is_admin", false)
      .order("created_at", { ascending: false });

    if (allProfiles) {
      for (const profile of allProfiles) {
        console.log(`\n👤 ${profile.first_name} ${profile.last_name} (${profile.email})`);
        if (profile.portfolios && profile.portfolios.length > 0) {
          for (const portfolio of profile.portfolios) {
            console.log(`   - ${portfolio.assets.symbol}: ${portfolio.balance}`);
          }
        } else {
          console.log("   - No portfolios");
        }
      }
    }
  } catch (error) {
    console.error("❌ Fatal error:", error);
  }
}

// Run the import
importInvestors();
