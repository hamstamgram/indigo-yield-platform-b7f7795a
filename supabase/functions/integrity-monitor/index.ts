import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, getCorsHeaders } from "../_shared/cors.ts";

interface IntegrityCheck {
  name: string;
  query: string;
  severity: "critical" | "warning" | "info";
  description: string;
}

interface CheckResult {
  name: string;
  status: "pass" | "fail";
  severity: string;
  count: number;
  description: string;
  sample?: Record<string, unknown>[];
}

const INTEGRITY_CHECKS: IntegrityCheck[] = [
  {
    name: "Transaction Distribution Orphans",
    query: "SELECT * FROM v_transaction_distribution_orphans LIMIT 5",
    severity: "critical",
    description: "Transactions missing distribution links",
  },
  // Note: v_period_orphans removed - fund_period_snapshot table no longer exists
  {
    name: "IB Allocation Orphans",
    query: "SELECT * FROM v_ib_allocation_orphans LIMIT 5",
    severity: "warning",
    description: "IB allocations with missing distribution references",
  },
  {
    name: "Fee Allocation Orphans",
    query: "SELECT * FROM v_fee_allocation_orphans LIMIT 5",
    severity: "warning",
    description: "Fee allocations with missing references",
  },
  {
    name: "Fund AUM Mismatch",
    query: "SELECT * FROM fund_aum_mismatch LIMIT 5",
    severity: "critical",
    description: "Fund AUM does not match sum of investor positions",
  },
  {
    name: "Yield Distribution Conservation",
    query: "SELECT * FROM yield_distribution_conservation_check LIMIT 5",
    severity: "critical",
    description: "Yield distributions with allocation discrepancies",
  },
  {
    name: "IB Allocation Consistency",
    query: "SELECT * FROM ib_allocation_consistency LIMIT 5",
    severity: "warning",
    description: "Introducing broker allocations with consistency issues",
  },
  // Crystallization checks (P0)
  {
    name: "Crystallization Gaps",
    query: "SELECT * FROM v_crystallization_gaps WHERE gap_type = 'stale_crystallization' LIMIT 5",
    severity: "critical",
    description: "Positions with stale crystallization before transaction",
  },
  {
    name: "Never Crystallized Positions",
    query: "SELECT * FROM v_crystallization_gaps WHERE gap_type = 'never_crystallized' LIMIT 5",
    severity: "warning",
    description: "Positions that have never been crystallized",
  },
  {
    name: "Transaction Source Audit",
    query:
      "SELECT * FROM v_transaction_sources WHERE source NOT IN ('rpc_canonical', 'crystallization', 'manual_admin', 'yield_distribution', 'system', 'migration', 'reconciliation_fix', 'position_sync', 'import', 'correction') LIMIT 5",
    severity: "warning",
    description: "Transactions from unapproved sources",
  },
  {
    name: "Ledger Position Reconciliation",
    query: "SELECT * FROM v_ledger_reconciliation LIMIT 5",
    severity: "critical",
    description: "Position balances do not match ledger transactions",
  },
  {
    name: "Missing Withdrawal Transactions",
    query: "SELECT * FROM v_missing_withdrawal_transactions LIMIT 5",
    severity: "critical",
    description: "Completed withdrawals without ledger transactions",
  },
  {
    name: "Potential Duplicate Profiles",
    query:
      "SELECT * FROM v_potential_duplicate_profiles WHERE duplicate_type = 'email_duplicate' LIMIT 5",
    severity: "warning",
    description: "Duplicate investor profiles detected by email",
  },
  {
    name: "Yield Conservation Violations",
    query: "SELECT * FROM v_yield_conservation_violations LIMIT 5",
    severity: "critical",
    description: "Yield distributions violating conservation identity",
  },
];

async function runIntegrityChecks(supabase: any): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  for (const check of INTEGRITY_CHECKS) {
    try {
      const { data, error } = (await supabase.rpc("exec_sql", { sql: check.query })) as {
        data: any[] | null;
        error: any;
      };

      if (error) {
        // Fallback: try direct query for views
        const viewName = check.query.match(/FROM\s+(\w+)/i)?.[1];
        if (viewName) {
          const { data: viewData, error: viewError } = await supabase
            .from(viewName)
            .select("*")
            .limit(5);

          if (!viewError && viewData) {
            results.push({
              name: check.name,
              status: viewData.length === 0 ? "pass" : "fail",
              severity: check.severity,
              count: viewData.length,
              description: check.description,
              sample: viewData.length > 0 ? viewData : undefined,
            });
            continue;
          }
        }

        results.push({
          name: check.name,
          status: "fail",
          severity: check.severity,
          count: -1,
          description: `Error: ${error.message}`,
        });
        continue;
      }

      const dataArray = data as any[] | null;
      const count = Array.isArray(dataArray) ? dataArray.length : 0;
      results.push({
        name: check.name,
        status: count === 0 ? "pass" : "fail",
        severity: check.severity,
        count,
        description: check.description,
        sample: count > 0 && dataArray ? dataArray.slice(0, 3) : undefined,
      });
    } catch (err) {
      results.push({
        name: check.name,
        status: "fail",
        severity: check.severity,
        count: -1,
        description: `Exception: ${err instanceof Error ? err.message : "Unknown error"}`,
      });
    }
  }

  return results;
}

async function sendSlackAlert(webhookUrl: string, results: CheckResult[]): Promise<void> {
  const failures = results.filter((r) => r.status === "fail");
  if (failures.length === 0) return;

  const criticalCount = failures.filter((r) => r.severity === "critical").length;
  const warningCount = failures.filter((r) => r.severity === "warning").length;

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🚨 Indigo Platform Integrity Alert",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${criticalCount} critical* and *${warningCount} warning* issues detected.`,
      },
    },
    { type: "divider" },
    ...failures.map((f) => ({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${f.severity === "critical" ? "🔴" : "🟡"} *${f.name}*\n${f.description}\nAffected records: ${f.count}`,
      },
    })),
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Checked at ${new Date().toISOString()} | <https://your-app.vercel.app/admin/integrity|View Dashboard>`,
        },
      ],
    },
  ];

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks }),
  });
}

