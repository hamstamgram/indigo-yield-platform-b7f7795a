/**
 * Phase 4: Database Invariant Validation
 *
 * Implements 12 critical DB invariant checks against live Supabase database.
 * Each check verifies a fundamental property that must always hold true.
 *
 * Run: npx tsx tests/qa/invariants/db-invariants.ts
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import Decimal from "decimal.js";

// Supabase client setup
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    "Missing Supabase credentials. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Dust tolerance for decimal comparisons
const DUST_TOLERANCE = new Decimal("0.00000001");

interface InvariantResult {
  name: string;
  passed: boolean;
  details: string;
  severity: "critical" | "warning" | "info";
}

/**
 * Invariant 1: AUM Conservation
 * Fund AUM = SUM(investor positions) ± dust tolerance
 */
async function checkAUMConservation(): Promise<InvariantResult> {
  const name = "AUM Conservation";
  const severity = "critical";

  try {
    // Get latest AUM per fund from fund_daily_aum
    const { data: aumData, error: aumError } = await supabase
      .from("fund_daily_aum")
      .select("fund_id, total_aum")
      .eq("is_voided", false)
      .order("as_of_date", { ascending: false });

    if (aumError) throw aumError;

    // Get latest AUM per fund (first occurrence per fund_id)
    const latestAUM = new Map<string, Decimal>();
    aumData?.forEach((row) => {
      if (!latestAUM.has(row.fund_id)) {
        latestAUM.set(row.fund_id, new Decimal(row.total_aum || 0));
      }
    });

    // Get SUM of investor positions per fund
    const { data: posData, error: posError } = await supabase
      .from("investor_positions")
      .select("fund_id, current_value");

    if (posError) throw posError;

    const positionSums = new Map<string, Decimal>();
    posData?.forEach((row) => {
      const current = positionSums.get(row.fund_id) || new Decimal(0);
      positionSums.set(row.fund_id, current.add(new Decimal(row.current_value || 0)));
    });

    // Compare
    const mismatches: string[] = [];
    const allFunds = new Set([...latestAUM.keys(), ...positionSums.keys()]);

    for (const fundId of allFunds) {
      const aumVal = latestAUM.get(fundId) || new Decimal(0);
      const posVal = positionSums.get(fundId) || new Decimal(0);
      const diff = aumVal.minus(posVal).abs();

      if (diff.greaterThan(DUST_TOLERANCE)) {
        mismatches.push(
          `Fund ${fundId}: AUM=${aumVal.toFixed(8)}, Positions=${posVal.toFixed(8)}, Diff=${diff.toFixed(8)}`
        );
      }
    }

    if (mismatches.length > 0) {
      return {
        name,
        passed: false,
        details: `AUM mismatch in ${mismatches.length} fund(s):\n${mismatches.join("\n")}`,
        severity,
      };
    }

    return {
      name,
      passed: true,
      details: `All ${allFunds.size} funds match (AUM = SUM(positions))`,
      severity,
    };
  } catch (error) {
    return {
      name,
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : String(error)}`,
      severity,
    };
  }
}

/**
 * Invariant 2: Position-Ledger Match
 * position.current_value = SUM(credited txns) - SUM(debited txns)
 */
async function checkPositionLedgerMatch(): Promise<InvariantResult> {
  const name = "Position-Ledger Match";
  const severity = "critical";

  try {
    // Credit types
    const creditTypes = [
      "DEPOSIT",
      "YIELD",
      "INTEREST",
      "FEE_CREDIT",
      "IB_CREDIT",
      "INTERNAL_CREDIT",
    ];

    // Debit types
    const debitTypes = ["WITHDRAWAL", "FEE", "INTERNAL_WITHDRAWAL", "IB_DEBIT"];

    // Get all non-voided transactions
    const { data: txns, error: txError } = await supabase
      .from("transactions_v2")
      .select("investor_id, fund_id, type, amount")
      .eq("is_voided", false);

    if (txError) throw txError;

    // Calculate ledger balances
    const ledgerBalances = new Map<string, Decimal>();
    txns?.forEach((tx) => {
      const key = `${tx.investor_id}:${tx.fund_id}`;
      const current = ledgerBalances.get(key) || new Decimal(0);
      const amount = new Decimal(tx.amount || 0);

      if (creditTypes.includes(tx.type)) {
        ledgerBalances.set(key, current.add(amount));
      } else if (debitTypes.includes(tx.type)) {
        ledgerBalances.set(key, current.minus(amount));
      }
    });

    // Get actual positions
    const { data: positions, error: posError } = await supabase
      .from("investor_positions")
      .select("investor_id, fund_id, current_value");

    if (posError) throw posError;

    const positionBalances = new Map<string, Decimal>();
    positions?.forEach((pos) => {
      const key = `${pos.investor_id}:${pos.fund_id}`;
      positionBalances.set(key, new Decimal(pos.current_value || 0));
    });

    // Compare
    const mismatches: string[] = [];
    const allKeys = new Set([...ledgerBalances.keys(), ...positionBalances.keys()]);

    for (const key of allKeys) {
      const ledgerVal = ledgerBalances.get(key) || new Decimal(0);
      const posVal = positionBalances.get(key) || new Decimal(0);
      const diff = ledgerVal.minus(posVal).abs();

      if (diff.greaterThan(DUST_TOLERANCE)) {
        mismatches.push(
          `${key}: Ledger=${ledgerVal.toFixed(8)}, Position=${posVal.toFixed(8)}, Diff=${diff.toFixed(8)}`
        );
      }
    }

    if (mismatches.length > 0) {
      return {
        name,
        passed: false,
        details: `Position-ledger mismatch in ${mismatches.length} position(s):\n${mismatches.join("\n")}`,
        severity,
      };
    }

    return {
      name,
      passed: true,
      details: `All ${allKeys.size} positions match ledger`,
      severity,
    };
  } catch (error) {
    return {
      name,
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : String(error)}`,
      severity,
    };
  }
}

