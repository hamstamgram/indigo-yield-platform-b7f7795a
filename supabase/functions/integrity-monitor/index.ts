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
  {
    name: "Period Orphans",
    query: "SELECT * FROM v_period_orphans LIMIT 5",
    severity: "critical",
    description: "Statement periods with orphaned data",
  },
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
];

async function runIntegrityChecks(supabase: any): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  for (const check of INTEGRITY_CHECKS) {
    try {
      const { data, error } = await supabase.rpc("exec_sql", { sql: check.query }) as { data: any[] | null; error: any };
      
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

async function sendEmailAlert(
  supabase: any,
  email: string,
  results: CheckResult[]
): Promise<void> {
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
  triggeredBy: string = "scheduled"
): Promise<void> {
  const failures = results.filter((r) => r.status === "fail");
  
  // Log to integrity_check_log table for dashboard widget
  await supabase.from("integrity_check_log").insert({
    total_checks: results.length,
    passed: results.filter((r) => r.status === "pass").length,
    failed: failures.length,
    critical_failures: failures.filter((r) => r.severity === "critical").length,
    triggered_by: triggeredBy,
    results: results.map((r) => ({
      name: r.name,
      status: r.status,
      severity: r.severity,
      count: r.count,
      description: r.description,
    })),
  });
  
  // Also log to audit_log for audit trail
  await supabase.from("audit_log").insert({
    action: "integrity_check",
    entity: "system",
    entity_id: null,
    meta: {
      total_checks: results.length,
      passed: results.filter((r) => r.status === "pass").length,
      failed: failures.length,
      critical_failures: failures.filter((r) => r.severity === "critical").length,
      triggered_by: triggeredBy,
    },
  });
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

    // Run all integrity checks
    console.log("Running integrity checks...");
    const results = await runIntegrityChecks(supabase);
    
    const failures = results.filter((r) => r.status === "fail");
    const criticalFailures = failures.filter((r) => r.severity === "critical");

    console.log(`Integrity check complete: ${failures.length} failures (${criticalFailures.length} critical)`);

    // Parse triggered_by from request body
    let triggeredBy = "scheduled";
    try {
      const body = await req.json();
      if (body?.triggered_by) triggeredBy = body.triggered_by;
    } catch {
      // No body or invalid JSON, use default
    }

    // Log to integrity_check_log table
    await logIntegrityCheck(supabase, results, triggeredBy);

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
        Promise.all(alertPromises).catch(err => console.error("Alert sending failed:", err));
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        summary: {
          total: results.length,
          passed: results.filter((r) => r.status === "pass").length,
          failed: failures.length,
          critical: criticalFailures.length,
        },
        results,
      }),
      {
        status: failures.length > 0 ? 200 : 200, // Always 200, check body for status
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
