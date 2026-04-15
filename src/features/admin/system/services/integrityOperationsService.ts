/**
 * P1 Integrity Operations Service
 * Handles admin_integrity_runs, run_integrity_check RPC, crystallization views,
 * duplicate profiles, and bypass attempts
 */

import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";
import { callRPC } from "@/lib/supabase/typedRPC";

// ============================================================================
// Types
// ============================================================================

export interface IntegrityRun {
  id: string;
  run_at: string;
  status: "pass" | "fail";
  violations: IntegrityViolation[];
  runtime_ms: number | null;
  triggered_by: string;
  // Computed from violations array
  violation_count: number;
  critical_count: number;
}

export interface IntegrityViolation {
  view_name: string;
  count: number;
  severity: "info" | "warning" | "critical";
  sample_rows?: Record<string, unknown>[];
}

export interface AdminAlert {
  id: string;
  alert_type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string | null;
  description?: string; // Optional for display
  metadata: Record<string, unknown> | null;
  related_run_id: string | null;
  created_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
}

export interface IntegrityCheckResult {
  status: "pass" | "fail";
  violation_count: number;
  critical_count: number;
  violations: IntegrityViolation[];
  run_id?: string;
}

export interface CrystallizationDashboardRow {
  fund_id: string;
  fund_code: string;
  fund_name: string;
  total_positions: number;
  up_to_date: number;
  warning_stale: number;
  critical_stale: number;
  never_crystallized: number;
  newest_crystallization: string | null;
  oldest_crystallization: string | null;
}

export interface CrystallizationGap {
  investor_id: string;
  fund_id: string;
  investor_email: string;
  fund_code: string;
  last_yield_crystallization_date: string | null;
  days_behind: number;
  current_value: number;
  gap_type: string;
  cumulative_yield_earned: number;
}

export interface DuplicateProfile {
  duplicate_type: string;
  emails: string[];
  names: string[];
  profile_ids: string[];
  profile_count: number;
  match_key: string;
  first_created: string;
  last_created: string;
  total_funds_affected: number;
  total_value_affected: number;
}

export interface MergeDuplicatesResult {
  success: boolean;
  merged_profile_id: string;
  deleted_profile_id: string;
  transactions_moved: number;
  positions_merged: number;
}

// ============================================================================
// Fetch Functions
// ============================================================================

/**
 * Fetch recent integrity runs from admin_integrity_runs table
 */
export async function fetchIntegrityRuns(limit = 20): Promise<IntegrityRun[]> {
  const { data, error } = await supabase
    .from("admin_integrity_runs")
    .select("id, run_at, status, violations, runtime_ms, triggered_by")
    .order("run_at", { ascending: false })
    .limit(limit);

  if (error) {
    logError("fetchIntegrityRuns", error);
    throw error;
  }

  return (data || []).map((row) => {
    const violations = (row.violations as unknown as IntegrityViolation[]) || [];
    return {
      id: row.id,
      run_at: row.run_at,
      status: row.status as "pass" | "fail",
      violations,
      runtime_ms: row.runtime_ms,
      triggered_by: row.triggered_by,
      // Compute from violations array
      violation_count: violations.length,
      critical_count: violations.filter((v) => v.severity === "critical").length,
    };
  });
}

/**
 * Fetch admin alerts
 */
export async function fetchAdminAlerts(
  limit = 20,
  includeAcknowledged = false
): Promise<AdminAlert[]> {
  let query = supabase
    .from("admin_alerts")
    .select(
      "id, alert_type, severity, title, message, metadata, related_run_id, created_at, acknowledged_at, acknowledged_by"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!includeAcknowledged) {
    query = query.is("acknowledged_at", null);
  }

  const { data, error } = await query;

  if (error) {
    logError("fetchAdminAlerts", error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    alert_type: row.alert_type,
    severity: row.severity as "info" | "warning" | "critical",
    title: row.title,
    message: row.message,
    metadata: row.metadata as Record<string, unknown> | null,
    related_run_id: row.related_run_id,
    created_at: row.created_at,
    acknowledged_at: row.acknowledged_at,
    acknowledged_by: row.acknowledged_by,
  })) as AdminAlert[];
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("admin_alerts")
    .update({
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: userId,
    })
    .eq("id", alertId);

  if (error) {
    logError("acknowledgeAlert", error, { alertId });
    throw error;
  }
}

