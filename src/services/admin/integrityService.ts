/**
 * Integrity Service
 * Encapsulates all Supabase operations for data integrity checks
 */

import { supabase } from "@/integrations/supabase/client";
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
    supabase.from("fund_aum_mismatch").select("*"),
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

  return [
    {
      name: "Fund AUM Reconciliation",
      description: "Recorded AUM matches sum of investor positions",
      status: (fundAumMismatch.data?.length || 0) === 0 ? "ok" : "error",
      count: fundAumMismatch.data?.length || 0,
      iconName: "wallet",
      details: fundAumMismatch.data ?? undefined,
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
 * Run position reconciliation via RPC
 * @param dryRun - If true, returns preview without making changes
 */
export async function runPositionReconciliation(dryRun = true): Promise<{
  investor_id: string;
  fund_id: string;
  investor_name: string;
  fund_name: string;
  old_value: number;
  new_value: number;
  action: string;
}[]> {
  const { data, error } = await supabase.rpc("reconcile_all_positions", {
    p_dry_run: dryRun,
  });

  if (error) throw error;
  return data || [];
}

export const integrityService = {
  fetchIntegrityChecks,
  fetchAuditEvents,
  runPositionReconciliation,
};
