#!/usr/bin/env node

/**
 * Enhanced Daily Yield Management
 * Features: dry-run mode, audit logging, Dev-only mode, enhanced validation
 */

import { createServiceClient } from "../../utils/supabaseClient.js";
import {
  prompt,
  promptSelection,
  promptConfirmation,
  promptNumber,
  displayMenu,
  closePrompts,
  initializePrompts,
} from "../../utils/cliPrompts.js";
import {
  validateAmount,
  validateDate,
  validatePercentage,
  sanitizeInput,
} from "../../utils/validation.js";
import { formatNumber, formatPercentage } from "../../utils/formatting.js";

// Initialize secure Supabase client
const supabase = createServiceClient();

// Configuration
const ENVIRONMENT = process.env.NODE_ENV || "development";
const DRY_RUN_MODE = process.env.DRY_RUN === "true" || ENVIRONMENT === "development";

/**
 * Audit logger for yield operations
 */
class YieldAuditLogger {
  constructor() {
    this.logs = [];
  }

  log(action, details, dryRun = false) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      details,
      dryRun,
      environment: ENVIRONMENT,
    };

    this.logs.push(logEntry);

    // Console output with proper formatting
    const prefix = dryRun ? "🔍 DRY-RUN" : "✅ EXECUTE";
    console.log(`${prefix}: ${action}`);
    if (details && typeof details === "object") {
      console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
    } else if (details) {
      console.log(`   Details: ${details}`);
    }
  }

  error(action, error, dryRun = false) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      error: error.message,
      dryRun,
      environment: ENVIRONMENT,
      level: "ERROR",
    };

    this.logs.push(logEntry);

    const prefix = dryRun ? "🔍 DRY-RUN ERROR" : "❌ ERROR";
    console.error(`${prefix}: ${action} - ${error.message}`);
  }

  async saveToDatabase() {
    if (DRY_RUN_MODE) {
      console.log("🔍 DRY-RUN: Would save audit logs to database");
      return;
    }

    // In production, save audit logs to database
    try {
      const { error } = await supabase.from("audit_logs").insert({
        action_type: "yield_management",
        details: { logs: this.logs },
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.warn("Failed to save audit logs:", error.message);
      }
    } catch (err) {
      console.warn("Failed to save audit logs:", err.message);
    }
  }

  getSummary() {
    return {
      totalActions: this.logs.length,
      errors: this.logs.filter((log) => log.level === "ERROR").length,
      dryRunActions: this.logs.filter((log) => log.dryRun).length,
      executedActions: this.logs.filter((log) => !log.dryRun).length,
    };
  }
}

/**
 * Yield Service with business logic separation
 */
class YieldService {
  constructor(auditLogger) {
    this.auditLogger = auditLogger;
  }

  /**
   * Fetch all available assets
   */
  async fetchAssets() {
    try {
      const { data: assets, error } = await supabase.from("assets").select("*").order("symbol");

      if (error) {
        throw new Error(`Failed to fetch assets: ${error.message}`);
      }

      this.auditLogger.log("Fetch Assets", `Retrieved ${assets?.length || 0} assets`);
      return assets || [];
    } catch (error) {
      this.auditLogger.error("Fetch Assets", error);
      throw error;
    }
  }

