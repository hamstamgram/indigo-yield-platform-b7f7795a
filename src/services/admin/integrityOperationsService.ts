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
  description: string | null;
  metadata: Record<string, unknown> | null;
  integrity_run_id: string | null;
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
  crystallized_count: number;
  gap_count: number;
  oldest_gap_days: number | null;
  total_aum: number;
}

export interface CrystallizationGap {
  investor_id: string;
  fund_id: string;
  investor_name: string;
  fund_code: string;
  last_crystallization_date: string | null;
  days_since_crystallization: number;
  current_value: number;
}

export interface DuplicateProfile {
  profile_id_1: string;
  profile_id_2: string;
  email_1: string;
  email_2: string;
  name_1: string;
  name_2: string;
  duplicate_type: string;
  similarity_score: number;
}

export interface BypassAttempt {
  id: string;
  attempted_at: string;
  operation_type: string;
  table_name: string;
  blocked_reason: string;
  actor_id: string | null;
  payload: Record<string, unknown> | null;
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

  return (data || []).map((row) => ({
    id: row.id,
    run_at: row.run_at,
    status: row.status as "pass" | "fail",
    violations: (row.violations as unknown as IntegrityViolation[]) || [],
    runtime_ms: row.runtime_ms,
    triggered_by: row.triggered_by,
    violation_count: row.violation_count || 0,
    critical_count: row.critical_count || 0,
  }));
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

  return (data || []) as AdminAlert[];
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

  return (data || []) as CrystallizationDashboardRow[];
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
    .order("days_since_crystallization", { ascending: false })
    .limit(limit);

  if (fundId) {
    query = query.eq("fund_id", fundId);
  }

  const { data, error } = await query;

  if (error) {
    logError("fetchCrystallizationGaps", error);
    throw error;
  }

  return (data || []) as CrystallizationGap[];
}

/**
 * Fetch potential duplicate profiles
 */
export async function fetchDuplicateProfiles(): Promise<DuplicateProfile[]> {
  const { data, error } = await supabase
    .from("v_potential_duplicate_profiles")
    .select("*")
    .order("similarity_score", { ascending: false });

  if (error) {
    logError("fetchDuplicateProfiles", error);
    throw error;
  }

  return (data || []) as DuplicateProfile[];
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
