/**
 * Snapshot Service
 * Manages point-in-time snapshots for historical yield attribution
 * Ensures historical ownership percentages are preserved and immutable after yield is applied
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { logError } from "@/lib/logger";

export interface FundPeriodSnapshot {
  id: string;
  fund_id: string;
  period_id: string;
  snapshot_date: string;
  total_aum: number;
  investor_count: number;
  is_locked: boolean;
  locked_at?: string;
  locked_by?: string;
  created_at: string;
}

export interface InvestorPeriodSnapshot {
  id: string;
  fund_period_snapshot_id: string;
  investor_id: string;
  fund_id: string;
  period_id: string;
  balance_at_snapshot: number;
  ownership_pct: number;
  created_at: string;
}

export interface OwnershipData {
  investor_id: string;
  balance: number;
  ownership_pct: number;
  snapshot_date: string;
  is_locked: boolean;
}

/**
 * Generate a period snapshot for a fund
 * This calculates and stores ownership percentages as of the period end date
 */
export async function generatePeriodSnapshot(
  fundId: string,
  periodId: string,
  adminId?: string
): Promise<{ success: boolean; snapshotId?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .rpc("generate_fund_period_snapshot", {
        p_fund_id: fundId,
        p_period_id: periodId,
        p_admin_id: adminId || null,
      })
      .returns<Database["public"]["Functions"]["generate_fund_period_snapshot"]["Returns"]>();

    if (error) {
      logError("generatePeriodSnapshot", error, { fundId, periodId });
      return { success: false, error: error.message };
    }

    return { success: true, snapshotId: data };
  } catch (error) {
    logError("generatePeriodSnapshot.exception", error, { fundId, periodId });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Lock a period snapshot to prevent modifications
 * Should be called when yield is applied for a period
 */
export async function lockPeriodSnapshot(
  fundId: string,
  periodId: string,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .rpc("lock_fund_period_snapshot", {
        p_fund_id: fundId,
        p_period_id: periodId,
        p_admin_id: adminId,
      })
      .returns<Database["public"]["Functions"]["lock_fund_period_snapshot"]["Returns"]>();

    if (error) {
      logError("lockPeriodSnapshot", error, { fundId, periodId });
      return { success: false, error: error.message };
    }

    return { success: data === true };
  } catch (error) {
    logError("lockPeriodSnapshot.exception", error, { fundId, periodId });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if a period is locked
 */
export async function isPeriodLocked(fundId: string, periodId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc("is_period_locked", {
        p_fund_id: fundId,
        p_period_id: periodId,
      })
      .returns<Database["public"]["Functions"]["is_period_locked"]["Returns"]>();

    if (error) {
      logError("isPeriodLocked", error, { fundId, periodId });
      return false;
    }

    return data === true;
  } catch (error) {
    logError("isPeriodLocked.exception", error, { fundId, periodId });
    return false;
  }
}

/**
 * Get ownership percentages for a period
 * Returns the snapshot data if exists, otherwise returns null
 */
export async function getPeriodOwnership(
  fundId: string,
  periodId: string
): Promise<OwnershipData[] | null> {
  try {
    const { data, error } = await supabase
      .rpc("get_period_ownership", {
        p_fund_id: fundId,
        p_period_id: periodId,
      })
      .returns<Database["public"]["Functions"]["get_period_ownership"]["Returns"]>();

    if (error) {
      logError("getPeriodOwnership", error, { fundId, periodId });
      return null;
    }

    return data as OwnershipData[];
  } catch (error) {
    logError("getPeriodOwnership.exception", error, { fundId, periodId });
    return null;
  }
}

/**
 * Get a fund period snapshot
 */
export async function getFundPeriodSnapshot(
  fundId: string,
  periodId: string
): Promise<FundPeriodSnapshot | null> {
  try {
    const { data, error } = await supabase
      .from("fund_period_snapshot")
      .select("*")
      .eq("fund_id", fundId)
      .eq("period_id", periodId)
      .maybeSingle();

    if (error) {
      logError("getFundPeriodSnapshot", error, { fundId, periodId });
      return null;
    }

    return data as FundPeriodSnapshot | null;
  } catch (error) {
    logError("getFundPeriodSnapshot.exception", error, { fundId, periodId });
    return null;
  }
}

/**
 * Get all investor snapshots for a fund period
 */
export async function getInvestorPeriodSnapshots(
  fundId: string,
  periodId: string
): Promise<InvestorPeriodSnapshot[]> {
  try {
    // First get the fund period snapshot id
    const fundSnapshot = await getFundPeriodSnapshot(fundId, periodId);
    if (!fundSnapshot) {
      return [];
    }

    const { data, error } = await supabase
      .from("investor_period_snapshot")
      .select("*")
      .eq("fund_period_snapshot_id", fundSnapshot.id)
      .order("ownership_pct", { ascending: false });

    if (error) {
      logError("getInvestorPeriodSnapshots", error, { fundId, periodId });
      return [];
    }

    return (data || []) as InvestorPeriodSnapshot[];
  } catch (error) {
    logError("getInvestorPeriodSnapshots.exception", error, { fundId, periodId });
    return [];
  }
}

/**
 * Ensure a snapshot exists for a period, generating one if needed
 * This is the main entry point for yield distribution
 */
export async function ensureSnapshotExists(
  fundId: string,
  periodId: string,
  adminId?: string
): Promise<{ exists: boolean; isLocked: boolean; snapshotId?: string; error?: string }> {
  try {
    // Check if snapshot already exists
    const existing = await getFundPeriodSnapshot(fundId, periodId);

    if (existing) {
      return {
        exists: true,
        isLocked: existing.is_locked,
        snapshotId: existing.id,
      };
    }

    // Generate new snapshot
    const result = await generatePeriodSnapshot(fundId, periodId, adminId);

    if (!result.success) {
      return { exists: false, isLocked: false, error: result.error };
    }

    return {
      exists: true,
      isLocked: false,
      snapshotId: result.snapshotId,
    };
  } catch (error) {
    logError("ensureSnapshotExists.exception", error, { fundId, periodId });
    return {
      exists: false,
      isLocked: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get all locked periods for a fund
 */
export async function getLockedPeriods(fundId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("fund_period_snapshot")
      .select("period_id")
      .eq("fund_id", fundId)
      .eq("is_locked", true);

    if (error) {
      logError("getLockedPeriods", error, { fundId });
      return [];
    }

  return (data || []).map((r) => r.period_id);
  } catch (error) {
    logError("getLockedPeriods.exception", error, { fundId });
    return [];
  }
}

/**
 * Unlock a period snapshot (Super Admin only)
 * Allows yield modifications after a period was locked
 */
export async function unlockPeriodSnapshot(
  fundId: string,
  periodId: string,
  adminId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .rpc("unlock_fund_period_snapshot", {
        p_fund_id: fundId,
        p_period_id: periodId,
        p_admin_id: adminId,
        p_reason: reason,
      })
      .returns<Database["public"]["Functions"]["unlock_fund_period_snapshot"]["Returns"]>();

    if (error) {
      logError("unlockPeriodSnapshot", error, { fundId, periodId });
      return { success: false, error: error.message };
    }

    return { success: data === true };
  } catch (error) {
    logError("unlockPeriodSnapshot.exception", error, { fundId, periodId });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export const snapshotService = {
  generatePeriodSnapshot,
  lockPeriodSnapshot,
  unlockPeriodSnapshot,
  isPeriodLocked,
  getPeriodOwnership,
  getFundPeriodSnapshot,
  getInvestorPeriodSnapshots,
  ensureSnapshotExists,
  getLockedPeriods,
};

export default snapshotService;
