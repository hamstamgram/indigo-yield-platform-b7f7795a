#!/usr/bin/env node

import { createServiceClient } from "../../utils/supabaseClient.js";
import {
  prompt,
  promptSelection,
  promptConfirmation,
  promptNumber,
  displayMenu,
  displayTransactionSummary,
  displayTransactionHistory,
  displayTransactionStatistics,
  closePrompts,
} from "../../utils/cliPrompts.js";
import {
  getAdminUser,
  fetchInvestors,
  fetchAssets,
  fetchInvestorPositions,
  processDeposit,
  processWithdrawal,
  fetchTransactionHistory,
  groupPositionsByInvestor,
} from "../../utils/transactionService.js";

// Initialize secure Supabase client
const supabase = createServiceClient();

// Record a deposit with improved UI and validation
async function recordDeposit() {
  console.log("\n💵 RECORD DEPOSIT\n");

  try {
    // Get admin user for audit
    const admin = await getAdminUser(supabase);

    // Get investors
    const investors = await fetchInvestors(supabase);
    if (investors.length === 0) {
      console.log("❌ No investors found");
      return;
    }

    // Select investor
    const investor = await promptSelection(
      "Select investor:",
      investors,
      (inv) => `${inv.first_name} ${inv.last_name} (${inv.email})`
    );

    if (!investor) return;

    // Get assets
    const assets = await fetchAssets(supabase);
    if (assets.length === 0) {
      console.log("❌ No assets found");
      return;
    }

    // Select asset
    const asset = await promptSelection("Select asset:", assets, (asset) => asset.symbol);

    if (!asset) return;

    // Get amount with validation
    const amount = await promptNumber(`Deposit amount (${asset.symbol}): `, {
      min: 0.0001,
      max: 1000000,
      decimals: 4,
    });

    if (!amount) return;

    // Get optional details
    const txHash = (await prompt("Transaction hash (optional): ")) || null;
    const note = (await prompt("Note (optional): ")) || null;

    // Display summary and confirm
    const transactionDetails = {
      type: "DEPOSIT",
      investorName: `${investor.first_name} ${investor.last_name}`,
      asset: asset.symbol,
      amount: amount.toFixed(4),
      txHash,
      note,
    };

    displayTransactionSummary(transactionDetails, {
      firstName: admin.first_name,
      lastName: admin.last_name,
    });

    const confirmed = await promptConfirmation("Confirm deposit?");
    if (!confirmed) {
      console.log("❌ Cancelled");
      return;
    }

    // Process deposit using service
    const result = await processDeposit(supabase, {
      investorId: investor.id,
      assetCode: asset.symbol,
      amount,
      txHash,
      note,
      adminId: admin.id,
    });

    console.log("\n✅ Deposit recorded successfully");
    console.log(`   Amount: ${result.amount} ${result.assetCode}`);
    console.log(`   Position: ${result.positionUpdated ? "Updated" : "Created"}`);
  } catch (error) {
    console.error("❌ Error recording deposit:", error.message);
  }
}

