#!/usr/bin/env node

import readline from "readline";
import { createServiceClient } from "../../utils/supabaseClient.js";

// Initialize secure Supabase client
const supabase = createServiceClient();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper to prompt for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Get current date in YYYY-MM-DD format
function getCurrentDate() {
  const date = new Date();
  return date.toISOString().split("T")[0];
}

// Record daily yield rates
async function recordDailyYields() {
  console.log("\n📊 DAILY YIELD RECORDING\n");
  console.log("Enter daily yield percentages for each asset:");
  console.log("(Example: 0.05 for 0.05% daily yield)\n");

  const date = (await prompt(`Date (YYYY-MM-DD) [${getCurrentDate()}]: `)) || getCurrentDate();

  // Get assets
  const { data: assets, error: assetsError } = await supabase
    .from("assets")
    .select("*")
    .order("symbol");

  if (assetsError) {
    console.error("❌ Failed to fetch assets:", assetsError.message);
    return;
  }

  const yields = [];

  for (const asset of assets) {
    const yieldPercent = await prompt(`${asset.symbol} daily yield %: `);

    if (yieldPercent && parseFloat(yieldPercent) >= 0) {
      yields.push({
        asset_id: asset.id,
        asset_symbol: asset.symbol,
        daily_yield_percentage: parseFloat(yieldPercent),
        date: date,
      });
    }
  }

  if (yields.length === 0) {
    console.log("\n⚠️  No yields entered");
    return;
  }

  console.log("\n📝 Recording yields:");
  for (const y of yields) {
    console.log(`   ${y.asset_symbol}: ${y.daily_yield_percentage}%`);
  }

  const confirm = await prompt("\nConfirm? (y/n): ");

  if (confirm.toLowerCase() !== "y") {
    console.log("❌ Cancelled");
    return;
  }

  // Insert yields into yield_rates table
  for (const yieldData of yields) {
    const { error } = await supabase.from("yield_rates").upsert(
      {
        asset_id: yieldData.asset_id,
        daily_yield_percentage: yieldData.daily_yield_percentage,
        date: yieldData.date,
        is_api_sourced: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "asset_id,date",
      }
    );

    if (error) {
      console.error(`❌ Failed to record yield for ${yieldData.asset_symbol}:`, error.message);
    } else {
      console.log(`✅ Recorded yield for ${yieldData.asset_symbol}`);
    }
  }
}

// Apply yields to investor positions
async function applyDailyYields() {
  console.log("\n💰 APPLYING DAILY YIELDS TO POSITIONS\n");

  const date =
    (await prompt(`Apply yields for date (YYYY-MM-DD) [${getCurrentDate()}]: `)) ||
    getCurrentDate();

  // Get yields for the date
  const { data: yields, error: yieldsError } = await supabase
    .from("yield_rates")
    .select("*, assets(*)")
    .eq("date", date);

  if (yieldsError) {
    console.error("❌ Failed to fetch yields:", yieldsError.message);
    return;
  }

  if (!yields || yields.length === 0) {
    console.log("⚠️  No yields found for", date);
    return;
  }

  console.log("\n📊 Yields to apply:");
  for (const y of yields) {
    console.log(`   ${y.assets.symbol}: ${y.daily_yield_percentage}%`);
  }

  const confirm = await prompt("\nApply these yields to all positions? (y/n): ");

  if (confirm.toLowerCase() !== "y") {
    console.log("❌ Cancelled");
    return;
  }

  // Get all positions
  const { data: positions, error: positionsError } = await supabase.from("positions").select("*");

  if (positionsError) {
    console.error("❌ Failed to fetch positions:", positionsError.message);
    return;
  }

  let updatedCount = 0;
  let totalEarnings = {};

  // Apply yields to each position
  for (const position of positions) {
    // Find the yield for this asset
    const yieldData = yields.find((y) => {
      // Match by asset code (handle both asset_id and asset_code fields)
      return y.assets.symbol === position.asset_code;
    });

    if (!yieldData) {
      continue;
    }

    // Calculate earnings
    const dailyEarnings = position.current_balance * (yieldData.daily_yield_percentage / 100);
    const newBalance = position.current_balance + dailyEarnings;
    const newTotalEarned = position.total_earned + dailyEarnings;

    // Update position
    const { error: updateError } = await supabase
      .from("positions")
      .update({
        current_balance: newBalance,
        total_earned: newTotalEarned,
        updated_at: new Date().toISOString(),
      })
      .eq("id", position.id);

    if (updateError) {
      console.error(`❌ Failed to update position ${position.id}:`, updateError.message);
    } else {
      updatedCount++;

      // Track total earnings by asset
      if (!totalEarnings[position.asset_code]) {
        totalEarnings[position.asset_code] = 0;
      }
      totalEarnings[position.asset_code] += dailyEarnings;
    }
  }

  console.log(`\n✅ Updated ${updatedCount} positions`);

  console.log("\n💰 Total Earnings Applied:");
  for (const [asset, earnings] of Object.entries(totalEarnings)) {
    console.log(`   ${asset}: ${earnings.toFixed(4)}`);
  }

  // Record in portfolio_history
  console.log("\n📝 Recording portfolio history...");

  const { data: updatedPositions } = await supabase.from("positions").select("*");

  if (updatedPositions) {
    for (const position of updatedPositions) {
      const { error } = await supabase.from("portfolio_history").upsert(
        {
          user_id: position.investor_id,
          asset_id: yields.find((y) => y.assets.symbol === position.asset_code)?.asset_id,
          balance: position.current_balance,
          yield_applied: position.total_earned,
          date: date,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,asset_id,date",
        }
      );

      if (error && !error.message.includes("duplicate")) {
        console.error(`⚠️  Failed to record history for position ${position.id}:`, error.message);
      }
    }
    console.log("✅ Portfolio history recorded");
  }
}

