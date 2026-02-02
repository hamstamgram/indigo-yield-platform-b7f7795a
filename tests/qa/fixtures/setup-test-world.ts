#!/usr/bin/env tsx
/**
 * Setup Test World
 *
 * Creates the QA test world with 8 investors + 2 IBs across 6 funds.
 * Uses canonical RPCs for all financial mutations.
 *
 * Usage:
 *   npx tsx tests/qa/fixtures/setup-test-world.ts
 *
 * Environment variables required:
 *   - VITE_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import { join } from "path";
import {
  TEST_FUNDS,
  TEST_IBS,
  TEST_INVESTORS,
  generateQARunTag,
  QA_PASSWORD,
  DEFAULT_CLOSING_AUM,
  RATE_LIMIT_DELAY_MS,
  TEST_PURPOSES,
  type TestWorldState,
  type FundSlug,
  type ProfileId,
  type FundId,
  type UUID,
} from "./test-world";

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
// FUND LOOKUP
// ============================================================================

/**
 * Look up fund IDs by slug
 */
async function lookupFunds(): Promise<Record<FundSlug, FundId>> {
  log("Looking up fund IDs...");
  const fundMap: Partial<Record<FundSlug, FundId>> = {};

  for (const fund of TEST_FUNDS) {
    const { data, error } = await supabase
      .from("funds")
      .select("id")
      .eq("slug", fund.slug)
      .single();

    if (error || !data) {
      throw new Error(`Failed to find fund ${fund.slug}: ${error?.message}`);
    }

    fundMap[fund.slug] = data.id;
    log(`  ${fund.slug} → ${data.id}`, "success");
  }

  return fundMap as Record<FundSlug, FundId>;
}

// ============================================================================
// IB CREATION
// ============================================================================

/**
 * Create test IBs
 */
async function createIBs(runTag: string): Promise<Record<string, ProfileId>> {
  log("Creating test IBs...");
  const ibMap: Record<string, ProfileId> = {};

  for (const ib of TEST_IBS) {
    log(`  Creating ${ib.email}...`);

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: ib.email,
      password: QA_PASSWORD,
      email_confirm: true,
      user_metadata: {
        display_name: ib.displayName,
        first_name: ib.firstName,
        last_name: ib.lastName,
      },
    });

    if (authError || !authData.user) {
      throw new Error(`Failed to create auth user for ${ib.email}: ${authError?.message}`);
    }

    const userId = authData.user.id;
    log(`    Auth user created: ${userId}`);

    // Update profile to IB role
    const { data: profileData, error: profileError } = await supabase.rpc(
      "update_user_profile_secure",
      {
        p_user_id: userId,
        p_updates: {
          role: "investor", // IBs are investors with IB settings
          is_ib: true,
          ib_commission_rate: ib.commissionRate,
          notes: `QA IB - ${runTag}`,
        },
      }
    );

    if (profileError) {
      throw new Error(`Failed to update profile for ${ib.email}: ${profileError.message}`);
    }

    ibMap[ib.email.split("@")[0]] = userId; // Key by prefix (e.g., "qa-ib-primary")
    log(`    IB created: ${userId} (${ib.commissionRate}% commission)`, "success");

    await sleep(RATE_LIMIT_DELAY_MS);
  }

  return ibMap;
}

// ============================================================================
// INVESTOR CREATION
// ============================================================================

/**
 * Create test investors
 */
