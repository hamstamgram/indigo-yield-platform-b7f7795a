import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * Monthly Report Scheduler
 *
 * Triggered by pg_cron on days 28-31 at 23:00 UTC.
 * Checks if today is the actual last day of the month, then:
 *  1. Calls generate-fund-performance to calculate MTD/QTD/YTD/ITD metrics + HTML statements
 *  2. Calls process-report-delivery-queue to email statements to investors
 *  3. Logs results to admin_alerts
 *
 * Auth: Validates a shared CRON_SECRET header (pg_cron cannot send JWTs).
 */

function isLastDayOfMonth(date: Date): boolean {
  const nextDay = new Date(date);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return nextDay.getUTCMonth() !== date.getUTCMonth();
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const CRON_SECRET = Deno.env.get("CRON_SECRET");

  const requestId = crypto.randomUUID().slice(0, 8);
  const now = new Date();

  console.log(JSON.stringify({
    event: "scheduler_invoked",
    request_id: requestId,
    timestamp: now.toISOString(),
  }));

  // Validate cron secret
  const cronSecret = req.headers.get("x-cron-secret");
  if (!CRON_SECRET || cronSecret !== CRON_SECRET) {
    console.error(`[${requestId}] Invalid or missing cron secret`);
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check if today is actually the last day of the month
  if (!isLastDayOfMonth(now)) {
    const msg = `Not the last day of the month (${now.getUTCDate()}). Skipping.`;
    console.log(`[${requestId}] ${msg}`);
    return new Response(JSON.stringify({ skipped: true, reason: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const periodYear = now.getUTCFullYear();
  const periodMonth = now.getUTCMonth() + 1; // 1-indexed

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const results: Record<string, unknown> = {
    request_id: requestId,
    period: `${periodYear}-${String(periodMonth).padStart(2, "0")}`,
    steps: {},
  };

  try {
    // -----------------------------------------------------------------------
    // Step 1: Generate fund performance reports + HTML statements
    // -----------------------------------------------------------------------
    console.log(`[${requestId}] Step 1: Calling generate-fund-performance for ${periodYear}-${periodMonth}`);

    const perfResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-fund-performance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ periodYear, periodMonth }),
    });

    const perfResult = await perfResponse.json();
    results.steps = { ...results.steps as Record<string, unknown>, generate_performance: { status: perfResponse.status, data: perfResult } };

    if (!perfResponse.ok) {
      throw new Error(`generate-fund-performance failed (${perfResponse.status}): ${JSON.stringify(perfResult)}`);
    }

    console.log(`[${requestId}] Step 1 complete: ${JSON.stringify(perfResult).slice(0, 200)}`);

    // -----------------------------------------------------------------------
    // Step 2: Find the period_id for this month
    // -----------------------------------------------------------------------
    const periodLabel = `${periodYear}-${String(periodMonth).padStart(2, "0")}`;
    const { data: periods, error: periodErr } = await supabase
      .from("statement_periods")
      .select("id")
      .eq("label", periodLabel)
      .limit(1);

    if (periodErr) throw new Error(`Failed to find period: ${periodErr.message}`);

    let periodId: string | null = null;
    if (periods && periods.length > 0) {
      periodId = periods[0].id;
    } else {
      // Try alternative label formats
      const altLabel = `${String(periodMonth).padStart(2, "0")}/${periodYear}`;
      const { data: altPeriods } = await supabase
        .from("statement_periods")
        .select("id")
        .eq("label", altLabel)
        .limit(1);

      if (altPeriods && altPeriods.length > 0) {
        periodId = altPeriods[0].id;
      }
    }

    if (!periodId) {
      // Look for most recent period
      const { data: recentPeriods } = await supabase
        .from("statement_periods")
        .select("id, label")
        .order("created_at", { ascending: false })
        .limit(1);

      if (recentPeriods && recentPeriods.length > 0) {
        periodId = recentPeriods[0].id;
        console.log(`[${requestId}] Using most recent period: ${recentPeriods[0].label} (${periodId})`);
      } else {
        throw new Error(`No statement period found for ${periodLabel}`);
      }
    }

    results.steps = { ...results.steps as Record<string, unknown>, period_lookup: { period_id: periodId } };

    // -----------------------------------------------------------------------
    // Step 3: Process report delivery queue (email statements)
    // -----------------------------------------------------------------------
    console.log(`[${requestId}] Step 3: Calling process-report-delivery-queue for period ${periodId}`);

    const deliveryResponse = await fetch(`${SUPABASE_URL}/functions/v1/process-report-delivery-queue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ period_id: periodId }),
    });

    const deliveryResult = await deliveryResponse.json();
    results.steps = { ...results.steps as Record<string, unknown>, deliver_reports: { status: deliveryResponse.status, data: deliveryResult } };

    if (!deliveryResponse.ok) {
      console.error(`[${requestId}] Delivery failed but continuing: ${JSON.stringify(deliveryResult)}`);
    } else {
      console.log(`[${requestId}] Step 3 complete: ${JSON.stringify(deliveryResult).slice(0, 200)}`);
    }

    // -----------------------------------------------------------------------
    // Step 4: Log success to admin_alerts
    // -----------------------------------------------------------------------
    const alertTitle = `Monthly reports generated for ${periodLabel}`;
    const alertMessage = [
      `Performance: ${perfResult?.recordsCreated ?? "?"} records`,
      `Statements: ${perfResult?.statementsGenerated ?? "?"} generated`,
      `Delivery: ${deliveryResponse.ok ? "success" : "failed"}`,
    ].join(" | ");

    await supabase.from("admin_alerts").insert([{
      alert_type: "monthly_report",
      severity: "info",
      title: alertTitle,
      message: alertMessage,
      metadata: results,
    }]);

    results.success = true;
    console.log(`[${requestId}] Monthly report scheduler completed successfully`);

  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    console.error(`[${requestId}] FATAL: ${errorMsg}`);

    // Log failure alert
    try {
      await supabase.from("admin_alerts").insert([{
        alert_type: "monthly_report",
        severity: "error",
        title: `Monthly report generation FAILED (${periodYear}-${String(periodMonth).padStart(2, "0")})`,
        message: errorMsg.slice(0, 500),
        metadata: { request_id: requestId, error: errorMsg, steps: results.steps },
      }]);
    } catch {
      console.error(`[${requestId}] Failed to log error alert`);
    }

    results.success = false;
    results.error = errorMsg;
  }

  return new Response(JSON.stringify(results, null, 2), {
    status: results.success ? 200 : 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