async function sendEmailAlert(supabase: any, email: string, results: CheckResult[]): Promise<void> {
  const failures = results.filter((r) => r.status === "fail");
  if (failures.length === 0) return;

  const criticalCount = failures.filter((r) => r.severity === "critical").length;
  const warningCount = failures.filter((r) => r.severity === "warning").length;

  const htmlContent = `
    <h2>🚨 Indigo Platform Integrity Alert</h2>
    <p><strong>${criticalCount} critical</strong> and <strong>${warningCount} warning</strong> issues detected.</p>
    <hr/>
    <ul>
      ${failures
        .map(
          (f) => `
        <li>
          <strong>${f.severity === "critical" ? "🔴" : "🟡"} ${f.name}</strong><br/>
          ${f.description}<br/>
          Affected records: ${f.count}
        </li>
      `
        )
        .join("")}
    </ul>
    <p><a href="https://your-app.vercel.app/admin/integrity">View Dashboard</a></p>
    <p style="color: #666; font-size: 12px;">Checked at ${new Date().toISOString()}</p>
  `;

  // Call the send-email edge function
  await supabase.functions.invoke("send-email", {
    body: {
      to: email,
      subject: `[${criticalCount > 0 ? "CRITICAL" : "Warning"}] Indigo Platform Integrity Issues`,
      html: htmlContent,
    },
  });
}

async function logIntegrityCheck(
  supabase: any,
  results: CheckResult[],
  triggeredBy: string = "scheduled",
  runtimeMs: number = 0
): Promise<{ runId: string | null }> {
  const failures = results.filter((r) => r.status === "fail");
  const criticalFailures = failures.filter((r) => r.severity === "critical");

  // Map results to violations format for admin_integrity_runs
  const violations = failures.map((r) => ({
    view: r.name.toLowerCase().replace(/\s+/g, "_"),
    count: r.count,
    severity: r.severity,
    description: r.description,
    sample: r.sample || [],
  }));

  // Insert into admin_integrity_runs (P1 table)
  const { data: runData, error: runError } = await supabase
    .from("admin_integrity_runs")
    .insert({
      status: failures.length === 0 ? "pass" : "fail",
      violations: violations,
      runtime_ms: runtimeMs,
      triggered_by: triggeredBy,
      context: `edge_function:${triggeredBy}`,
    })
    .select("id")
    .single();

  const runId = runData?.id || null;

  if (runError) {
    console.error("Failed to log to admin_integrity_runs:", runError);
  }

  // If there are critical failures, create an alert
  if (criticalFailures.length > 0 && runId) {
    await supabase.from("admin_alerts").insert({
      alert_type: "integrity_violation",
      severity: "critical",
      title: `Integrity Check Failed: ${criticalFailures.length} critical issues`,
      message: criticalFailures.map((f) => f.name).join(", "),
      metadata: {
        total_failures: failures.length,
        critical_failures: criticalFailures.length,
        triggered_by: triggeredBy,
      },
      related_run_id: runId,
    });
  }

  // Also log to audit_log for audit trail
  await supabase.from("audit_log").insert({
    action: "integrity_check",
    entity: "system",
    entity_id: runId,
    meta: {
      total_checks: results.length,
      passed: results.filter((r) => r.status === "pass").length,
      failed: failures.length,
      critical_failures: criticalFailures.length,
      triggered_by: triggeredBy,
      run_id: runId,
    },
  });

  return { runId };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const headers = getCorsHeaders(req.headers.get("origin"));

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse triggered_by from request body
    let triggeredBy = "scheduled";
    try {
      const body = await req.json();
      if (body?.triggered_by) triggeredBy = body.triggered_by;
    } catch {
      // No body or invalid JSON, use default
    }

    // Run all integrity checks with timing
    console.log("Running integrity checks...");
    const startTime = Date.now();
    const results = await runIntegrityChecks(supabase);
    const runtimeMs = Date.now() - startTime;

    const failures = results.filter((r) => r.status === "fail");
    const criticalFailures = failures.filter((r) => r.severity === "critical");

    console.log(
      `Integrity check complete: ${failures.length} failures (${criticalFailures.length} critical) in ${runtimeMs}ms`
    );

    // Log to admin_integrity_runs table (P1)
    const { runId } = await logIntegrityCheck(supabase, results, triggeredBy, runtimeMs);

    // Send alerts if there are failures
    if (failures.length > 0) {
      const slackWebhook = Deno.env.get("SLACK_WEBHOOK_URL");
      const alertEmail = Deno.env.get("ALERT_EMAIL");

      const alertPromises: Promise<void>[] = [];

      if (slackWebhook) {
        alertPromises.push(sendSlackAlert(slackWebhook, results));
      }

      if (alertEmail) {
        alertPromises.push(sendEmailAlert(supabase, alertEmail, results));
      }

      // Send alerts in background (fire and forget)
      if (alertPromises.length > 0) {
        Promise.all(alertPromises).catch((err) => console.error("Alert sending failed:", err));
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: failures.length === 0 ? "pass" : "fail",
        run_id: runId,
        timestamp: new Date().toISOString(),
        runtime_ms: runtimeMs,
        summary: {
          total: results.length,
          passed: results.filter((r) => r.status === "pass").length,
          failed: failures.length,
          critical: criticalFailures.length,
        },
        results,
      }),
      {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Integrity monitor error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  }
});
