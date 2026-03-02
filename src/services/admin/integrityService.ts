/**
 * Integrity Service
 * Encapsulates all Supabase operations for data integrity checks
 */

import { supabase } from "@/integrations/supabase/client";
import { callRPC, callRPCNoArgs } from "@/lib/supabase/typedRPC";
import type { IntegrityCheck, AuditEvent } from "@/types/domains/integrity";

/**
 * Fetches all integrity check results from database views
 */
export async function fetchIntegrityChecks(): Promise<IntegrityCheck[]> {
  const [
    fundAumMismatch,
    yieldConservation,
    ibConsistency,
    positionLedgerMismatch,
    orphanPositions,
    voidedTransactions,
  ] = await Promise.all([
    supabase.from("fund_aum_mismatch" as any).select("*"),
    supabase.from("yield_distribution_conservation_check").select("*"),
    supabase.from("ib_allocation_consistency").select("*"),
    supabase.from("investor_position_ledger_mismatch").select("*"),
    supabase
      .from("investor_positions")
      .select("investor_id", { count: "exact", head: true })
      .is("investor_id", null),
    supabase
      .from("transactions_v2")
      .select("id", { count: "exact", head: true })
      .eq("is_voided", true),
  ]);

  // Propagate query errors instead of hiding them as "ok"
  // Note: fund_aum_mismatch view may not exist; degrade gracefully instead of crashing all checks
  const fundAumData = fundAumMismatch.error ? [] : (fundAumMismatch.data ?? []);
  if (yieldConservation.error)
    throw new Error(`yield_conservation: ${yieldConservation.error.message}`);
  if (ibConsistency.error) throw new Error(`ib_consistency: ${ibConsistency.error.message}`);
  if (positionLedgerMismatch.error)
    throw new Error(`position_ledger: ${positionLedgerMismatch.error.message}`);

  return [
    {
      name: "Fund AUM Reconciliation",
      description: "Recorded AUM matches sum of investor positions",
      status: fundAumMismatch.error ? "warning" : fundAumData.length === 0 ? "ok" : "error",
      count: fundAumData.length,
      iconName: "wallet",
      details: fundAumMismatch.error
        ? [{ error: fundAumMismatch.error.message }]
        : (fundAumData as unknown as Record<string, unknown>[]),
    },
    {
      name: "Yield Conservation",
      description: "Gross yield = Net + Fees + IB",
      status: (yieldConservation.data?.length || 0) === 0 ? "ok" : "error",
      count: yieldConservation.data?.length || 0,
      iconName: "trending-up",
      details: yieldConservation.data ?? undefined,
    },
    {
      name: "IB Allocation Consistency",
      description: "IB relationships haven't changed since allocation",
      status: (ibConsistency.data?.length || 0) === 0 ? "ok" : "warning",
      count: ibConsistency.data?.length || 0,
      iconName: "users",
      details: ibConsistency.data ?? undefined,
    },
    {
      name: "Position vs Ledger",
      description: "Position values match transaction history",
      status: (positionLedgerMismatch.data?.length || 0) === 0 ? "ok" : "error",
      count: positionLedgerMismatch.data?.length || 0,
      iconName: "scale",
      details: positionLedgerMismatch.data ?? undefined,
    },
    {
      name: "Orphan Positions",
      description: "Positions without investor reference",
      status: (orphanPositions.count || 0) === 0 ? "ok" : "error",
      count: orphanPositions.count || 0,
      iconName: "database",
    },
    {
      name: "Voided Transactions",
      description: "Transactions marked as voided (informational)",
      status: (voidedTransactions.count || 0) === 0 ? "ok" : "warning",
      count: voidedTransactions.count || 0,
      iconName: "shield",
    },
  ];
}

/**
 * Fetches recent audit events
 */
export async function fetchAuditEvents(limit = 10): Promise<AuditEvent[]> {
  const { data } = await supabase
    .from("audit_log")
    .select("id, action, entity, entity_id, actor_user, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data as AuditEvent[]) || [];
}

/**
 * Runs the 16-check invariant suite via run_invariant_checks() RPC
 */
export interface InvariantCheckResult {
  name: string;
  category: string;
  passed: boolean;
  violation_count: number;
  violations: Record<string, unknown>[];
}

export interface InvariantSuiteResult {
  run_at: string;
  total_checks: number;
  passed: number;
  failed: number;
  checks: InvariantCheckResult[];
}

export async function runInvariantChecks(): Promise<InvariantSuiteResult> {
  // RPC added via migration; cast fn name until generated types are refreshed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await callRPCNoArgs("run_invariant_checks" as any);
  if (error) throw new Error(error.message);
  return data as unknown as InvariantSuiteResult;
}

export const integrityService = {
  fetchIntegrityChecks,
  fetchAuditEvents,
  runInvariantChecks,
};