// View yield history
async function viewYieldHistory() {
  console.log("\n📈 YIELD HISTORY\n");

  const days = (await prompt("How many days to show? [7]: ")) || "7";

  const { data: yields, error } = await supabase
    .from("yield_rates")
    .select("*, assets(*)")
    .order("date", { ascending: false })
    .limit(parseInt(days) * 6); // Assuming up to 6 assets

  if (error) {
    console.error("❌ Failed to fetch yield history:", error.message);
    return;
  }

  // Group by date
  const yieldsByDate = {};

  for (const y of yields) {
    if (!yieldsByDate[y.date]) {
      yieldsByDate[y.date] = {};
    }
    yieldsByDate[y.date][y.assets.symbol] = y.daily_yield_percentage;
  }

  console.log("\nDate        | BTC    | ETH    | USDT   | SOL    | USDC   | EURC");
  console.log("------------|--------|--------|--------|--------|--------|--------");

  for (const [date, assets] of Object.entries(yieldsByDate)) {
    const btc = assets.BTC?.toFixed(3) || "-";
    const eth = assets.ETH?.toFixed(3) || "-";
    const usdt = assets.USDT?.toFixed(3) || "-";
    const sol = assets.SOL?.toFixed(3) || "-";
    const usdc = assets.USDC?.toFixed(3) || "-";
    const eurc = assets.EURC?.toFixed(3) || "-";

    console.log(
      `${date} | ${btc.padEnd(6)} | ${eth.padEnd(6)} | ${usdt.padEnd(6)} | ${sol.padEnd(6)} | ${usdc.padEnd(6)} | ${eurc.padEnd(6)}`
    );
  }
}

// Calculate monthly performance
async function calculateMonthlyPerformance() {
  console.log("\n📊 MONTHLY PERFORMANCE CALCULATION\n");

  const month = await prompt("Month (1-12): ");
  const year = await prompt("Year (YYYY): ");

  if (!month || !year) {
    console.log("❌ Invalid input");
    return;
  }

  // Get all positions at month end
  const { data: positions } = await supabase
    .from("positions")
    .select("*, profiles!positions_investor_id_fkey(*)");

  console.log("\n📈 Monthly Performance Summary:");
  console.log("=====================================\n");

  let totalsByAsset = {};
  let earnedByAsset = {};

  for (const position of positions || []) {
    if (!totalsByAsset[position.asset_code]) {
      totalsByAsset[position.asset_code] = 0;
      earnedByAsset[position.asset_code] = 0;
    }

    totalsByAsset[position.asset_code] += position.current_balance;
    earnedByAsset[position.asset_code] += position.total_earned;
  }

  console.log("Asset Performance:");
  for (const [asset, total] of Object.entries(totalsByAsset)) {
    const earned = earnedByAsset[asset];
    const principal = total - earned;
    const returnPct = principal > 0 ? ((earned / principal) * 100).toFixed(2) : "0.00";

    console.log(`\n${asset}:`);
    console.log(`  Principal: ${principal.toFixed(4)}`);
    console.log(`  Earnings:  ${earned.toFixed(4)}`);
    console.log(`  Total:     ${total.toFixed(4)}`);
    console.log(`  Return:    ${returnPct}%`);
  }

  console.log("\n=====================================");
}

// Main menu
async function mainMenu() {
  console.log("\n🏦 INDIGO YIELD PLATFORM - YIELD MANAGEMENT");
  console.log("============================================\n");

  while (true) {
    console.log("\nSelect an option:");
    console.log("1. Record daily yields");
    console.log("2. Apply yields to positions");
    console.log("3. View yield history");
    console.log("4. Calculate monthly performance");
    console.log("5. Exit\n");

    const choice = await prompt("Choice: ");

    switch (choice) {
      case "1":
        await recordDailyYields();
        break;
      case "2":
        await applyDailyYields();
        break;
      case "3":
        await viewYieldHistory();
        break;
      case "4":
        await calculateMonthlyPerformance();
        break;
      case "5":
        console.log("\n👋 Goodbye!\n");
        rl.close();
        process.exit(0);
      default:
        console.log("❌ Invalid choice");
    }
  }
}

// Run the program
mainMenu().catch((error) => {
  console.error("❌ Fatal error:", error);
  rl.close();
  process.exit(1);
});