/**
 * Invariant 3: Cost Basis Integrity
 * cost_basis = SUM(deposits) - SUM(withdrawals)
 */
async function checkCostBasisIntegrity(): Promise<InvariantResult> {
  const name = "Cost Basis Integrity";
  const severity = "critical";

  try {
    // Get deposits and withdrawals per position
    const { data: txns, error: txError } = await supabase
      .from("transactions_v2")
      .select("investor_id, fund_id, type, amount")
      .eq("is_voided", false)
      .in("type", ["DEPOSIT", "WITHDRAWAL"]);

    if (txError) throw txError;

    const costBasisLedger = new Map<string, Decimal>();
    txns?.forEach((tx) => {
      const key = `${tx.investor_id}:${tx.fund_id}`;
      const current = costBasisLedger.get(key) || new Decimal(0);
      const amount = new Decimal(tx.amount || 0);

      if (tx.type === "DEPOSIT") {
        costBasisLedger.set(key, current.add(amount));
      } else if (tx.type === "WITHDRAWAL") {
        costBasisLedger.set(key, current.minus(amount));
      }
    });

    // Get actual cost_basis from positions
    const { data: positions, error: posError } = await supabase
      .from("investor_positions")
      .select("investor_id, fund_id, cost_basis");

    if (posError) throw posError;

    const mismatches: string[] = [];
    positions?.forEach((pos) => {
      const key = `${pos.investor_id}:${pos.fund_id}`;
      const ledgerCB = costBasisLedger.get(key) || new Decimal(0);
      const actualCB = new Decimal(pos.cost_basis || 0);
      const diff = ledgerCB.minus(actualCB).abs();

      if (diff.greaterThan(DUST_TOLERANCE)) {
        mismatches.push(
          `${key}: Ledger=${ledgerCB.toFixed(8)}, Position=${actualCB.toFixed(8)}, Diff=${diff.toFixed(8)}`
        );
      }
    });

    if (mismatches.length > 0) {
      return {
        name,
        passed: false,
        details: `Cost basis mismatch in ${mismatches.length} position(s):\n${mismatches.join("\n")}`,
        severity,
      };
    }

    return {
      name,
      passed: true,
      details: `All ${positions?.length || 0} positions have correct cost_basis`,
      severity,
    };
  } catch (error) {
    return {
      name,
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : String(error)}`,
      severity,
    };
  }
}

/**
 * Invariant 4: Yield Conservation
 * For each yield_distribution: gross_yield ≈ fees + ib_fees + net_yield + dust
 */
async function checkYieldConservation(): Promise<InvariantResult> {
  const name = "Yield Conservation";
  const severity = "critical";

  try {
    const { data: yields, error } = await supabase
      .from("yield_distributions")
      .select(
        "yield_id, fund_id, yield_date, gross_yield, total_fee_amount, total_ib_fee, total_net_amount"
      )
      .eq("is_voided", false)
      .eq("status", "applied");

    if (error) throw error;

    const violations: string[] = [];

    yields?.forEach((y) => {
      const gross = new Decimal(y.gross_yield || 0);
      const fees = new Decimal(y.total_fee_amount || 0);
      const ibFees = new Decimal(y.total_ib_fee || 0);
      const net = new Decimal(y.total_net_amount || 0);

      const expected = fees.add(ibFees).add(net);
      const diff = gross.minus(expected).abs();

      if (diff.greaterThan(DUST_TOLERANCE)) {
        violations.push(
          `Yield ${y.yield_id} (${y.fund_id} ${y.yield_date}): Gross=${gross.toFixed(8)}, Fees+IB+Net=${expected.toFixed(8)}, Diff=${diff.toFixed(8)}`
        );
      }
    });

    if (violations.length > 0) {
      return {
        name,
        passed: false,
        details: `Yield conservation violated in ${violations.length} distribution(s):\n${violations.join("\n")}`,
        severity,
      };
    }

    return {
      name,
      passed: true,
      details: `All ${yields?.length || 0} yield distributions conserve gross_yield`,
      severity,
    };
  } catch (error) {
    return {
      name,
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : String(error)}`,
      severity,
    };
  }
}