async function createInvestors(
  runTag: string,
  ibMap: Record<string, ProfileId>
): Promise<Record<string, ProfileId>> {
  log("Creating test investors...");
  const investorMap: Record<string, ProfileId> = {};

  for (const investor of TEST_INVESTORS) {
    log(`  Creating ${investor.email}...`);

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: investor.email,
      password: QA_PASSWORD,
      email_confirm: true,
      user_metadata: {
        display_name: investor.displayName,
        first_name: investor.firstName,
        last_name: investor.lastName,
      },
    });

    if (authError || !authData.user) {
      throw new Error(`Failed to create auth user for ${investor.email}: ${authError?.message}`);
    }

    const userId = authData.user.id;
    log(`    Auth user created: ${userId}`);

    // Determine IB referrer if needed
    let ibReferrerId: ProfileId | null = null;
    if (investor.email.includes("ib-referred")) {
      ibReferrerId = ibMap["qa-ib-primary"];
      log(`    IB referrer: ${ibReferrerId}`);
    }

    // Update profile
    const profileUpdates: Record<string, unknown> = {
      role: "investor",
      notes: `QA Investor - ${investor.scenario} - ${runTag}`,
    };

    if (ibReferrerId) {
      profileUpdates.ib_referrer_id = ibReferrerId;
    }

    const { error: profileError } = await supabase.rpc("update_user_profile_secure", {
      p_user_id: userId,
      p_updates: profileUpdates,
    });

    if (profileError) {
      throw new Error(`Failed to update profile for ${investor.email}: ${profileError.message}`);
    }

    investorMap[investor.email.split("@")[0]] = userId; // Key by prefix
    log(`    Investor created: ${userId}`, "success");

    await sleep(RATE_LIMIT_DELAY_MS);
  }

  return investorMap;
}

// ============================================================================
// DEPOSIT APPLICATION
// ============================================================================

/**
 * Apply deposits for all investors
 */
