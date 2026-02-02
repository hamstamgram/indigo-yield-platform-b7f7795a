#!/usr/bin/env tsx
/**
 * Teardown Test World
 *
 * Cleans up the QA test world by:
 * - Voiding all tagged transactions
 * - Deleting test profiles (investors + IBs)
 * - Removing test data
 *
 * Usage:
 *   npx tsx tests/qa/fixtures/teardown-test-world.ts
 *
 * Environment variables required:
 *   - VITE_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import type { TestWorldState, UUID } from "./test-world";

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing required environment variables:");
  console.error("   VITE_SUPABASE_URL:", SUPABASE_URL ? "✓" : "✗");
  console.error("   SUPABASE_SERVICE_ROLE_KEY:", SERVICE_ROLE_KEY ? "✓" : "✗");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const STATE_FILE_PATH = join(__dirname, "test-world-state.json");

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sleep for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Log with timestamp
 */
function log(message: string, level: "info" | "success" | "error" | "warn" = "info") {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: "ℹ️",
    success: "✅",
    error: "❌",
    warn: "⚠️",
  }[level];
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

// ============================================================================
// STATE LOADING
// ============================================================================

/**
 * Load test world state from JSON
 */
function loadState(): TestWorldState | null {
  if (!existsSync(STATE_FILE_PATH)) {
    log("No test world state file found", "warn");
    return null;
  }

  try {
    const content = readFileSync(STATE_FILE_PATH, "utf-8");
    const state = JSON.parse(content) as TestWorldState;
    log(`Loaded state from ${STATE_FILE_PATH}`);
    return state;
  } catch (error) {
    log(`Failed to load state file: ${error}`, "error");
    return null;
  }
}

// ============================================================================
// TRANSACTION CLEANUP
// ============================================================================

/**
 * Void all test transactions
 */
async function voidTransactions(transactionIds: UUID[]): Promise<number> {
  if (transactionIds.length === 0) {
    log("No transactions to void", "warn");
    return 0;
  }

  log(`Voiding ${transactionIds.length} transactions...`);
  let voidedCount = 0;
  let errorCount = 0;

  // Get admin user ID for audit trail
  const { data: adminData } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", "qa.admin@indigo.fund")
    .single();

  const adminId = adminData?.id;

  if (!adminId) {
    log("Warning: Could not find QA admin user for audit trail", "warn");
  }

  for (const txId of transactionIds) {
    try {
      // Check if transaction exists and is not already voided
      const { data: txData, error: checkError } = await supabase
        .from("transactions")
        .select("id, status")
        .eq("id", txId)
        .single();

      if (checkError || !txData) {
        log(`  Transaction ${txId} not found (may be already deleted)`, "warn");
        continue;
      }

      if (txData.status === "voided") {
        log(`  Transaction ${txId} already voided`, "info");
        voidedCount++;
        continue;
      }

      // Void the transaction
      const { error: voidError } = await supabase.rpc("void_transaction", {
        p_transaction_id: txId,
        p_admin_id: adminId || txId, // Fallback to tx id if no admin
        p_void_reason: "QA test cleanup",
      });

      if (voidError) {
        log(`  Failed to void ${txId}: ${voidError.message}`, "error");
        errorCount++;
      } else {
        log(`  Voided transaction ${txId}`, "success");
        voidedCount++;
      }

      await sleep(500); // Rate limit delay
    } catch (error) {
      log(`  Error processing ${txId}: ${error}`, "error");
      errorCount++;
    }
  }

  log(`Voided ${voidedCount} transactions (${errorCount} errors)`, "info");
  return voidedCount;
}

// ============================================================================
// PROFILE CLEANUP
// ============================================================================

/**
 * Delete test profiles (investors + IBs)
 */