/**
 * Invariant 5: No Orphans
 * No transactions without valid investor/fund
 */
async function checkNoOrphans(): Promise<InvariantResult> {
  const name = "No Orphan Transactions";
  const severity = "critical";

  try {
    // Check for transactions with invalid investor_id
    const { data: orphanInvestors, error: err1 } = await supabase
      .from("transactions_v2")
      .select("transaction_id, investor_id")
      .is("investor_id", null);

    if (err1) throw err1;

    // Check for transactions with invalid fund_id
    const { data: orphanFunds, error: err2 } = await supabase
      .from("transactions_v2")
      .select("transaction_id, fund_id")
      .is("fund_id", null);

    if (err2) throw err2;

    // Check for transactions referencing non-existent profiles
    const { data: txns, error: err3 } = await supabase
      .from("transactions_v2")
      .select("transaction_id, investor_id");

    if (err3) throw err3;

    const { data: profiles, error: err4 } = await supabase.from("profiles").select("id");

    if (err4) throw err4;

    const validProfileIds = new Set(profiles?.map((p) => p.id) || []);
    const invalidProfiles = txns?.filter((tx) => !validProfileIds.has(tx.investor_id)) || [];

    // Check for transactions referencing non-existent funds
    const { data: funds, error: err5 } = await supabase.from("funds").select("fund_id");

    if (err5) throw err5;

    const validFundIds = new Set(funds?.map((f) => f.fund_id) || []);
    const { data: txnFunds, error: err6 } = await supabase
      .from("transactions_v2")
      .select("transaction_id, fund_id");

    if (err6) throw err6;

    const invalidFunds = txnFunds?.filter((tx) => !validFundIds.has(tx.fund_id)) || [];

    const totalOrphans =
      (orphanInvestors?.length || 0) +
      (orphanFunds?.length || 0) +
      invalidProfiles.length +
      invalidFunds.length;

    if (totalOrphans > 0) {
      const details: string[] = [];
      if (orphanInvestors?.length)
        details.push(`${orphanInvestors.length} txns with NULL investor_id`);
      if (orphanFunds?.length) details.push(`${orphanFunds.length} txns with NULL fund_id`);
      if (invalidProfiles.length)
        details.push(`${invalidProfiles.length} txns with invalid investor_id`);
      if (invalidFunds.length) details.push(`${invalidFunds.length} txns with invalid fund_id`);

      return {
        name,
        passed: false,
        details: `Found ${totalOrphans} orphan transaction(s):\n${details.join("\n")}`,
        severity,
      };
    }

    return {
      name,
      passed: true,
      details: "All transactions have valid investor_id and fund_id",
      severity,
    };
  } catch (error) {
    return {
      name,
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : String(error)}`,
      severity,
    };
  }
}

/**
 * Invariant 6: No Invalid Enums
 * All type/status/source values are in canonical sets
 */
async function checkNoInvalidEnums(): Promise<InvariantResult> {
  const name = "No Invalid Enums";
  const severity = "critical";

  try {
    const validTxTypes = [
      "DEPOSIT",
      "WITHDRAWAL",
      "YIELD",
      "INTEREST",
      "FEE",
      "FEE_CREDIT",
      "IB_CREDIT",
      "IB_DEBIT",
      "INTERNAL_CREDIT",
      "INTERNAL_WITHDRAWAL",
      "COMMISSION_PAYOUT",
    ];

    const validYieldStatuses = ["pending", "applied", "voided"];

    // Check transactions_v2.type
    const { data: txns, error: err1 } = await supabase
      .from("transactions_v2")
      .select("transaction_id, type");

    if (err1) throw err1;

    const invalidTxTypes = txns?.filter((tx) => !validTxTypes.includes(tx.type)) || [];

    // Check yield_distributions.status
    const { data: yields, error: err2 } = await supabase
      .from("yield_distributions")
      .select("yield_id, status");

    if (err2) throw err2;

    const invalidYieldStatuses =
      yields?.filter((y) => !validYieldStatuses.includes(y.status)) || [];

    const totalInvalid = invalidTxTypes.length + invalidYieldStatuses.length;

    if (totalInvalid > 0) {
      const details: string[] = [];
      if (invalidTxTypes.length) {
        const types = [...new Set(invalidTxTypes.map((t) => t.type))];
        details.push(`${invalidTxTypes.length} txns with invalid type: ${types.join(", ")}`);
      }
      if (invalidYieldStatuses.length) {
        const statuses = [...new Set(invalidYieldStatuses.map((y) => y.status))];
        details.push(
          `${invalidYieldStatuses.length} yields with invalid status: ${statuses.join(", ")}`
        );
      }

      return {
        name,
        passed: false,
        details: `Found ${totalInvalid} invalid enum value(s):\n${details.join("\n")}`,
        severity,
      };
    }

    return {
      name,
      passed: true,
      details: `All enum values are valid (${txns?.length || 0} txns, ${yields?.length || 0} yields checked)`,
      severity,
    };
  } catch (error) {
    return {
      name,
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : String(error)}`,
      severity,
    };
  }
}

