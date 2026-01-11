/**
 * Session Cleanup Cron - Automated Maintenance
 * Purges expired sessions (30 days) and old access logs (90 days)
 * Run daily via Supabase scheduled functions or external cron
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify cron secret for scheduled invocations (optional security)
  const authHeader = req.headers.get("Authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Allow service role key as fallback
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!authHeader?.includes(serviceKey || "")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

    // Delete sessions older than 30 days
    const { count: sessionsDeleted, error: sessionsError } = await supabase
      .from("user_sessions")
      .delete({ count: "exact" })
      .lt("created_at", thirtyDaysAgo);

    if (sessionsError) {
      console.error("Session cleanup error:", sessionsError);
    }

    // Delete access logs older than 90 days
    const { count: logsDeleted, error: logsError } = await supabase
      .from("access_logs")
      .delete({ count: "exact" })
      .lt("created_at", ninetyDaysAgo);

    if (logsError) {
      console.error("Access log cleanup error:", logsError);
    }

    // Execute cleanup_dormant_positions if it exists
    let dormantResult = null;
    try {
      const { data, error } = await supabase.rpc("cleanup_dormant_positions", { p_dry_run: false });
      if (!error) dormantResult = data;
    } catch (e) {
      console.log("cleanup_dormant_positions not available or errored");
    }

    // Expire pending MFA reset requests
    const { count: mfaExpired } = await supabase
      .from("mfa_reset_requests")
      .update({ status: "expired" })
      .eq("status", "pending")
      .lt("expires_at", now.toISOString());

    // Audit log the cleanup
    await supabase.from("audit_log").insert({
      action: "MAINTENANCE_CRON",
      entity: "system",
      entity_id: "session-cleanup",
      new_values: { 
        sessions_deleted: sessionsDeleted || 0, 
        logs_deleted: logsDeleted || 0,
        mfa_requests_expired: mfaExpired || 0,
        dormant_positions: dormantResult
      },
      meta: {
        executed_at: now.toISOString(),
        thresholds: {
          sessions_days: 30,
          logs_days: 90
        }
      }
    });

    return new Response(JSON.stringify({ 
      success: true,
      sessionsDeleted: sessionsDeleted || 0, 
      logsDeleted: logsDeleted || 0,
      mfaRequestsExpired: mfaExpired || 0,
      executedAt: now.toISOString()
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error("Maintenance cron error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
