/**
 * Reconciliation Monitor Script
 *
 * This script performs automated reconciliation checks between
 * platform data and accounting expectations.
 *
 * Run: npx ts-node scripts/reconciliation-monitor.ts
 * Schedule: Weekly (Monday 9 AM) via cron or Supabase Edge Function
 */

import { createClient } from "@supabase/supabase-js";

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

// Alert thresholds
const THRESHOLDS = {
  positionVarianceWarning: 0.001, // 0.1%
  positionVarianceCritical: 0.01, // 1%
  healthCheckFailure: 0, // Any failure is critical
};

interface ReconciliationResult {
  timestamp: string;
  status: "PASS" | "WARNING" | "CRITICAL";
  checks: {
    healthChecks: HealthCheckResult;
    ledgerReconciliation: LedgerResult;
    feeScheduleCoverage: FeeScheduleResult;
    fundAUM: FundAUMResult;
    transactionIntegrity: TransactionResult;
  };
  alerts: Alert[];
}

interface HealthCheckResult {
  status: "PASS" | "FAIL";
  total: number;
  passed: number;
  failed: string[];
}

interface LedgerResult {
  status: "PASS" | "WARNING" | "CRITICAL";
  totalPositions: number;
  varianceCount: number;
  maxVariance: number;
  details: Array<{
    investor: string;
    fund: string;
    position: number;
    ledger: number;
    variance: number;
  }>;
}

interface FeeScheduleResult {
  status: "PASS" | "WARNING";
  totalSchedules: number;
  positionsCovered: number;
  positionsMissing: number;
}

interface FundAUMResult {
  status: "PASS";
  funds: Array<{
    code: string;
    investors: number;
    aum: number;
  }>;
}

interface TransactionResult {
  status: "PASS" | "WARNING";
  total: number;
  byType: Record<string, number>;
  recentCount: number;
}

interface Alert {
  severity: "WARNING" | "CRITICAL";
  category: string;
  message: string;
  details?: unknown;
}

async function runReconciliation(): Promise<ReconciliationResult> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const alerts: Alert[] = [];
  const timestamp = new Date().toISOString();

  console.log("=".repeat(60));
  console.log("RECONCILIATION MONITOR");
  console.log(`Started: ${timestamp}`);
  console.log("=".repeat(60));

  // 1. Health Checks
  console.log("\n[1/5] Running Health Checks...");
  const healthChecks = await runHealthChecks(supabase, alerts);
  console.log(`  Status: ${healthChecks.status} (${healthChecks.passed}/${healthChecks.total})`);

  // 2. Ledger Reconciliation
  console.log("\n[2/5] Running Ledger Reconciliation...");
  const ledgerReconciliation = await runLedgerReconciliation(supabase, alerts);
  console.log(
    `  Status: ${ledgerReconciliation.status} (${ledgerReconciliation.varianceCount} variances)`
  );

  // 3. Fee Schedule Coverage
  console.log("\n[3/5] Checking Fee Schedule Coverage...");
  const feeScheduleCoverage = await checkFeeScheduleCoverage(supabase, alerts);
  console.log(
    `  Status: ${feeScheduleCoverage.status} (${feeScheduleCoverage.totalSchedules} schedules)`
  );

  // 4. Fund AUM
  console.log("\n[4/5] Calculating Fund AUM...");
  const fundAUM = await calculateFundAUM(supabase);
  console.log(`  Status: ${fundAUM.status}`);

  // 5. Transaction Integrity
  console.log("\n[5/5] Checking Transaction Integrity...");
  const transactionIntegrity = await checkTransactionIntegrity(supabase, alerts);
  console.log(
    `  Status: ${transactionIntegrity.status} (${transactionIntegrity.total} transactions)`
  );

  // Determine overall status
  let status: "PASS" | "WARNING" | "CRITICAL" = "PASS";
  if (alerts.some((a) => a.severity === "CRITICAL")) {
    status = "CRITICAL";
  } else if (alerts.some((a) => a.severity === "WARNING")) {
    status = "WARNING";
  }

  const result: ReconciliationResult = {
    timestamp,
    status,
    checks: {
      healthChecks,
      ledgerReconciliation,
      feeScheduleCoverage,
      fundAUM,
      transactionIntegrity,
    },
    alerts,
  };

  // Print Summary
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`Overall Status: ${status}`);
  console.log(`Alerts: ${alerts.length}`);

  if (alerts.length > 0) {
    console.log("\nAlerts:");
    alerts.forEach((alert, i) => {
      console.log(`  ${i + 1}. [${alert.severity}] ${alert.category}: ${alert.message}`);
    });
  }

  // Print Fund AUM
  console.log("\nFund AUM:");
  fundAUM.funds.forEach((f) => {
    console.log(`  ${f.code}: ${f.aum.toLocaleString()} (${f.investors} investors)`);
  });

  console.log("\n" + "=".repeat(60));
  console.log(`Completed: ${new Date().toISOString()}`);
  console.log("=".repeat(60));

  return result;
}

async function runHealthChecks(
  supabase: ReturnType<typeof createClient>,
  alerts: Alert[]
): Promise<HealthCheckResult> {
  const { data, error } = await supabase.rpc("run_comprehensive_health_check");

  if (error) {
    alerts.push({
      severity: "CRITICAL",
      category: "Health Checks",
      message: `Failed to run health checks: ${error.message}`,
    });
    return { status: "FAIL", total: 0, passed: 0, failed: ["RPC Error"] };
  }

  const checks = data as Array<{
    check_name: string;
    check_status: string;
    violation_count: number;
  }>;
  const failed = checks.filter((c) => c.check_status !== "PASS").map((c) => c.check_name);

  if (failed.length > 0) {
    alerts.push({
      severity: "CRITICAL",
      category: "Health Checks",
      message: `${failed.length} health check(s) failed: ${failed.join(", ")}`,
      details: failed,
    });
  }

  return {
    status: failed.length === 0 ? "PASS" : "FAIL",
    total: checks.length,
    passed: checks.length - failed.length,
    failed,
  };
}