/**
 * Invariant 7: No Negative Balances
 * investor_positions.current_value >= -dust
 */
async function checkNoNegativeBalances(): Promise<InvariantResult> {
  const name = "No Negative Balances";
  const severity = "critical";

  try {
    const { data: positions, error } = await supabase
      .from("investor_positions")
      .select("investor_id, fund_id, current_value")
      .lt("current_value", 0);

    if (error) throw error;

    const violations =
      positions?.filter((p) => {
        const val = new Decimal(p.current_value || 0);
        return val.lessThan(DUST_TOLERANCE.neg());
      }) || [];

    if (violations.length > 0) {
      const details = violations.map(
        (v) => `${v.investor_id}:${v.fund_id} = ${new Decimal(v.current_value).toFixed(8)}`
      );

      return {
        name,
        passed: false,
        details: `Found ${violations.length} negative balance(s):\n${details.join("\n")}`,
        severity,
      };
    }

    return {
      name,
      passed: true,
      details: "All positions have non-negative current_value",
      severity,
    };
  } catch (error) {
    return {
      name,
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : String(error)}`,
      severity,
    };
  }
}

/**
 * Invariant 8: Voided Metadata
 * All voided records have voided_at and voided_by populated
 */
async function checkVoidedMetadata(): Promise<InvariantResult> {
  const name = "Voided Metadata";
  const severity = "warning";

  try {
    // Check transactions_v2
    const { data: voidedTxns, error: err1 } = await supabase
      .from("transactions_v2")
      .select("transaction_id, voided_at, voided_by")
      .eq("is_voided", true);

    if (err1) throw err1;

    const incompleteTxns = voidedTxns?.filter((tx) => !tx.voided_at || !tx.voided_by) || [];

    // Check yield_distributions
    const { data: voidedYields, error: err2 } = await supabase
      .from("yield_distributions")
      .select("yield_id, voided_at, voided_by")
      .eq("is_voided", true);

    if (err2) throw err2;

    const incompleteYields = voidedYields?.filter((y) => !y.voided_at || !y.voided_by) || [];

    const totalIncomplete = incompleteTxns.length + incompleteYields.length;

    if (totalIncomplete > 0) {
      const details: string[] = [];
      if (incompleteTxns.length)
        details.push(`${incompleteTxns.length} txns missing voided metadata`);
      if (incompleteYields.length)
        details.push(`${incompleteYields.length} yields missing voided metadata`);

      return {
        name,
        passed: false,
        details: `Found ${totalIncomplete} voided record(s) with incomplete metadata:\n${details.join("\n")}`,
        severity,
      };
    }

    return {
      name,
      passed: true,
      details: `All voided records have complete metadata (${voidedTxns?.length || 0} txns, ${voidedYields?.length || 0} yields)`,
      severity,
    };
  } catch (error) {
    return {
      name,
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : String(error)}`,
      severity,
    };
  }
}

