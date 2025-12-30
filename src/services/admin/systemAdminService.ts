/**
 * System Admin Service
 * Service layer for system administration operations:
 * - Maintenance operations (position resets)
 * - Admin user management
 * - Data integrity checks
 * - System health metrics
 */

import { supabase } from "@/integrations/supabase/client";

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
  const { data: { session } } = await supabase.auth.getSession();
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
      confirmationCode 
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
  const { error } = await supabase.rpc("update_admin_role", {
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
  const inviteCode = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("admin_invites")
    .insert({
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
export async function forceResetUserPassword(
  email: string, 
  newPassword: string
): Promise<void> {
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

export interface ReconciliationResult {
  investor_id: string;
  fund_id: string;
  investor_name: string;
  fund_name: string;
  old_value: number;
  new_value: number;
  old_shares: number;
  new_shares: number;
  action: string;
}

/**
 * Run position reconciliation via RPC
 * @param dryRun - If true, returns preview without making changes
 */
export async function runPositionReconciliation(dryRun = true): Promise<ReconciliationResult[]> {
  const { data, error } = await supabase.rpc("reconcile_all_positions", {
    p_dry_run: dryRun,
  });

  if (error) throw error;
  return (data as ReconciliationResult[]) || [];
}

/**
 * Check position vs transaction reconciliation
 */
async function checkPositionReconciliation(): Promise<{ count: number; mismatches: any[] }> {
  try {
    // Get all positions with current_value > 0
    const { data: positions } = await supabase
      .from("investor_positions")
      .select("investor_id, fund_id, current_value")
      .gt("current_value", 0);

    if (!positions || positions.length === 0) {
      return { count: 0, mismatches: [] };
    }

    // Get transaction sums grouped by investor+fund
    const { data: txSums } = await supabase
      .from("transactions_v2")
      .select("investor_id, fund_id, amount, type")
      .eq("is_voided", false);

    // Calculate expected balance per investor+fund
    const expectedBalances = new Map<string, number>();
    (txSums || []).forEach(tx => {
      const key = `${tx.investor_id}:${tx.fund_id}`;
      const current = expectedBalances.get(key) || 0;
      const isCredit = ["DEPOSIT", "TOP_UP", "FIRST_INVESTMENT", "INTEREST", "IB_COMMISSION"].includes(tx.type || "");
      expectedBalances.set(key, current + (isCredit ? (tx.amount || 0) : -(Math.abs(tx.amount || 0))));
    });

    // Compare positions to expected
    const tolerance = 0.00001;
    const mismatches: any[] = [];
    
    for (const pos of positions) {
      const key = `${pos.investor_id}:${pos.fund_id}`;
      const expected = expectedBalances.get(key) || 0;
      const actual = pos.current_value || 0;
      
      if (Math.abs(actual - expected) > tolerance) {
        mismatches.push({
          investor_id: pos.investor_id,
          fund_id: pos.fund_id,
          position_value: actual,
          transaction_sum: expected,
          difference: actual - expected,
        });
      }
    }

    return { count: mismatches.length, mismatches };
  } catch (error) {
    console.error("Error checking position reconciliation:", error);
    return { count: -1, mismatches: [] };
  }
}

/**
 * Fetch data integrity status
 */
export async function getDataIntegrityStatus(): Promise<IntegrityData> {
  const [
    orphanPositions,
    orphanAllocations,
    duplicateRefs,
    duplicateAllocations,
    voidedTransactions,
    positionMismatches,
    lastYieldDist,
    lastReport,
    lastEmailWebhook,
  ] = await Promise.all([
    supabase
      .from("investor_positions")
      .select("investor_id", { count: "exact", head: true })
      .is("investor_id", null),
    
    supabase
      .from("fee_allocations")
      .select("id", { count: "exact", head: true })
      .is("investor_id", null),
    
    supabase.rpc("check_duplicate_transaction_refs") as unknown as Promise<{ data: number | null; error: any }>,
    
    supabase.rpc("check_duplicate_ib_allocations") as unknown as Promise<{ data: number | null; error: any }>,

    supabase
      .from("transactions_v2")
      .select("id", { count: "exact", head: true })
      .eq("is_voided", true),

    checkPositionReconciliation(),
    
    supabase
      .from("yield_distributions")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    
    supabase
      .from("generated_reports")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    
    supabase
      .from("report_delivery_events")
      .select("occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const checks: IntegrityCheck[] = [
    {
      name: "Orphan Positions",
      status: (orphanPositions.count || 0) === 0 ? "ok" : "error",
      count: orphanPositions.count || 0,
      details: "Positions with missing investor reference",
      icon: "orphan",
    },
    {
      name: "Orphan Fee Allocations",
      status: (orphanAllocations.count || 0) === 0 ? "ok" : "error",
      count: orphanAllocations.count || 0,
      details: "Fee allocations with missing investor reference",
      icon: "orphan",
    },
    {
      name: "Duplicate Transaction Refs",
      status: (duplicateRefs?.data ?? 0) === 0 ? "ok" : "warning",
      count: duplicateRefs?.data ?? 0,
      details: "Transactions with non-unique reference_id",
      icon: "duplicate",
    },
    {
      name: "Duplicate IB Allocations",
      status: (duplicateAllocations?.data ?? 0) === 0 ? "ok" : "warning",
      count: duplicateAllocations?.data ?? 0,
      details: "IB allocations with same investor/period/fund",
      icon: "duplicate",
    },
    {
      name: "Voided Transactions",
      status: (voidedTransactions.count || 0) === 0 ? "ok" : "warning",
      count: voidedTransactions.count || 0,
      details: "Total voided transactions in system",
      icon: "voided",
    },
    {
      name: "Position Reconciliation",
      status: positionMismatches.count === 0 ? "ok" : "error",
      count: positionMismatches.count,
      details: positionMismatches.count === 0 
        ? "All positions match transaction sums" 
        : `${positionMismatches.count} positions don't match transaction totals`,
      icon: "reconciliation",
    },
  ];

  return {
    checks,
    lastYieldRun: lastYieldDist.data?.created_at || null,
    lastReportRun: lastReport.data?.created_at || null,
    lastEmailEvent: lastEmailWebhook.data?.occurred_at || null,
  };
}