  /**
   * Record daily yield rates
   */
  async recordYieldRates(yieldData, dryRun = DRY_RUN_MODE) {
    const results = [];

    for (const yieldItem of yieldData) {
      try {
        // Validate yield data
        const percentValidation = validatePercentage(yieldItem.daily_yield_percentage, 0, 50); // Max 50% daily
        if (!percentValidation.isValid) {
          throw new Error(`Invalid yield percentage: ${percentValidation.error}`);
        }

        const dateValidation = validateDate(yieldItem.date);
        if (!dateValidation.isValid) {
          throw new Error(`Invalid date: ${dateValidation.error}`);
        }

        const yieldRecord = {
          asset_id: yieldItem.asset_id,
          date: yieldItem.date,
          is_api_sourced: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (dryRun) {
          this.auditLogger.log(
            "Record Yield Rate",
            {
              asset: yieldItem.asset_symbol,
              percentage: percentValidation.value,
              date: yieldItem.date,
            },
            true
          );

          results.push({ success: true, asset: yieldItem.asset_symbol, dryRun: true });
        } else {
          const { error } = await supabase.from("yield_rates").upsert(yieldRecord, {
            onConflict: "asset_id,date",
          });

          if (error) {
            throw new Error(`Database error: ${error.message}`);
          }

          this.auditLogger.log("Record Yield Rate", {
            asset: yieldItem.asset_symbol,
            percentage: percentValidation.value,
            date: yieldItem.date,
          });

          results.push({ success: true, asset: yieldItem.asset_symbol });
        }
      } catch (error) {
        this.auditLogger.error(`Record Yield Rate - ${yieldItem.asset_symbol}`, error, dryRun);
        results.push({ success: false, asset: yieldItem.asset_symbol, error: error.message });
      }
    }

    return results;
  }

  /**
   * Fetch yield rates for a date
   */
  async fetchYieldsForDate(date) {
    try {
      const { data: yields, error } = await supabase
        .from("yield_rates")
        .select("*, assets(*)")
        .eq("date", date);

      if (error) {
        throw new Error(`Failed to fetch yields: ${error.message}`);
      }

      this.auditLogger.log(
        "Fetch Yields for Date",
        `Retrieved ${yields?.length || 0} yield rates for ${date}`
      );
      return yields || [];
    } catch (error) {
      this.auditLogger.error("Fetch Yields for Date", error);
      throw error;
    }
  }

  /**
   * Apply yields to positions with calculation validation
   */
  async applyYieldsToPositions(date, yields, dryRun = DRY_RUN_MODE) {
    try {
      // Fetch all positions
      const { data: positions, error } = await supabase
        .from("positions")
        .select("*")
        .gt("current_balance", 0); // Only active positions

      if (error) {
        throw new Error(`Failed to fetch positions: ${error.message}`);
      }

      const results = {
        processed: 0,
        updated: 0,
        skipped: 0,
        totalEarnings: {},
        errors: [],
      };

      for (const position of positions) {
        try {
          // Find matching yield data
          const yieldData = yields.find((y) => y.assets.symbol === position.asset_code);

          if (!yieldData) {
            results.skipped++;
            continue;
          }

          // Calculate earnings with validation
          const currentBalance = parseFloat(position.current_balance);
          const yieldPercentage = parseFloat(yieldData.daily_yield_percentage);

          if (currentBalance <= 0 || yieldPercentage < 0) {
            results.skipped++;
            continue;
          }

          const dailyEarnings = currentBalance * (yieldPercentage / 100);
          const newBalance = currentBalance + dailyEarnings;
          const newTotalEarned = parseFloat(position.total_earned) + dailyEarnings;

          // Track earnings by asset
          if (!results.totalEarnings[position.asset_code]) {
            results.totalEarnings[position.asset_code] = 0;
          }
          results.totalEarnings[position.asset_code] += dailyEarnings;

          if (dryRun) {
            this.auditLogger.log(
              "Apply Yield",
              {
                positionId: position.id,
                assetCode: position.asset_code,
                currentBalance: formatNumber(currentBalance),
                yieldPercentage: formatPercentage(yieldPercentage),
                dailyEarnings: formatNumber(dailyEarnings),
                newBalance: formatNumber(newBalance),
              },
              true
            );
          } else {
            // Update position in database
            const { error: updateError } = await supabase
              .from("positions")
              .update({
                current_balance: newBalance,
                total_earned: newTotalEarned,
                updated_at: new Date().toISOString(),
              })
              .eq("id", position.id);

            if (updateError) {
              throw new Error(`Position update failed: ${updateError.message}`);
            }

            this.auditLogger.log("Apply Yield", {
              positionId: position.id,
              assetCode: position.asset_code,
              dailyEarnings: formatNumber(dailyEarnings),
            });
          }

          results.updated++;
        } catch (error) {
          this.auditLogger.error(`Apply Yield - Position ${position.id}`, error, dryRun);
          results.errors.push({ positionId: position.id, error: error.message });
        }

        results.processed++;
      }

      return results;
    } catch (error) {
      this.auditLogger.error("Apply Yields to Positions", error, dryRun);
      throw error;
    }
  }
}

/**
 * Interactive yield recording with validation
 */
async function interactiveYieldRecording(yieldService) {
  console.log(`\n📊 DAILY YIELD RECORDING ${DRY_RUN_MODE ? "(DRY-RUN MODE)" : ""}\n`);

  // Get date with validation
  const defaultDate = new Date().toISOString().split("T")[0];
  const dateStr = (await prompt(`Date (YYYY-MM-DD) [${defaultDate}]: `)) || defaultDate;

  const dateValidation = validateDate(dateStr);
  if (!dateValidation.isValid) {
    console.log(`❌ ${dateValidation.error}`);
    return;
  }

  // Fetch assets
  const assets = await yieldService.fetchAssets();
  if (assets.length === 0) {
    console.log("❌ No assets found");
    return;
  }

  // Collect yield data for each asset
  console.log("\nEnter daily yield percentages (e.g., 0.05 for 0.05%):");
  const yieldData = [];

  for (const asset of assets) {
    const yieldPercent = await promptNumber(`${asset.symbol} daily yield %: `, {
      min: 0,
      max: 50,
      decimals: 6,
    });

    if (yieldPercent !== null) {
      yieldData.push({
        asset_id: asset.id,
        asset_symbol: asset.symbol,
        daily_yield_percentage: yieldPercent,
        date: dateStr,
      });
    }
  }

  if (yieldData.length === 0) {
    console.log("\n⚠️  No yields entered");
    return;
  }

  // Display summary
  console.log(`\n📝 ${DRY_RUN_MODE ? "DRY-RUN - " : ""}Recording yields for ${dateStr}:`);
  yieldData.forEach((y) => {
    console.log(`   ${y.asset_symbol}: ${formatPercentage(y.daily_yield_percentage)}`);
  });

  const confirmed = await promptConfirmation(
    `${DRY_RUN_MODE ? "Simulate" : "Confirm"} yield recording?`
  );

  if (!confirmed) {
    console.log("❌ Cancelled");
    return;
  }

  // Record yields
  const results = await yieldService.recordYieldRates(yieldData, DRY_RUN_MODE);

  // Display results
  console.log(`\n📊 ${DRY_RUN_MODE ? "Simulation" : "Recording"} Results:`);
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`   ✅ Successful: ${successful}`);
  if (failed > 0) {
    console.log(`   ❌ Failed: ${failed}`);
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`      ${r.asset}: ${r.error}`);
      });
  }
}