/**
 * Invariant 9: Unique Reference IDs
 * No duplicate reference_id in non-voided transactions
 */
async function checkUniqueReferenceIDs(): Promise<InvariantResult> {
  const name = "Unique Reference IDs";
  const severity = "critical";

  try {
    const { data: txns, error } = await supabase
      .from("transactions_v2")
      .select("reference_id")
      .eq("is_voided", false)
      .not("reference_id", "is", null);

    if (error) throw error;

    const refIds = txns?.map((tx) => tx.reference_id) || [];
    const uniqueRefs = new Set(refIds);
    const duplicates = refIds.filter((id, idx) => refIds.indexOf(id) !== idx);
    const uniqueDuplicates = [...new Set(duplicates)];

    if (uniqueDuplicates.length > 0) {
      return {
        name,
        passed: false,
        details: `Found ${uniqueDuplicates.length} duplicate reference_id(s):\n${uniqueDuplicates.join(", ")}`,
        severity,
      };
    }

    return {
      name,
      passed: true,
      details: `All ${uniqueRefs.size} reference_ids are unique`,
      severity,
    };
  } catch (error) {
    return {
      name,
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : String(error)}`,
      severity,
    };
  }
}

/**
 * Invariant 10: Crystallization Gaps
 * Check if any active investors have stale crystallization dates
 */
async function checkCrystallizationGaps(): Promise<InvariantResult> {
  const name = "Crystallization Gaps";
  const severity = "warning";

  try {
    // Get latest yield_date per fund
    const { data: latestYields, error: err1 } = await supabase
      .from("yield_distributions")
      .select("fund_id, yield_date")
      .eq("is_voided", false)
      .order("yield_date", { ascending: false });

    if (err1) throw err1;

    const latestYieldDate = new Map<string, Date>();
    latestYields?.forEach((y) => {
      if (!latestYieldDate.has(y.fund_id)) {
        latestYieldDate.set(y.fund_id, new Date(y.yield_date));
      }
    });

    // Get positions with last_crystallized_at
    const { data: positions, error: err2 } = await supabase
      .from("investor_positions")
      .select("investor_id, fund_id, last_crystallized_at, current_value")
      .gt("current_value", 0);

    if (err2) throw err2;

    const stalePositions: string[] = [];
    const oneDayMs = 24 * 60 * 60 * 1000;

    positions?.forEach((pos) => {
      const latestYield = latestYieldDate.get(pos.fund_id);
      if (!latestYield) return;

      const crystallizedAt = pos.last_crystallized_at ? new Date(pos.last_crystallized_at) : null;
      if (!crystallizedAt) {
        stalePositions.push(`${pos.investor_id}:${pos.fund_id} - never crystallized`);
        return;
      }

      const gap = latestYield.getTime() - crystallizedAt.getTime();
      if (gap > oneDayMs) {
        const daysGap = Math.floor(gap / oneDayMs);
        stalePositions.push(
          `${pos.investor_id}:${pos.fund_id} - ${daysGap} day(s) behind (last: ${crystallizedAt.toISOString().split("T")[0]}, latest: ${latestYield.toISOString().split("T")[0]})`
        );
      }
    });

    if (stalePositions.length > 0) {
      return {
        name,
        passed: false,
        details: `Found ${stalePositions.length} position(s) with stale crystallization:\n${stalePositions.join("\n")}`,
        severity,
      };
    }

    return {
      name,
      passed: true,
      details: `All ${positions?.length || 0} active positions are up-to-date`,
      severity,
    };
  } catch (error) {
    return {
      name,
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : String(error)}`,
      severity,
    };
  }
}

/**
 * Invariant 11: Withdrawal State Machine
 * No completed withdrawal without approved+processing history
 */