async function applyDeposits(
  investorMap: Record<string, ProfileId>,
  fundMap: Record<FundSlug, FundId>,
  runTag: string
): Promise<UUID[]> {
  log("Applying deposits...");
  const transactionIds: UUID[] = [];

  // Get admin user ID for audit trail
  const { data: adminData, error: adminError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", "qa.admin@indigo.fund")
    .single();

  if (adminError || !adminData) {
    throw new Error("Failed to find QA admin user");
  }

  const adminId = adminData.id;

  for (const investor of TEST_INVESTORS) {
    if (!investor.deposits || investor.deposits.length === 0) continue;

    const investorId = investorMap[investor.email.split("@")[0]];
    log(`  Processing deposits for ${investor.email}...`);

    for (const deposit of investor.deposits) {
      const fundId = fundMap[deposit.fundSlug];
      log(`    ${deposit.amount} ${deposit.fundSlug} on ${deposit.effectiveDate}`);

      const { data, error } = await supabase.rpc("apply_deposit_with_crystallization", {
        p_fund_id: fundId,
        p_investor_id: investorId,
        p_amount: deposit.amount,
        p_closing_aum: DEFAULT_CLOSING_AUM,
        p_effective_date: deposit.effectiveDate,
        p_admin_id: adminId,
        p_notes: deposit.notes || `QA deposit - ${runTag}`,
        p_purpose: TEST_PURPOSES.DEPOSIT,
      });

      if (error) {
        throw new Error(`Failed to apply deposit for ${investor.email}: ${error.message}`);
      }

      if (data && typeof data === "object" && "transaction_id" in data) {
        transactionIds.push(data.transaction_id as UUID);
        log(`      Transaction created: ${data.transaction_id}`, "success");
      }

      await sleep(RATE_LIMIT_DELAY_MS);
    }
  }

  return transactionIds;
}

// ============================================================================
// WITHDRAWAL APPLICATION
// ============================================================================

/**
 * Apply withdrawals for applicable investors
 */
async function applyWithdrawals(
  investorMap: Record<string, ProfileId>,
  fundMap: Record<FundSlug, FundId>,
  runTag: string
): Promise<UUID[]> {
  log("Applying withdrawals...");
  const transactionIds: UUID[] = [];

  // Get admin user ID
  const { data: adminData, error: adminError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", "qa.admin@indigo.fund")
    .single();

  if (adminError || !adminData) {
    throw new Error("Failed to find QA admin user");
  }

  const adminId = adminData.id;

  for (const investor of TEST_INVESTORS) {
    if (!investor.withdrawals || investor.withdrawals.length === 0) continue;

    const investorId = investorMap[investor.email.split("@")[0]];
    log(`  Processing withdrawals for ${investor.email}...`);

    for (const withdrawal of investor.withdrawals) {
      const fundId = fundMap[withdrawal.fundSlug];
      log(`    ${withdrawal.amount} ${withdrawal.fundSlug} on ${withdrawal.effectiveDate}`);

      // Get current position to calculate new AUM
      const { data: positionData, error: positionError } = await supabase
        .from("positions")
        .select("current_value")
        .eq("profile_id", investorId)
        .eq("fund_id", fundId)
        .single();

      if (positionError || !positionData) {
        throw new Error(`Failed to find position for withdrawal: ${positionError?.message}`);
      }

      const currentValue = parseFloat(positionData.current_value);
      const withdrawalAmount = parseFloat(withdrawal.amount);
      const newTotalAum = Math.max(0, currentValue - withdrawalAmount).toFixed(8);

      const { data, error } = await supabase.rpc("apply_withdrawal_with_crystallization", {
        p_fund_id: fundId,
        p_investor_id: investorId,
        p_amount: withdrawal.amount,
        p_new_total_aum: newTotalAum,
        p_tx_date: withdrawal.effectiveDate,
        p_admin_id: adminId,
        p_notes: withdrawal.notes || `QA withdrawal - ${runTag}`,
        p_purpose: TEST_PURPOSES.WITHDRAWAL,
      });

      if (error) {
        throw new Error(`Failed to apply withdrawal for ${investor.email}: ${error.message}`);
      }

      if (data && typeof data === "object" && "transaction_id" in data) {
        transactionIds.push(data.transaction_id as UUID);
        log(`      Transaction created: ${data.transaction_id}`, "success");
      }

      await sleep(RATE_LIMIT_DELAY_MS);
    }
  }

  return transactionIds;
}

// ============================================================================
// STATE PERSISTENCE
// ============================================================================

/**
 * Save test world state to JSON
 */
function saveState(state: TestWorldState): void {
  const outputPath = join(__dirname, "test-world-state.json");
  writeFileSync(outputPath, JSON.stringify(state, null, 2), "utf-8");
  log(`Test world state saved to ${outputPath}`, "success");
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  log("=".repeat(80));
  log("QA TEST WORLD SETUP");
  log("=".repeat(80));

  const runTag = generateQARunTag();
  log(`Run tag: ${runTag}`);

  try {
    // 1. Lookup funds
    const fundMap = await lookupFunds();
    log(`Found ${Object.keys(fundMap).length} funds`, "success");

    // 2. Create IBs
    const ibMap = await createIBs(runTag);
    log(`Created ${Object.keys(ibMap).length} IBs`, "success");

    // 3. Create investors
    const investorMap = await createInvestors(runTag, ibMap);
    log(`Created ${Object.keys(investorMap).length} investors`, "success");

    // 4. Apply deposits
    const depositTxIds = await applyDeposits(investorMap, fundMap, runTag);
    log(`Applied ${depositTxIds.length} deposits`, "success");

    // 5. Apply withdrawals
    const withdrawalTxIds = await applyWithdrawals(investorMap, fundMap, runTag);
    log(`Applied ${withdrawalTxIds.length} withdrawals`, "success");

    // 6. Save state
    const state: TestWorldState = {
      runTag,
      timestamp: new Date().toISOString(),
      funds: fundMap,
      investors: investorMap,
      ibs: ibMap,
      transactionIds: [...depositTxIds, ...withdrawalTxIds],
    };

    saveState(state);

    log("=".repeat(80));
    log("TEST WORLD SETUP COMPLETE", "success");
    log("=".repeat(80));
    log(`Total investors: ${Object.keys(investorMap).length}`);
    log(`Total IBs: ${Object.keys(ibMap).length}`);
    log(`Total transactions: ${state.transactionIds.length}`);
    log("=".repeat(80));
  } catch (error) {
    log(`Setup failed: ${error}`, "error");
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