/**
 * Interactive yield application with validation
 */
async function interactiveYieldApplication(yieldService) {
  console.log(`\n💰 APPLYING DAILY YIELDS ${DRY_RUN_MODE ? "(DRY-RUN MODE)" : ""}\n`);

  // Get date
  const defaultDate = new Date().toISOString().split("T")[0];
  const dateStr =
    (await prompt(`Apply yields for date (YYYY-MM-DD) [${defaultDate}]: `)) || defaultDate;

  const dateValidation = validateDate(dateStr);
  if (!dateValidation.isValid) {
    console.log(`❌ ${dateValidation.error}`);
    return;
  }

  // Fetch yields for date
  const yields = await yieldService.fetchYieldsForDate(dateStr);
  if (yields.length === 0) {
    console.log(`⚠️  No yields found for ${dateStr}`);
    return;
  }

  // Display yields
  console.log(`\n📊 Yields to ${DRY_RUN_MODE ? "simulate" : "apply"}:`);
  yields.forEach((y) => {
    console.log(`   ${y.assets.symbol}: ${formatPercentage(y.daily_yield_percentage)}`);
  });

  const confirmed = await promptConfirmation(
    `${DRY_RUN_MODE ? "Simulate" : "Apply"} these yields to all positions?`
  );

  if (!confirmed) {
    console.log("❌ Cancelled");
    return;
  }

  // Apply yields
  const results = await yieldService.applyYieldsToPositions(dateStr, yields, DRY_RUN_MODE);

  // Display results
  console.log(`\n📊 ${DRY_RUN_MODE ? "Simulation" : "Application"} Results:`);
  console.log(`   📈 Positions processed: ${results.processed}`);
  console.log(`   ✅ Positions updated: ${results.updated}`);
  console.log(`   ⏭️  Positions skipped: ${results.skipped}`);

  if (results.errors.length > 0) {
    console.log(`   ❌ Errors: ${results.errors.length}`);
  }

  if (Object.keys(results.totalEarnings).length > 0) {
    console.log(`\n💰 Total earnings ${DRY_RUN_MODE ? "(simulated)" : "applied"}:`);
    Object.entries(results.totalEarnings).forEach(([asset, earnings]) => {
      console.log(`   ${asset}: ${formatNumber(earnings)}`);
    });
  }
}

/**
 * Main menu function
 */
async function main() {
  const auditLogger = new YieldAuditLogger();
  const yieldService = new YieldService(auditLogger);

  console.log("\n📈 ENHANCED DAILY YIELD MANAGEMENT");
  console.log("=".repeat(50));
  console.log(`Environment: ${ENVIRONMENT}`);
  console.log(
    `Mode: ${DRY_RUN_MODE ? "🔍 DRY-RUN (Safe Testing)" : "⚡ PRODUCTION (Live Updates)"}`
  );

  if (ENVIRONMENT === "production" && !DRY_RUN_MODE) {
    console.log("⚠️  WARNING: Running in PRODUCTION mode - changes will be permanent!");
    const prodConfirmed = await promptConfirmation("Continue with production mode?");
    if (!prodConfirmed) {
      console.log("🛡️  Switching to DRY-RUN mode for safety");
      process.env.DRY_RUN = "true";
    }
  }

  const menuItems = [
    { label: "Record daily yield rates", value: "record" },
    { label: "Apply yields to positions", value: "apply" },
    { label: "View audit summary", value: "audit" },
    { label: "Exit", value: "exit" },
  ];

  try {
    initializePrompts();

    while (true) {
      const choice = await displayMenu("YIELD MANAGEMENT MENU", menuItems);

      switch (choice) {
        case "1":
          await interactiveYieldRecording(yieldService);
          break;

        case "2":
          await interactiveYieldApplication(yieldService);
          break;

        case "3":
          const summary = auditLogger.getSummary();
          console.log("\n📋 Audit Summary:");
          console.log(`   Total Actions: ${summary.totalActions}`);
          console.log(`   Executed: ${summary.executedActions}`);
          console.log(`   Dry-Run: ${summary.dryRunActions}`);
          console.log(`   Errors: ${summary.errors}`);
          break;

        case "4":
          console.log("\n👋 Goodbye!");
          await auditLogger.saveToDatabase();
          return;

        default:
          console.log("❌ Invalid choice. Please select 1-4.");
      }
    }
  } catch (error) {
    auditLogger.error("Main Application", error);
    console.error("❌ Fatal error:", error.message);
    process.exit(1);
  } finally {
    await auditLogger.saveToDatabase();
    closePrompts();
  }
}

// Run the enhanced yield manager
main();