async function deleteProfiles(
  investorIds: string[],
  ibIds: string[]
): Promise<{ investors: number; ibs: number }> {
  log("Deleting test profiles...");
  let investorCount = 0;
  let ibCount = 0;
  let errorCount = 0;

  const allProfileIds = [...investorIds, ...ibIds];

  if (allProfileIds.length === 0) {
    log("No profiles to delete", "warn");
    return { investors: 0, ibs: 0 };
  }

  for (const profileId of allProfileIds) {
    try {
      const isIB = ibIds.includes(profileId);
      const type = isIB ? "IB" : "investor";

      // Check if profile exists
      const { data: profileData, error: checkError } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("id", profileId)
        .single();

      if (checkError || !profileData) {
        log(`  ${type} ${profileId} not found (may be already deleted)`, "warn");
        continue;
      }

      // Delete using force_delete_investor RPC (works for both investors and IBs)
      const { error: deleteError } = await supabase.rpc("force_delete_investor", {
        p_investor_id: profileId,
      });

      if (deleteError) {
        log(`  Failed to delete ${type} ${profileData.email}: ${deleteError.message}`, "error");
        errorCount++;
      } else {
        log(`  Deleted ${type} ${profileData.email}`, "success");
        if (isIB) {
          ibCount++;
        } else {
          investorCount++;
        }
      }

      await sleep(500); // Rate limit delay
    } catch (error) {
      log(`  Error processing profile ${profileId}: ${error}`, "error");
      errorCount++;
    }
  }

  log(`Deleted ${investorCount} investors and ${ibCount} IBs (${errorCount} errors)`, "info");
  return { investors: investorCount, ibs: ibCount };
}

// ============================================================================
// AUTH USER CLEANUP
// ============================================================================

/**
 * Delete auth users for test profiles
 */
async function deleteAuthUsers(profileIds: string[]): Promise<number> {
  log("Deleting auth users...");
  let deletedCount = 0;
  let errorCount = 0;

  for (const userId of profileIds) {
    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) {
        // Ignore "user not found" errors (may have been cascade deleted)
        if (error.message.includes("not found")) {
          log(`  Auth user ${userId} already deleted`, "info");
        } else {
          log(`  Failed to delete auth user ${userId}: ${error.message}`, "error");
          errorCount++;
        }
      } else {
        log(`  Deleted auth user ${userId}`, "success");
        deletedCount++;
      }

      await sleep(300); // Rate limit delay
    } catch (error) {
      log(`  Error deleting auth user ${userId}: ${error}`, "error");
      errorCount++;
    }
  }

  log(`Deleted ${deletedCount} auth users (${errorCount} errors)`, "info");
  return deletedCount;
}

// ============================================================================
// STATE FILE CLEANUP
// ============================================================================

/**
 * Delete the state file
 */
function deleteStateFile(): void {
  if (existsSync(STATE_FILE_PATH)) {
    try {
      unlinkSync(STATE_FILE_PATH);
      log(`Deleted state file: ${STATE_FILE_PATH}`, "success");
    } catch (error) {
      log(`Failed to delete state file: ${error}`, "error");
    }
  } else {
    log("State file already deleted or not found", "info");
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  log("=".repeat(80));
  log("QA TEST WORLD TEARDOWN");
  log("=".repeat(80));

  try {
    // 1. Load state
    const state = loadState();

    if (!state) {
      log("No test world state to clean up", "warn");
      process.exit(0);
    }

    log(`Run tag: ${state.runTag}`);
    log(`Created at: ${state.timestamp}`);

    // 2. Void transactions
    const voidedCount = await voidTransactions(state.transactionIds);

    // 3. Delete profiles
    const investorIds = Object.values(state.investors);
    const ibIds = Object.values(state.ibs);
    const { investors, ibs } = await deleteProfiles(investorIds, ibIds);

    // 4. Delete auth users
    const allProfileIds = [...investorIds, ...ibIds];
    const authDeletedCount = await deleteAuthUsers(allProfileIds);

    // 5. Delete state file
    deleteStateFile();

    // Summary
    log("=".repeat(80));
    log("TEARDOWN COMPLETE", "success");
    log("=".repeat(80));
    log(`Transactions voided: ${voidedCount}`);
    log(`Investors deleted: ${investors}`);
    log(`IBs deleted: ${ibs}`);
    log(`Auth users deleted: ${authDeletedCount}`);
    log("=".repeat(80));
  } catch (error) {
    log(`Teardown failed: ${error}`, "error");
    if (error instanceof Error) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