/**
 * Run integrity check via RPC.
 * After a successful check with 0 violations, auto-resolves stale integrity alerts.
 */
export async function runIntegrityCheck(): Promise<IntegrityCheckResult> {
  const { data, error } = await callRPC("run_integrity_check", {});

  if (error) {
    logError("runIntegrityCheck", error);
    throw new Error(error.message);
  }

  const result = data as unknown as IntegrityCheckResult;

  // Auto-resolve stale integrity alerts when check passes with 0 violations
  if (result && result.violation_count === 0) {
    await autoResolveStaleAlerts();
  }

  return result;
}

/**
 * Auto-resolve (acknowledge) all unacknowledged integrity_violation alerts.
 * Called after a successful integrity check confirms no current violations.
 */
async function autoResolveStaleAlerts(): Promise<void> {
  try {
    const { error } = await supabase
      .from("admin_alerts")
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: "system_auto_resolve",
      })
      .eq("alert_type", "integrity_violation")
      .is("acknowledged_at", null);

    if (error) {
      logError("autoResolveStaleAlerts", error);
    }
  } catch (err) {
    logError("autoResolveStaleAlerts.exception", err);
  }
}

/**
 * Fetch potential duplicate profiles
 */
export async function fetchDuplicateProfiles(): Promise<DuplicateProfile[]> {
  const { data, error } = await (supabase
    .from("v_potential_duplicate_profiles" as any)
    .select(
      "duplicate_type, emails, names, profile_ids, profile_count, match_key, first_created, last_created, total_funds_affected, total_value_affected"
    ) as any)
    .order("profile_count", { ascending: false });

  if (error) {
    logError("fetchDuplicateProfiles", error);
    throw error;
  }

  return (data || []).map((row) => ({
    duplicate_type: row.duplicate_type,
    emails: row.emails,
    names: row.names,
    profile_ids: row.profile_ids,
    profile_count: row.profile_count,
    match_key: row.match_key,
    first_created: row.first_created,
    last_created: row.last_created,
    total_funds_affected: row.total_funds_affected,
    total_value_affected: row.total_value_affected,
  })) as DuplicateProfile[];
}

/**
 * Fetch ledger reconciliation issues
 */
export async function fetchLedgerReconciliation(): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase.from("v_ledger_reconciliation").select("*").limit(100);

  if (error) {
    logError("fetchLedgerReconciliation", error);
    throw error;
  }

  return (data || []) as Record<string, unknown>[];
}

// ============================================================================
// Action Functions
// ============================================================================

/**
 * Merge duplicate profiles
 */
export async function mergeDuplicateProfiles(
  keepProfileId: string,
  mergeProfileId: string
): Promise<MergeDuplicatesResult> {
  const { data, error } = await callRPC("merge_duplicate_profiles", {
    p_keep_profile_id: keepProfileId,
    p_merge_profile_id: mergeProfileId,
  });

  if (error) {
    logError("mergeDuplicateProfiles", error, { keepProfileId, mergeProfileId });
    throw new Error(error.message);
  }

  return data as unknown as MergeDuplicatesResult;
}

// ============================================================================
// Export Service Object
// ============================================================================

export const integrityOperationsService = {
  // Fetch functions
  fetchIntegrityRuns,
  fetchAdminAlerts,
  fetchDuplicateProfiles,
  fetchLedgerReconciliation,
  // Action functions
  runIntegrityCheck,
  acknowledgeAlert,
  mergeDuplicateProfiles,
};
