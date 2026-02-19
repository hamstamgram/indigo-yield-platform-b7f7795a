/**
 * Replays all 48 fund-months of yield distributions using V5 engine,
 * then verifies each investor's balance against fund-balances.json.
 *
 * Prerequisites:
 *   1. V5 fix migration applied (20260228_fix_v5_opening_balance_allocation.sql)
 *   2. Crystallization markers applied (20260228_crystallization_markers.sql)
 *   3. IB schedule migration applied (20260228_ib_commission_schedule_activation_dates.sql)
 *
 * Usage:
 *   npx ts-node scripts/replay-all-yields.ts [--skip-cleanup] [--dry-run]
 *
 * The script will:
 *   1. Void all existing yield distributions (cleanup)
 *   2. Generate SQL to un-consolidate markers
 *   3. Replay V5 for each fund-month chronologically
 *   4. After each, compare investor balances to Excel reference
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

interface ClosingAum {
  fund: string;
  month: string;
  pClosing: number;
  totalGrossPct: number;
  totalYield: number;
}

interface FundBalance {
  fund: string;
  month: string;
  investor: string;
  balance: number;
}

interface InvestorInfo {
  name: string;
  email: string;
  accountType: string;
}

interface VerifyResult {
  fundMonth: string;
  investor: string;
  expected: number;
  actual: number;
  diff: number;
  pass: boolean;
}

const TOLERANCE: Record<string, number> = {
  BTC: 0.00000001,
  ETH: 0.00000001,
  SOL: 0.0000001,
  USDT: 0.01,
  XRP: 0.001,
};

function lastDayOfMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m, 0);
  return `${y}-${String(m).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function main() {
  const args = process.argv.slice(2);
  const skipCleanup = args.includes("--skip-cleanup");
  const dryRun = args.includes("--dry-run");

  console.log("=== V5 Yield Replay ===");
  console.log(`Skip cleanup: ${skipCleanup}`);
  console.log(`Dry run: ${dryRun}`);
  console.log();

  // Load reference data
  const closingAums: ClosingAum[] = JSON.parse(
    fs.readFileSync(path.join(__dirname, "seed-data/closing-aums.json"), "utf8")
  );
  const fundBalances: FundBalance[] = JSON.parse(
    fs.readFileSync(path.join(__dirname, "seed-data/fund-balances.json"), "utf8")
  );
  const investorsList: InvestorInfo[] = JSON.parse(
    fs.readFileSync(path.join(__dirname, "seed-data/investors.json"), "utf8")
  );

  // Build name -> email map (with case normalization)
  const nameToEmail = new Map<string, string>();
  for (const inv of investorsList) {
    nameToEmail.set(inv.name.toLowerCase(), inv.email);
  }
  // Special mappings
  nameToEmail.set("indigo fees", "fees@indigo.fund");

  // Build expected end-of-month balances: fund:month -> {investorName -> lastBalance}
  const expectedBalances = new Map<string, Map<string, number>>();
  for (const fb of fundBalances) {
    const key = `${fb.fund}:${fb.month}`;
    if (!expectedBalances.has(key)) {
      expectedBalances.set(key, new Map());
    }
    // Each entry overwrites previous (last entry = end-of-month balance)
    expectedBalances.get(key)!.set(fb.investor.toLowerCase(), fb.balance);
  }

  // Connect to Supabase
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Sign in as admin
  console.log("Signing in as admin...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "adriel@indigo.fund",
    password: "TestAdmin2026!",
  });

  if (authError || !authData.user) {
    console.error("Failed to sign in:", authError?.message);
    process.exit(1);
  }
  const adminId = authData.user.id;
  console.log(`Admin ID: ${adminId}`);

  // Get fund IDs
  const { data: funds } = await supabase
    .from("funds")
    .select("id, asset, code")
    .in("asset", ["BTC", "ETH", "USDT", "SOL", "XRP"]);

  if (!funds || funds.length === 0) {
    console.error("No funds found");
    process.exit(1);
  }

  const fundIdByAsset = new Map<string, string>();
  for (const f of funds) {
    fundIdByAsset.set(f.asset, f.id);
    console.log(`  Fund: ${f.code} (${f.asset}) -> ${f.id}`);
  }

  // Get profile name -> email mapping from DB
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, account_type");

  const emailToProfileId = new Map<string, string>();
  const profileIdToName = new Map<string, string>();
  if (profiles) {
    for (const p of profiles) {
      if (p.email) {
        emailToProfileId.set(p.email, p.id);
      }
      const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
      if (name) {
        profileIdToName.set(p.id, name);
      }
    }
  }

  // ================================================================
  // Phase 1: Cleanup
  // ================================================================
  if (!skipCleanup) {
    console.log("\n=== Phase 1: Cleanup ===");

    // Find all non-voided, non-marker yield distributions
    const { data: existingDists, error: distErr } = await supabase
      .from("yield_distributions")
      .select("id, fund_id, effective_date, reference_id, distribution_type, is_month_end")
      .eq("is_voided", false)
      .not("reference_id", "like", "crystal-marker:%")
      .order("effective_date", { ascending: false });

    if (distErr) {
      console.error("Failed to query distributions:", distErr.message);
      process.exit(1);
    }

    console.log(`Found ${existingDists?.length || 0} distributions to void`);

    if (existingDists && existingDists.length > 0 && !dryRun) {
      // Void month-end distributions first (they consolidate markers)
      const monthEndDists = existingDists.filter((d) => d.is_month_end);
      const otherDists = existingDists.filter((d) => !d.is_month_end);

      for (const dist of monthEndDists) {
        console.log(
          `  Voiding month-end: ${dist.effective_date} (${dist.reference_id || dist.id})`
        );
        const { error: voidErr } = await supabase.rpc("void_yield_distribution", {
          p_distribution_id: dist.id,
          p_admin_id: adminId,
          p_reason: "V5 replay cleanup",
          p_void_crystals: false,
        });
        if (voidErr) {
          console.error(`    FAILED: ${voidErr.message}`);
        }
      }

      for (const dist of otherDists) {
        console.log(
          `  Voiding: ${dist.effective_date} ${dist.distribution_type} (${dist.reference_id || dist.id})`
        );
        const { error: voidErr } = await supabase.rpc("void_yield_distribution", {
          p_distribution_id: dist.id,
          p_admin_id: adminId,
          p_reason: "V5 replay cleanup",
          p_void_crystals: false,
        });
        if (voidErr) {
          console.error(`    FAILED: ${voidErr.message}`);
        }
      }
    }

    // Generate SQL to un-consolidate markers
    const unconsolidateSql = [
      "-- Un-consolidate crystallization markers after voiding distributions",
      "SELECT set_config('indigo.canonical_rpc', 'true', true);",
      "",
      "UPDATE yield_distributions",
      "SET consolidated_into_id = NULL",
      "WHERE reference_id LIKE 'crystal-marker:%'",
      "  AND consolidated_into_id IS NOT NULL;",
      "",
      "-- Ensure markers are not voided",
      "UPDATE yield_distributions",
      "SET is_voided = false",
      "WHERE reference_id LIKE 'crystal-marker:%'",
      "  AND is_voided = true;",
    ].join("\n");

    const unconsolidatePath = path.join(
      __dirname,
      "../supabase/migrations/20260228_unconsolidate_markers.sql"
    );
    fs.writeFileSync(unconsolidatePath, unconsolidateSql);
    console.log(`\nWrote un-consolidation SQL to: ${unconsolidatePath}`);
    console.log(">>> APPLY THIS MIGRATION BEFORE CONTINUING <<<");

    if (!dryRun) {
      console.log("\nWaiting 3 seconds for DB to settle...");
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  if (dryRun) {
    console.log("\n=== Dry run complete. Showing what would be replayed: ===");
    for (const ca of closingAums) {
      if (ca.pClosing === 0) continue;
      console.log(`  ${ca.fund}:${ca.month} -> AUM=${ca.pClosing.toFixed(10)}`);
    }
    return;
  }

  // ================================================================
  // Phase 2: Replay
  // ================================================================
  console.log("\n=== Phase 2: Replay ===");

  const results: VerifyResult[] = [];
  let totalPass = 0;
  let totalFail = 0;

  // Sort closing AUMs chronologically
  const sortedAums = [...closingAums].sort((a, b) => {
    const cmp = a.month.localeCompare(b.month);
    return cmp !== 0 ? cmp : a.fund.localeCompare(b.fund);
  });

  for (const ca of sortedAums) {
    if (ca.pClosing === 0) {
      console.log(`\n  SKIP ${ca.fund}:${ca.month} (zero AUM)`);
      continue;
    }

    const fundId = fundIdByAsset.get(ca.fund);
    if (!fundId) {
      console.error(`  SKIP ${ca.fund}:${ca.month} (fund not found)`);
      continue;
    }

    const periodEnd = lastDayOfMonth(ca.month);
    const tolerance = TOLERANCE[ca.fund] || 0.00000001;

    console.log(`\n  APPLYING ${ca.fund}:${ca.month} | AUM=${ca.pClosing.toFixed(10)}`);

    const { data: applyResult, error: applyErr } = await supabase.rpc(
      "apply_segmented_yield_distribution_v5",
      {
        p_fund_id: fundId,
        p_period_end: periodEnd,
        p_recorded_aum: ca.pClosing,
        p_admin_id: adminId,
        p_purpose: "transaction",
      }
    );

    if (applyErr) {
      console.error(`    FAILED: ${applyErr.message}`);
      totalFail++;
      continue;
    }

    const result = applyResult as Record<string, unknown>;
    console.log(
      `    gross=${result.gross_yield}, net=${result.net_yield}, ` +
        `fees=${result.total_fees}, ib=${result.total_ib}, ` +
        `segments=${result.segment_count}, investors=${result.investor_count}`
    );

    // Verify conservation identity
    const gross = Number(result.gross_yield || 0);
    const net = Number(result.net_yield || 0);
    const fees = Number(result.total_fees || 0);
    const ib = Number(result.total_ib || 0);
    const dust = Number(result.dust_amount || 0);
    const conservationResidual = Math.abs(gross - (net + fees + ib + dust));
    if (conservationResidual > tolerance) {
      console.error(`    CONSERVATION VIOLATION: residual=${conservationResidual}`);
    }

    // Verify investor balances
    const expectedKey = `${ca.fund}:${ca.month}`;
    const expectedMap = expectedBalances.get(expectedKey);

    if (!expectedMap) {
      console.log(`    No expected balances for ${expectedKey}`);
      continue;
    }

    // Query current positions for this fund
    const { data: positions } = await supabase
      .from("investor_positions")
      .select("investor_id, current_value")
      .eq("fund_id", fundId);

    // Build actual balance map: investorName -> balance
    const actualBalances = new Map<string, number>();
    if (positions) {
      for (const pos of positions) {
        const name = profileIdToName.get(pos.investor_id);
        const profile = profiles?.find((p) => p.id === pos.investor_id);
        const email = profile?.email || "";

        // Try to find matching name in expected balances
        let matchKey = "";
        if (name) {
          matchKey = name.toLowerCase();
        }

        // Also try by account type for fees accounts
        if (profile?.account_type === "fees_account") {
          matchKey = "indigo fees";
        }

        if (matchKey) {
          actualBalances.set(matchKey, Number(pos.current_value));
        }
      }
    }

    // Compare
    let monthPass = 0;
    let monthFail = 0;

    for (const [investorName, expectedBalance] of expectedMap) {
      const actualBalance = actualBalances.get(investorName);

      if (actualBalance === undefined) {
        // Investor might not have a position yet (zero balance)
        if (Math.abs(expectedBalance) < tolerance) {
          monthPass++;
          continue;
        }
        console.error(`    MISSING: ${investorName} expected=${expectedBalance}`);
        monthFail++;
        results.push({
          fundMonth: expectedKey,
          investor: investorName,
          expected: expectedBalance,
          actual: 0,
          diff: expectedBalance,
          pass: false,
        });
        continue;
      }

      const diff = Math.abs(actualBalance - expectedBalance);
      const pass = diff <= tolerance;

      if (!pass) {
        console.error(
          `    MISMATCH: ${investorName} expected=${expectedBalance} actual=${actualBalance} diff=${diff}`
        );
      }

      results.push({
        fundMonth: expectedKey,
        investor: investorName,
        expected: expectedBalance,
        actual: actualBalance,
        diff,
        pass,
      });

      if (pass) monthPass++;
      else monthFail++;
    }

    console.log(`    Verified: ${monthPass} pass, ${monthFail} fail`);
    totalPass += monthPass;
    totalFail += monthFail;
  }

  // ================================================================
  // Phase 3: Summary
  // ================================================================
  console.log("\n========================================");
  console.log("           REPLAY SUMMARY");
  console.log("========================================");
  console.log(`Total checks: ${totalPass + totalFail}`);
  console.log(`Pass: ${totalPass}`);
  console.log(`Fail: ${totalFail}`);

  if (totalFail > 0) {
    console.log("\n--- FAILURES ---");
    const failures = results.filter((r) => !r.pass);
    for (const f of failures) {
      console.log(
        `  ${f.fundMonth} | ${f.investor} | expected=${f.expected} actual=${f.actual} diff=${f.diff}`
      );
    }
  }

  // Write results to file
  const resultsPath = path.join(__dirname, "seed-data/replay-results.json");
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\nResults written to: ${resultsPath}`);

  process.exit(totalFail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