async function checkWithdrawalStateMachine(): Promise<InvariantResult> {
  const name = "Withdrawal State Machine";
  const severity = "critical";

  try {
    // Get all completed withdrawals
    const { data: completedWDs, error: err1 } = await supabase
      .from("transactions_v2")
      .select("transaction_id, reference_id")
      .eq("type", "WITHDRAWAL")
      .eq("is_voided", false);

    if (err1) throw err1;

    // Check audit_log for each
    const violations: string[] = [];

    for (const wd of completedWDs || []) {
      const { data: auditLogs, error: err2 } = await supabase
        .from("audit_log")
        .select("action, new_data")
        .eq("table_name", "withdrawals")
        .eq("record_id", wd.reference_id || wd.transaction_id);

      if (err2) throw err2;

      if (!auditLogs || auditLogs.length === 0) {
        violations.push(`${wd.transaction_id} - no audit log`);
        continue;
      }

      const hasApproved = auditLogs.some((log) => {
        const newData = log.new_data as any;
        return newData?.status === "approved" || log.action === "APPROVED";
      });

      const hasProcessing = auditLogs.some((log) => {
        const newData = log.new_data as any;
        return newData?.status === "processing" || log.action === "PROCESSING";
      });

      if (!hasApproved || !hasProcessing) {
        violations.push(
          `${wd.transaction_id} - missing states (approved: ${hasApproved}, processing: ${hasProcessing})`
        );
      }
    }

    if (violations.length > 0) {
      return {
        name,
        passed: false,
        details: `Found ${violations.length} withdrawal(s) with invalid state transitions:\n${violations.join("\n")}`,
        severity,
      };
    }

    return {
      name,
      passed: true,
      details: `All ${completedWDs?.length || 0} withdrawals have valid state machine history`,
      severity,
    };
  } catch (error) {
    return {
      name,
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : String(error)}`,
      severity,
    };
  }
}

/**
 * Invariant 12: Integrity Pack
 * Call run_integrity_pack() RPC and verify overall_status = 'pass'
 */
async function checkIntegrityPack(): Promise<InvariantResult> {
  const name = "Integrity Pack";
  const severity = "critical";

  try {
    const { data, error } = await supabase.rpc("run_integrity_pack");

    if (error) throw error;

    const result = data as any;
    const overallStatus = result?.overall_status || "unknown";

    if (overallStatus !== "pass") {
      const failures = result?.checks?.filter((c: any) => c.status !== "pass") || [];
      const details = failures.map((f: any) => `${f.check_name}: ${f.message}`).join("\n");

      return {
        name,
        passed: false,
        details: `Integrity pack failed (${overallStatus}):\n${details || "No details available"}`,
        severity,
      };
    }

    const checkCount = result?.checks?.length || 0;

    return {
      name,
      passed: true,
      details: `Integrity pack passed (${checkCount} checks)`,
      severity,
    };
  } catch (error) {
    return {
      name,
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : String(error)}`,
      severity,
    };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Phase 4: Database Invariant Validation");
  console.log("═══════════════════════════════════════════════════════════\n");

  const invariants = [
    checkAUMConservation,
    checkPositionLedgerMatch,
    checkCostBasisIntegrity,
    checkYieldConservation,
    checkNoOrphans,
    checkNoInvalidEnums,
    checkNoNegativeBalances,
    checkVoidedMetadata,
    checkUniqueReferenceIDs,
    checkCrystallizationGaps,
    checkWithdrawalStateMachine,
    checkIntegrityPack,
  ];

  const results: InvariantResult[] = [];

  for (const invariant of invariants) {
    const result = await invariant();
    results.push(result);

    const symbol = result.passed ? "✓" : "✗";
    const status = result.passed ? "PASS" : "FAIL";
    const color = result.passed ? "\x1b[32m" : "\x1b[31m"; // Green or Red
    const reset = "\x1b[0m";

    console.log(`${color}[${status}]${reset} ${symbol} ${result.name}`);
    console.log(`       ${result.details}\n`);
  }

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const critical = results.filter((r) => !r.passed && r.severity === "critical").length;
  const warnings = results.filter((r) => !r.passed && r.severity === "warning").length;

  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Summary: ${passed}/${results.length} passed`);
  if (critical > 0) console.log(`  Critical failures: ${critical}`);
  if (warnings > 0) console.log(`  Warnings: ${warnings}`);
  console.log("═══════════════════════════════════════════════════════════\n");

  // Write JSON report
  const report = {
    timestamp: new Date().toISOString(),
    phase: "Phase 4: Database Invariants",
    summary: {
      total: results.length,
      passed,
      failed,
      critical,
      warnings,
    },
    invariants: results,
  };

  const reportsDir = join(process.cwd(), "tests", "qa", "reports");
  mkdirSync(reportsDir, { recursive: true });
  const reportPath = join(reportsDir, "phase4-invariants.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`Report written to: ${reportPath}\n`);

  // Exit with error code if any critical failures
  if (critical > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