// Record a withdrawal with improved UI and validation
async function recordWithdrawal() {
  console.log("\n💸 RECORD WITHDRAWAL\n");

  try {
    // Get admin user for audit
    const admin = await getAdminUser(supabase);

    // Get positions grouped by investor
    const positions = await fetchInvestorPositions(supabase);
    if (positions.length === 0) {
      console.log("❌ No investors with positions found");
      return;
    }

    const investorList = groupPositionsByInvestor(positions);

    // Select investor
    const selectedInvestor = await promptSelection(
      "Select investor:",
      investorList,
      (item) => `${item.investor.first_name} ${item.investor.last_name}`
    );

    if (!selectedInvestor) return;

    // Select position
    const selectedPosition = await promptSelection(
      "Select position:",
      selectedInvestor.positions,
      (pos) => `${pos.asset_code}: ${pos.current_balance.toFixed(4)}`
    );

    if (!selectedPosition) return;

    // Get withdrawal amount with validation
    console.log(
      `\nAvailable balance: ${selectedPosition.current_balance.toFixed(4)} ${selectedPosition.asset_code}`
    );
    const amount = await promptNumber("Withdrawal amount: ", {
      min: 0.0001,
      max: selectedPosition.current_balance,
      decimals: 4,
    });

    if (!amount) return;

    // Get optional details
    const txHash = (await prompt("Transaction hash (optional): ")) || null;
    const note = (await prompt("Note (optional): ")) || null;

    // Display summary and confirm
    const transactionDetails = {
      type: "WITHDRAWAL",
      investorName: `${selectedInvestor.investor.first_name} ${selectedInvestor.investor.last_name}`,
      asset: selectedPosition.asset_code,
      amount: amount.toFixed(4),
      remaining: (selectedPosition.current_balance - amount).toFixed(4),
      txHash,
      note,
    };

    displayTransactionSummary(transactionDetails, {
      firstName: admin.first_name,
      lastName: admin.last_name,
    });

    const confirmed = await promptConfirmation("Confirm withdrawal?");
    if (!confirmed) {
      console.log("❌ Cancelled");
      return;
    }

    // Process withdrawal using service
    const result = await processWithdrawal(supabase, {
      investorId: selectedInvestor.investor.id,
      assetCode: selectedPosition.asset_code,
      amount,
      txHash,
      note,
      adminId: admin.id,
      positionId: selectedPosition.id,
      currentBalance: selectedPosition.current_balance,
    });

    console.log("\n✅ Withdrawal recorded successfully");
    console.log(`   Amount: ${result.amount} ${result.assetCode}`);
    console.log(`   Remaining balance: ${result.remainingBalance.toFixed(4)}`);
  } catch (error) {
    console.error("❌ Error recording withdrawal:", error.message);
  }
}

// View transaction history with improved UI
async function viewTransactionHistory() {
  console.log("\n📋 TRANSACTION HISTORY\n");

  try {
    // Get number of days with validation
    const daysStr = (await prompt("How many days to show? [30]: ")) || "30";
    const days = parseInt(daysStr);

    if (isNaN(days) || days < 1) {
      console.log("❌ Invalid number of days");
      return;
    }

    // Fetch transactions using service
    const transactions = await fetchTransactionHistory(supabase, days);

    if (transactions.length === 0) {
      console.log("No transactions found for the specified period");
      return;
    }

    console.log(`\nShowing transactions from the last ${days} days:\n`);

    // Display transactions using utility
    displayTransactionHistory(transactions);

    // Display summary statistics
    displayTransactionStatistics(transactions);
  } catch (error) {
    console.error("❌ Error fetching transaction history:", error.message);
  }
}

// Main menu with improved UI
async function mainMenu() {
  console.log("\n💰 INDIGO YIELD PLATFORM - TRANSACTION MANAGEMENT");
  console.log("==================================================");

  const menuItems = [
    { label: "Record deposit", description: "Add funds to an investor account" },
    { label: "Record withdrawal", description: "Remove funds from an investor account" },
    { label: "View transaction history", description: "Show recent transaction activity" },
    { label: "Exit", description: "Close the transaction manager" },
  ];

  while (true) {
    try {
      const choice = await displayMenu("TRANSACTION MANAGEMENT MENU", menuItems);

      switch (choice) {
        case "1":
          await recordDeposit();
          break;
        case "2":
          await recordWithdrawal();
          break;
        case "3":
          await viewTransactionHistory();
          break;
        case "4":
          console.log("\n👋 Goodbye!\n");
          closePrompts();
          process.exit(0);
        default:
          console.log("❌ Invalid choice. Please select 1-4.");
      }
    } catch (error) {
      console.error("❌ Menu error:", error.message);
      break;
    }
  }
}

// Run the program with proper error handling
mainMenu().catch((error) => {
  console.error("❌ Fatal error:", error.message);
  closePrompts();
  process.exit(1);
});
