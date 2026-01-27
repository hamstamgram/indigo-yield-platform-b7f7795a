/**
 * System Admin Service
 * Service layer for system administration operations:
 * - Maintenance operations (position resets)
 * - Admin user management
 * - Data integrity checks
 * - System health metrics
 */

import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc";
import type { IntegrityViolation, LastActivityRow } from "@/types/domains/integrity";
import { generateUUID } from "@/lib/utils";

// ============ Types ============

export interface ResetLogEntry {
  id: string;
  reset_batch_id: string;
  admin_user_id: string;
  initiated_at: string;
  completed_at: string | null;
  status: string;
  affected_counts: {
    positions_reset?: number;
    performance_archived?: number;
    aum_archived?: number;
    transactions_archived?: number;
    total_aum_before?: number;
  } | null;
  error_message: string | null;
  profiles?: {
    email: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export interface PositionResetPreview {
  positions: number;
  performance_records: number;
  aum_records: number;
  transactions: number;
  investors_affected: number;
  funds_affected: number;
  total_aum: number;
}

export interface PositionResetResult {
  success: boolean;
  batch_id: string;
  positions_reset: number;
  performance_archived: number;
  aum_archived: number;
  transactions_archived: number;
  total_aum_before: number;
}

export interface AdminProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  status: string;
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: "super_admin" | "admin";
  createdAt: string;
}

export interface DeliveryQueueMetrics {
  queued_count: number;
  sending_count: number;
  stuck_sending_count: number;
  failed_last_24h: number;
  oldest_queued_at: string | null;
}

export interface IntegrityCheck {
  name: string;
  status: "ok" | "warning" | "error";
  count: number;
  details?: string;
  icon?: "orphan" | "duplicate" | "voided" | "reconciliation";
}

export interface IntegrityData {
  checks: IntegrityCheck[];
  lastYieldRun: string | null;
  lastReportRun: string | null;
  lastEmailEvent: string | null;
}

// ============ Maintenance Operations ============

/**
 * Fetch position reset history
 */
export async function getResetHistory(): Promise<ResetLogEntry[]> {
  const response = await supabase.functions.invoke("reset-positions", {
    body: { action: "history" },
  });

  if (response.data?.success) {
    return response.data.history || [];
  }

  throw new Error(response.error?.message || "Failed to fetch reset history");
}

/**
 * Get position reset preview data
 */
export async function getPositionResetPreview(): Promise<PositionResetPreview> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Not authenticated");
  }

  const response = await supabase.functions.invoke("reset-positions", {
    body: { action: "preview" },
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  if (response.data?.success) {
    return response.data.preview;
  }

  throw new Error(response.data?.error || "Failed to fetch preview");
}

/**
 * Execute position reset
 */
export async function executePositionReset(confirmationCode: string): Promise<PositionResetResult> {
  const response = await supabase.functions.invoke("reset-positions", {
    body: {
      action: "execute",
      confirmationCode,
    },
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  if (response.data?.success) {
    return response.data.result;
  }

  throw new Error(response.data?.error || "Reset failed");
}

// ============ Admin User Management ============

/**
 * Fetch all admin users with their roles
 */
export async function getAdminUsers(): Promise<AdminProfile[]> {
  // Query user_roles table for admin role
  const { data: adminRoles, error: rolesError } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");

  if (rolesError) throw rolesError;

  if (!adminRoles || adminRoles.length === 0) {
    return [];
  }

  const adminIds = adminRoles.map((r) => r.user_id);

  // Get profile details for admins
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("id", adminIds)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch all admins with super_admin role detection
 */
export async function getAdminUsersWithRoles(): Promise<AdminUser[]> {
  // Get all profiles that are admins
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, created_at")
    .eq("is_admin", true)
    .order("created_at", { ascending: false });

  if (profilesError) throw profilesError;

  // Get roles for each admin
  const adminList: AdminUser[] = [];
  for (const profile of profiles || []) {
    // Check for super_admin role first
    const { data: superAdminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", profile.id)
      .eq("role", "super_admin")
      .maybeSingle();

    adminList.push({
      id: profile.id,
      email: profile.email,
      firstName: profile.first_name,
      lastName: profile.last_name,
      role: superAdminRole ? "super_admin" : "admin",
      createdAt: profile.created_at,
    });
  }

  return adminList;
}

/**
 * Remove admin role from user
 */
export async function removeAdminRole(userId: string): Promise<void> {
  const { error } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", "admin");

  if (error) throw error;
}

/**
 * Update admin role using secure RPC function
 */
export async function updateAdminRole(
  userId: string,
  newRole: "admin" | "super_admin"
): Promise<void> {
  const { error } = await rpc.call("update_admin_role", {
    p_target_user_id: userId,
    p_new_role: newRole,
  });

  if (error) throw error;
}

/**
 * Create admin invite
 */
export async function createAdminInvite(
  email: string,
  intendedRole: "admin" | "super_admin" = "admin"
): Promise<{ inviteCode: string; expiresAt: string }> {
  const inviteCode = generateUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("admin_invites").insert({
    email: email.toLowerCase().trim(),
    invite_code: inviteCode,
    expires_at: expiresAt.toISOString(),
    created_by: user?.id,
    intended_role: intendedRole,
  });

  if (error) throw error;

  return { inviteCode, expiresAt: expiresAt.toISOString() };
}

/**
 * Send admin invite email
 */
export async function sendAdminInviteEmail(invite: {
  email: string;
  invite_code: string;
  expires_at: string;
}): Promise<void> {
  const { error } = await supabase.functions.invoke("send-admin-invite", {
    body: { invite },
  });

  if (error) throw error;
}

/**
 * Force reset user password
 */
export async function forceResetUserPassword(email: string, newPassword: string): Promise<void> {
  const { error } = await supabase.functions.invoke("set-user-password", {
    body: { email, password: newPassword },
  });

  if (error) throw error;
}

// ============ Delivery Queue Metrics ============

/**
 * Fetch delivery queue metrics
 */
export async function getDeliveryQueueMetrics(): Promise<DeliveryQueueMetrics> {
  // Get queued count
  const { count: queuedCount } = await supabase
    .from("statement_email_delivery")
    .select("*", { count: "exact", head: true })
    .or("status.eq.queued,status.eq.QUEUED");

  // Get sending count
  const { count: sendingCount } = await supabase
    .from("statement_email_delivery")
    .select("*", { count: "exact", head: true })
    .or("status.eq.sending,status.eq.SENDING");

  // Get stuck sending (> 15 minutes)
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count: stuckCount } = await supabase
    .from("statement_email_delivery")
    .select("*", { count: "exact", head: true })
    .or("status.eq.sending,status.eq.SENDING")
    .lt("updated_at", fifteenMinutesAgo);

  // Get failed in last 24h
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: failedCount } = await supabase
    .from("statement_email_delivery")
    .select("*", { count: "exact", head: true })
    .or("status.eq.failed,status.eq.FAILED")
    .gte("updated_at", twentyFourHoursAgo);

  // Get oldest queued
  const { data: oldestQueued } = await supabase
    .from("statement_email_delivery")
    .select("created_at")
    .or("status.eq.queued,status.eq.QUEUED")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return {
    queued_count: queuedCount ?? 0,
    sending_count: sendingCount ?? 0,
    stuck_sending_count: stuckCount ?? 0,
    failed_last_24h: failedCount ?? 0,
    oldest_queued_at: oldestQueued?.created_at ?? null,
  };
}

// ============ Data Integrity ============

/**
 * Query integrity views for system health checks
 * Uses database-side views for accurate, efficient reconciliation
 */
async function queryIntegrityViews() {
  const [
    ledgerReconciliation,
    fundAumMismatch,
    orphanedTransactions,
    orphanedPositions,
    feeCalculationOrphans,
    positionVariance,
  ] = await Promise.all([
    // Ledger reconciliation: position vs transaction totals
    supabase.from("v_ledger_reconciliation").select("*", { count: "exact" }),

    // Fund AUM mismatch: reported vs calculated AUM
    supabase.from("fund_aum_mismatch").select("*", { count: "exact" }),

    // Orphaned transactions: transactions without profiles
    (supabase.from as any)("v_orphaned_transactions").select("*", { count: "exact" }),

    // Orphaned positions: positions without profiles/funds
    supabase.from("v_orphaned_positions").select("*", { count: "exact" }),

    // Fee calculation orphans: orphaned fee calculations
    (supabase.from as any)("v_fee_calculation_orphans").select("*", { count: "exact" }),

    // Position vs transaction variance breakdown
    (supabase.from as any)("v_position_transaction_variance").select("*", { count: "exact" }),
  ]);

  return {
    ledgerReconciliation: {
      count: ledgerReconciliation.count ?? 0,
      data: ledgerReconciliation.data,
    },
    fundAumMismatch: { count: fundAumMismatch.count ?? 0, data: fundAumMismatch.data },
    orphanedTransactions: {
      count: orphanedTransactions.count ?? 0,
      data: orphanedTransactions.data,
    },
    orphanedPositions: { count: orphanedPositions.count ?? 0, data: orphanedPositions.data },
    feeCalculationOrphans: {
      count: feeCalculationOrphans.count ?? 0,
      data: feeCalculationOrphans.data,
    },
    positionVariance: { count: positionVariance.count ?? 0, data: positionVariance.data },
  };
}

/**
 * Fetch data integrity status
 * Uses database views for efficient, accurate integrity checking
 */
export async function getDataIntegrityStatus(): Promise<IntegrityData> {
  // Query integrity views and last activity timestamps in parallel
  const [integrityViews, lastYieldDistResult, lastReportResult, lastEmailWebhookResult] =
    await Promise.all([
      queryIntegrityViews(),

      supabase
        .from("yield_distributions")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from("generated_statements")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from("statement_email_delivery")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  // Type the results
  const lastYieldDist = lastYieldDistResult.data as LastActivityRow | null;
  const lastReport = lastReportResult.data as LastActivityRow | null;
  const lastEmailWebhook = lastEmailWebhookResult.data as LastActivityRow | null;

  const checks: IntegrityCheck[] = [
    {
      name: "Ledger Reconciliation",
      status: integrityViews.ledgerReconciliation.count === 0 ? "ok" : "error",
      count: integrityViews.ledgerReconciliation.count,
      details:
        integrityViews.ledgerReconciliation.count === 0
          ? "All positions match transaction sums"
          : `${integrityViews.ledgerReconciliation.count} positions have variance > $0.01`,
      icon: "reconciliation",
    },
    {
      name: "Fund AUM Mismatch",
      status: integrityViews.fundAumMismatch.count === 0 ? "ok" : "warning",
      count: integrityViews.fundAumMismatch.count,
      details:
        integrityViews.fundAumMismatch.count === 0
          ? "Reported AUM matches position totals"
          : `${integrityViews.fundAumMismatch.count} funds have AUM discrepancies`,
      icon: "reconciliation",
    },
    {
      name: "Orphan Positions",
      status: integrityViews.orphanedPositions.count === 0 ? "ok" : "error",
      count: integrityViews.orphanedPositions.count,
      details: "Positions with missing profile or fund reference",
      icon: "orphan",
    },
    {
      name: "Orphan Transactions",
      status: integrityViews.orphanedTransactions.count === 0 ? "ok" : "error",
      count: integrityViews.orphanedTransactions.count,
      details: "Transactions referencing non-existent profiles",
      icon: "orphan",
    },
    {
      name: "Fee Calc Orphans",
      status: integrityViews.feeCalculationOrphans.count === 0 ? "ok" : "warning",
      count: integrityViews.feeCalculationOrphans.count,
      details: "Fee calculations without valid positions",
      icon: "orphan",
    },
    {
      name: "Position/Tx Variance",
      status: integrityViews.positionVariance.count === 0 ? "ok" : "error",
      count: integrityViews.positionVariance.count,
      details:
        integrityViews.positionVariance.count === 0
          ? "All position balances reconcile"
          : `${integrityViews.positionVariance.count} positions need investigation`,
      icon: "reconciliation",
    },
  ];

  return {
    checks,
    lastYieldRun: lastYieldDist?.created_at || null,
    lastReportRun: lastReport?.created_at || null,
    lastEmailEvent: lastEmailWebhook?.created_at || null,
  };
}

// ============ System Health via integrity-monitor ============

export interface HealthSnapshot {
  run_id: string;
  run_at: string;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  critical_failures: number;
  status: "healthy" | "warning" | "critical";
  violations: IntegrityViolation[] | null;
}

/**
 * Trigger a manual integrity check via the canonical integrity-monitor edge function
 */
export async function runIntegrityCheck(triggeredBy = "manual"): Promise<{
  success: boolean;
  run_id?: string;
  total_checks?: number;
  passed?: number;
  failed?: number;
  status?: string;
  error?: string;
}> {
  const response = await supabase.functions.invoke("integrity-monitor", {
    body: { triggered_by: triggeredBy },
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  return {
    success: response.data?.status !== "error",
    run_id: response.data?.run_id,
    total_checks: response.data?.summary?.total,
    passed: response.data?.summary?.passed,
    failed: response.data?.summary?.failed,
    status: response.data?.status,
  };
}

/**
 * Get the latest integrity run from admin_integrity_runs
 */
export async function getLatestHealthStatus(): Promise<HealthSnapshot | null> {
  const { data, error } = await supabase
    .from("admin_integrity_runs")
    .select("*")
    .order("run_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to get latest health status:", error);
    return null;
  }

  if (!data) {
    return null;
  }

  // Cast through unknown for JSON field
  const violations = data.violations as unknown as IntegrityViolation[] | null;
  const failedCount = violations?.length || 0;
  const criticalCount = violations?.filter((v) => v.severity === "critical").length || 0;

  return {
    run_id: data.id,
    run_at: data.run_at,
    total_checks: 14, // integrity-monitor runs 14 checks
    passed_checks: 14 - failedCount,
    failed_checks: failedCount,
    critical_failures: criticalCount,
    status: criticalCount > 0 ? "critical" : failedCount > 0 ? "warning" : "healthy",
    violations: violations,
  };
}

/**
 * Get integrity run history from admin_integrity_runs
 */
export async function getHealthSnapshots(
  limit = 50,
  offset = 0
): Promise<{ snapshots: HealthSnapshot[]; total: number }> {
  const { data, error, count } = await supabase
    .from("admin_integrity_runs")
    .select("*", { count: "exact" })
    .order("run_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  const snapshots: HealthSnapshot[] = (data || []).map((row) => {
    // Cast through unknown for JSON field
    const violations = row.violations as unknown as IntegrityViolation[] | null;
    const failedCount = violations?.length || 0;
    const criticalCount = violations?.filter((v) => v.severity === "critical").length || 0;

    return {
      run_id: row.id,
      run_at: row.run_at,
      total_checks: 14,
      passed_checks: 14 - failedCount,
      failed_checks: failedCount,
      critical_failures: criticalCount,
      status: criticalCount > 0 ? "critical" : failedCount > 0 ? "warning" : "healthy",
      violations: violations,
    };
  });

  return { snapshots, total: count || 0 };
}
