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
  current_: number;
  stale: number;
  critical_stale: number;
  never_crystallized: number;
  aum_needing_crystallization: number;
  total_aum_in_positions: number;
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

export interface BypassAttempt {
  id: string;
  attempted_at: string;
  attempted_type: string;
  attempted_source: string;
  attempted_amount: number;
  error_message: string;
  investor_id: string;
  fund_id: string;
  user_id: string;
  client_info: Record<string, unknown> | null;
}

export interface BatchCrystallizeResult {
  success: boolean;
  fund_id: string;
  positions_processed: number;
  positions_crystallized: number;
  errors: string[];
  dry_run: boolean;
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
    .select("*")
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
    .select("*")
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
 * Run integrity check via RPC
 */
export async function runIntegrityCheck(): Promise<IntegrityCheckResult> {
  const { data, error } = await callRPC("run_integrity_check", {});

  if (error) {
    logError("runIntegrityCheck", error);
    throw new Error(error.message);
  }

  return data as unknown as IntegrityCheckResult;
}

/**
 * Fetch crystallization dashboard data
 */
export async function fetchCrystallizationDashboard(
  fundId?: string
): Promise<CrystallizationDashboardRow[]> {
  let query = supabase.from("v_crystallization_dashboard").select("*");

  if (fundId) {
    query = query.eq("fund_id", fundId);
  }

  const { data, error } = await query;

  if (error) {
    logError("fetchCrystallizationDashboard", error);
    throw error;
  }

  return (data || []).map((row) => ({
    fund_id: row.fund_id,
    fund_code: row.fund_code,
    fund_name: row.fund_name,
    total_positions: row.total_positions,
    current_: row.current_,
    stale: row.stale,
    critical_stale: row.critical_stale,
    never_crystallized: row.never_crystallized,
    aum_needing_crystallization: row.aum_needing_crystallization,
    total_aum_in_positions: row.total_aum_in_positions,
  })) as CrystallizationDashboardRow[];
}

/**
 * Fetch crystallization gaps
 */
export async function fetchCrystallizationGaps(
  fundId?: string,
  limit = 100
): Promise<CrystallizationGap[]> {
  let query = supabase
    .from("v_crystallization_gaps")
    .select("*")
    .order("days_behind", { ascending: false })
    .limit(limit);

  if (fundId) {
    query = query.eq("fund_id", fundId);
  }

  const { data, error } = await query;

  if (error) {
    logError("fetchCrystallizationGaps", error);
    throw error;
  }

  return (data || []).map((row) => ({
    investor_id: row.investor_id,
    fund_id: row.fund_id,
    investor_email: row.investor_email,
    fund_code: row.fund_code,
    last_yield_crystallization_date: row.last_yield_crystallization_date,
    days_behind: row.days_behind,
    current_value: row.current_value,
    gap_type: row.gap_type,
    cumulative_yield_earned: row.cumulative_yield_earned,
  })) as CrystallizationGap[];
}

/**
 * Fetch potential duplicate profiles
 */
export async function fetchDuplicateProfiles(): Promise<DuplicateProfile[]> {
  const { data, error } = await supabase
    .from("v_potential_duplicate_profiles")
    .select("*")
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
 * Fetch bypass attempts
 */
export async function fetchBypassAttempts(limit = 50): Promise<BypassAttempt[]> {
  const { data, error } = await supabase
    .from("transaction_bypass_attempts")
    .select("*")
    .order("attempted_at", { ascending: false })
    .limit(limit);

  if (error) {
    logError("fetchBypassAttempts", error);
    throw error;
  }

  return (data || []) as BypassAttempt[];
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
 * Batch crystallize a fund (with dry run support)
 */
export async function batchCrystallizeFund(
  fundId: string,
  dryRun = true
): Promise<BatchCrystallizeResult> {
  const { data, error } = await callRPC("batch_crystallize_fund", {
    p_fund_id: fundId,
    p_dry_run: dryRun,
  });

  if (error) {
    logError("batchCrystallizeFund", error, { fundId, dryRun });
    throw new Error(error.message);
  }

  return data as unknown as BatchCrystallizeResult;
}

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
  fetchCrystallizationDashboard,
  fetchCrystallizationGaps,
  fetchDuplicateProfiles,
  fetchBypassAttempts,
  fetchLedgerReconciliation,
  // Action functions
  runIntegrityCheck,
  acknowledgeAlert,
  batchCrystallizeFund,
  mergeDuplicateProfiles,
};
