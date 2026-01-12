/**
 * Scheduled Integrity Check Edge Function
 *
 * Runs all database integrity views and stores results in system_health_snapshots.
 * Can be triggered:
 * - Via cron job (pg_cron or external scheduler)
 * - Manually from admin panel
 * - On deployment hooks
 *
 * Usage:
 *   POST /functions/v1/scheduled-integrity-check
 *   Body: { "triggered_by": "scheduled" | "manual" | "on_deploy" }
 *   Authorization: Bearer <service_role_key> or admin user token
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface IntegrityCheckResult {
  snapshot_id: string;
  total_anomalies: number;
  status: "healthy" | "warning" | "critical";
  checks: {
    ledger_reconciliation: number;
    fund_aum_mismatch: number;
    orphaned_positions: number;
    orphaned_transactions: number;
    fee_calculation_orphans: number;
    position_variance: number;
  };
  execution_time_ms: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const startTime = Date.now();

    // Parse request body
    let triggeredBy = "scheduled";
    try {
      const body = await req.json();
      triggeredBy = body.triggered_by || "scheduled";
    } catch {
      // Default to scheduled if no body
    }

    // Create admin client
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify authorization (service role key or admin user)
    const authHeader = req.headers.get("Authorization");
    if (authHeader && !authHeader.includes(supabaseServiceRoleKey)) {
      // If using a user token, verify admin access
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);

      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: "Invalid authorization" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check admin status
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!profile?.is_admin) {
        return new Response(
          JSON.stringify({ error: "Admin access required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Run the integrity check via RPC
    const { data: snapshotId, error: rpcError } = await supabase
      .rpc("run_integrity_check", { p_triggered_by: triggeredBy });

    if (rpcError) {
      console.error("Integrity check RPC error:", rpcError);
      throw new Error(`Integrity check failed: ${rpcError.message}`);
    }

    // Get the snapshot details
    const { data: snapshot, error: snapshotError } = await supabase
      .from("system_health_snapshots")
      .select("*")
      .eq("id", snapshotId)
      .single();

    if (snapshotError) {
      throw new Error(`Failed to retrieve snapshot: ${snapshotError.message}`);
    }

    const executionTime = Date.now() - startTime;

    // Determine status
    let status: "healthy" | "warning" | "critical" = "healthy";
    if (snapshot.total_anomalies > 5) {
      status = "critical";
    } else if (snapshot.total_anomalies > 0) {
      status = "warning";
    }

    const result: IntegrityCheckResult = {
      snapshot_id: snapshotId,
      total_anomalies: snapshot.total_anomalies,
      status,
      checks: {
        ledger_reconciliation: snapshot.ledger_reconciliation_count,
        fund_aum_mismatch: snapshot.fund_aum_mismatch_count,
        orphaned_positions: snapshot.orphaned_positions_count,
        orphaned_transactions: snapshot.orphaned_transactions_count,
        fee_calculation_orphans: snapshot.fee_calculation_orphans_count,
        position_variance: snapshot.position_variance_count,
      },
      execution_time_ms: executionTime,
    };

    // Log for monitoring
    console.log(`[Integrity Check] Status: ${status}, Anomalies: ${snapshot.total_anomalies}, Time: ${executionTime}ms`);

    // If critical, could add alerting here (email, Slack, etc.)
    if (status === "critical") {
      console.warn(`[ALERT] Critical integrity issues detected: ${snapshot.total_anomalies} anomalies`);
      // Future: integrate with alerting service
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Integrity check error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