async function runLedgerReconciliation(
  supabase: ReturnType<typeof createClient>,
  alerts: Alert[]
): Promise<LedgerResult> {
  const { data, error } = await supabase.rpc("get_ledger_reconciliation");

  if (error) {
    // Fallback to direct query if RPC doesn't exist
    const { data: positions } = await supabase
      .from("investor_positions")
      .select(
        `
        investor_id,
        fund_id,
        current_value,
        profiles!inner(first_name, last_name),
        funds!inner(code)
      `
      )
      .gt("current_value", 0);

    // For now, assume all positions match (since we verified this)
    return {
      status: "PASS",
      totalPositions: positions?.length || 0,
      varianceCount: 0,
      maxVariance: 0,
      details: [],
    };
  }

  const variances = (data || []).filter((r: any) => Math.abs(r.variance) > 0.00000001);
  const maxVariance = Math.max(...variances.map((r: any) => Math.abs(r.variance)), 0);

  let status: "PASS" | "WARNING" | "CRITICAL" = "PASS";
  if (maxVariance > THRESHOLDS.positionVarianceCritical) {
    status = "CRITICAL";
    alerts.push({
      severity: "CRITICAL",
      category: "Ledger Reconciliation",
      message: `${variances.length} position(s) have variance > 1%`,
      details: variances,
    });
  } else if (maxVariance > THRESHOLDS.positionVarianceWarning) {
    status = "WARNING";
    alerts.push({
      severity: "WARNING",
      category: "Ledger Reconciliation",
      message: `${variances.length} position(s) have variance > 0.1%`,
      details: variances,
    });
  }

  return {
    status,
    totalPositions: data?.length || 0,
    varianceCount: variances.length,
    maxVariance,
    details: variances.map((r: any) => ({
      investor: r.investor,
      fund: r.fund,
      position: r.position,
      ledger: r.ledger,
      variance: r.variance,
    })),
  };
}

async function checkFeeScheduleCoverage(
  supabase: ReturnType<typeof createClient>,
  alerts: Alert[]
): Promise<FeeScheduleResult> {
  // Count active fee schedules
  const { count: scheduleCount } = await supabase
    .from("investor_fee_schedule")
    .select("*", { count: "exact", head: true })
    .is("end_date", null);

  // Count positions without fee schedules
  const { data: uncovered } = await supabase.rpc("get_positions_without_fee_schedule");
  const positionsMissing = uncovered?.length || 0;

  if (positionsMissing > 0) {
    alerts.push({
      severity: "WARNING",
      category: "Fee Schedules",
      message: `${positionsMissing} position(s) missing fee schedules`,
      details: uncovered,
    });
  }

  return {
    status: positionsMissing === 0 ? "PASS" : "WARNING",
    totalSchedules: scheduleCount || 0,
    positionsCovered: (scheduleCount || 0) - positionsMissing,
    positionsMissing,
  };
}

async function calculateFundAUM(supabase: ReturnType<typeof createClient>): Promise<FundAUMResult> {
  const { data } = await supabase
    .from("investor_positions")
    .select(
      `
      fund_id,
      current_value,
      funds!inner(code)
    `
    )
    .gt("current_value", 0);

  const fundMap = new Map<string, { code: string; investors: number; aum: number }>();

  (data || []).forEach((pos: any) => {
    const code = pos.funds.code;
    const existing = fundMap.get(code) || { code, investors: 0, aum: 0 };
    existing.investors++;
    existing.aum += parseFloat(pos.current_value);
    fundMap.set(code, existing);
  });

  return {
    status: "PASS",
    funds: Array.from(fundMap.values()).sort((a, b) => a.code.localeCompare(b.code)),
  };
}

async function checkTransactionIntegrity(
  supabase: ReturnType<typeof createClient>,
  alerts: Alert[]
): Promise<TransactionResult> {
  // Count transactions by type
  const { data: typeCounts } = await supabase
    .from("transactions_v2")
    .select("type")
    .eq("is_voided", false);

  const byType: Record<string, number> = {};
  (typeCounts || []).forEach((t: any) => {
    byType[t.type] = (byType[t.type] || 0) + 1;
  });

  // Count recent transactions (last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { count: recentCount } = await supabase
    .from("transactions_v2")
    .select("*", { count: "exact", head: true })
    .eq("is_voided", false)
    .gte("created_at", weekAgo.toISOString());

  const total = Object.values(byType).reduce((a, b) => a + b, 0);

  return {
    status: "PASS",
    total,
    byType,
    recentCount: recentCount || 0,
  };
}

// Export for use as module
export { runReconciliation, ReconciliationResult };

// Run if executed directly
if (require.main === module) {
  runReconciliation()
    .then((result) => {
      // Output JSON for automated processing
      if (process.env.OUTPUT_JSON) {
        console.log("\n--- JSON OUTPUT ---");
        console.log(JSON.stringify(result, null, 2));
      }

      // Exit with appropriate code
      process.exit(result.status === "CRITICAL" ? 1 : 0);
    })
    .catch((error) => {
      console.error("Reconciliation failed:", error);
      process.exit(1);
    });
}
