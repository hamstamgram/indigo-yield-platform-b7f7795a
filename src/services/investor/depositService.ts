import { supabase } from "@/integrations/supabase/client";
import type { Deposit, DepositFormData, DepositFilters } from "@/types/domains";
import { depositNotifications } from "@/services/notifications";
import { logError } from "@/lib/logger";
import { rpc } from "@/lib/rpc/index";
import { getTodayString } from "@/utils/dateUtils";
import { generateUUID } from "@/lib/utils";
import { buildSafeOrFilter } from "@/utils/searchSanitizer";
import { parseFinancial } from "@/utils/financial";

// Type for Supabase join result with profile
interface TransactionWithProfile {
  id: string;
  investor_id: string;
  amount: number;
  asset: string;
  tx_date: string;
  tx_hash: string | null;
  notes: string | null;
  is_voided: boolean;
  created_at: string;
  profile: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
}

// Type for deposit RPC result
interface DepositRPCResult {
  success: boolean;
  transaction_id?: string;
  deposit_tx_id?: string;
  error?: string;
}

function mapTransactionToDeposit(tx: any, profile?: any): Deposit {
  const userName =
    profile?.first_name || profile?.last_name
      ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
      : profile?.email;

  return {
    id: tx.id,
    user_id: tx.investor_id,
    investor_id: tx.investor_id,
    amount: tx.amount,
    asset_symbol: tx.asset,
    status: "completed",
    transaction_hash: tx.tx_hash,
    created_at: tx.tx_date || tx.created_at,
    updated_at: tx.created_at,
    user_name: userName,
    user_email: profile?.email,
  };
}

export async function getDeposits(filters?: DepositFilters): Promise<Deposit[]> {
  let query = supabase
    .from("transactions_v2")
    .select(
      `
      *,
      profile:profiles!fk_transactions_v2_investor (
        first_name,
        last_name,
        email
      )
    `
    )
    .eq("type", "DEPOSIT")
    .eq("is_voided", false)
    .order("tx_date", { ascending: false })
    .order("id", { ascending: false });

  if (filters?.asset_symbol) {
    query = query.eq("asset", filters.asset_symbol);
  }

  if (filters?.search) {
    const safeFilter = buildSafeOrFilter(filters.search, ["tx_hash", "asset"]);
    if (safeFilter) {
      query = query.or(safeFilter);
    }
  }

  if (filters?.start_date) {
    query = query.gte("tx_date", filters.start_date);
  }

  if (filters?.end_date) {
    query = query.lte("tx_date", filters.end_date);
  }

  const { data: transactions, error } = await query;

  if (error) throw error;

  return (transactions || []).map((tx) => {
    const txWithProfile = tx as unknown as TransactionWithProfile;
    return mapTransactionToDeposit(tx, txWithProfile.profile);
  }) as Deposit[];
}

export async function getDepositById(id: string): Promise<Deposit> {
  const { data: tx, error } = await supabase
    .from("transactions_v2")
    .select(
      `
      *,
      profile:profiles!fk_transactions_v2_investor (
        first_name,
        last_name,
        email
      )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!tx) throw new Error("Deposit not found");
  const txWithProfile = tx as unknown as TransactionWithProfile;
  return mapTransactionToDeposit(tx, txWithProfile.profile);
}

/**
 * Create deposit using crystallize-before-flow accounting.
 * NOTE: This requires an authoritative new total AUM snapshot (p_new_total_aum).
 */
export async function createDeposit(formData: DepositFormData): Promise<Deposit> {
  const profileId = formData.user_id;

  // Check if profile exists
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile?.id) {
    throw new Error("Profile not found for user_id. Please ensure the investor has a profile.");
  }

  // Resolve fund by asset symbol
  const assetSymbol = formData.asset_symbol.toUpperCase();
  const { data: fund } = await supabase
    .from("funds")
    .select("id, name, asset, fund_class")
    .eq("asset", assetSymbol)
    .eq("status", "active")
    .maybeSingle();

  if (!fund?.id) {
    throw new Error(`Fund not found for asset symbol ${assetSymbol}`);
  }

  const amount = String(formData.amount);
  const txDate = formData.tx_date || getTodayString();

  const closingAum = formData.closing_aum;
  if (!closingAum) {
    throw new Error(
      "closing_aum is required to apply a deposit (crystallize-before-flow). Provide the authoritative AUM snapshot for this event."
    );
  }

  const triggerReference = `deposit:${fund.id}:${profileId}:${txDate}:${generateUUID()}`;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    throw new Error("Authentication required to create deposits");
  }

  const rpcResult = await rpc.call("apply_transaction_with_crystallization", {
    p_fund_id: fund.id,
    p_investor_id: profileId,
    p_tx_type: "DEPOSIT",
    p_amount: String(amount) as unknown as number,
    p_tx_date: txDate,
    p_reference_id: triggerReference,
    p_new_total_aum: String(closingAum) as unknown as number,
    p_admin_id: user.id,
    p_notes: `Deposit - ${triggerReference}`,
    p_purpose: "transaction",
  });

  if (rpcResult.error) {
    logError("depositService.createDeposit", rpcResult.error, { fundId: fund.id, profileId });
    throw new Error(rpcResult.error.message || "Failed to create deposit");
  }

  const result = rpcResult.data as unknown as DepositRPCResult;
  const txId = result?.transaction_id || result?.deposit_tx_id;
  if (!result?.success || !txId) {
    throw new Error("Failed to create deposit");
  }

  // Send deposit notification (non-blocking)
  depositNotifications
    .onConfirmed(profileId, txId, Number(amount), assetSymbol, fund?.name)
    .catch((err) => logError("depositService.notification", err, { profileId }));

  return getDepositById(txId);
}

/**
 * Verify a deposit - marks it as admin-reviewed by updating notes
 */
export async function verifyDeposit(id: string, adminId?: string): Promise<Deposit> {
  const { data: existing, error: fetchError } = await supabase
    .from("transactions_v2")
    .select("*, profile:profiles!fk_transactions_v2_investor (first_name, last_name, email)")
    .eq("id", id)
    .eq("type", "DEPOSIT")
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!existing) throw new Error("Deposit not found");
  if (existing.is_voided) throw new Error("Cannot verify a voided deposit");

  const verifiedNote = existing.notes
    ? `${existing.notes} | Verified by admin at ${new Date().toISOString()}`
    : `Verified by admin at ${new Date().toISOString()}`;

  const { error: updateError } = await rpc.call("edit_transaction", {
    p_transaction_id: id,
    p_notes: verifiedNote,
  });

  if (updateError) {
    logError("depositService.verifyDeposit", updateError, { depositId: id });
    throw new Error("Failed to verify deposit");
  }

  const existingWithProfile = existing as unknown as TransactionWithProfile;
  return mapTransactionToDeposit({ ...existing, notes: verifiedNote }, existingWithProfile.profile);
}

/**
 * Reject a deposit - voids the transaction using the canonical void_transaction RPC
 */
export async function rejectDeposit(
  id: string,
  reason: string = "Deposit rejected by admin"
): Promise<Deposit> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) throw new Error("Admin user not authenticated");

  const { data: existing, error: fetchError } = await supabase
    .from("transactions_v2")
    .select("*, profile:profiles!fk_transactions_v2_investor (first_name, last_name, email)")
    .eq("id", id)
    .eq("type", "DEPOSIT")
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!existing) throw new Error("Deposit not found");
  if (existing.is_voided) throw new Error("Deposit is already voided");

  const { data, error } = await rpc.call("void_transaction", {
    p_transaction_id: id,
    p_admin_id: user.id,
    p_reason: reason,
  });

  if (error) {
    logError("depositService.rejectDeposit", error, { depositId: id });
    throw new Error(error.message || "Failed to reject deposit");
  }

  const result = data as { success?: boolean; error?: string };
  if (!result?.success) {
    throw new Error(result?.error || "Failed to void deposit");
  }

  const existingWithProfile = existing as unknown as TransactionWithProfile;
  const voided = await getDepositById(id).catch(() => {
    return mapTransactionToDeposit(
      { ...existing, is_voided: true, notes: `${existing.notes || ""} | VOIDED: ${reason}` },
      existingWithProfile.profile
    );
  });

  return voided;
}

export async function getDepositStats(filters?: DepositFilters): Promise<{
  total: number;
  pending: number;
  verified: number;
  rejected: number;
  total_amount: string;
  by_asset: Record<string, { count: number; amount: string }>;
}> {
  let query = supabase
    .from("transactions_v2")
    .select("asset, amount, is_voided")
    .eq("type", "DEPOSIT")
    .eq("is_voided", false);

  if (filters?.asset_symbol) {
    query = query.eq("asset", filters.asset_symbol);
  }

  if (filters?.search) {
    const safeFilter = buildSafeOrFilter(filters.search, ["tx_hash", "asset"]);
    if (safeFilter) {
      query = query.or(safeFilter);
    }
  }

  if (filters?.start_date) {
    query = query.gte("tx_date", filters.start_date);
  }

  if (filters?.end_date) {
    query = query.lte("tx_date", filters.end_date);
  }

  const { data, error } = await query;

  if (error) throw error;

  const stats = {
    total: data?.length || 0,
    pending: 0,
    verified: data?.length || 0,
    rejected: 0,
    total_amount:
      data?.reduce((sum, d) => sum.plus(parseFinancial(d.amount)), parseFinancial(0)).toString() ||
      "0",
    by_asset: {} as Record<string, { count: number; amount: string }>,
  };

  data?.forEach((deposit) => {
    const asset = deposit.asset || "UNKNOWN";
    if (!stats.by_asset[asset]) {
      stats.by_asset[asset] = { count: 0, amount: "0" };
    }
    stats.by_asset[asset].count++;
    stats.by_asset[asset].amount = parseFinancial(stats.by_asset[asset].amount)
      .plus(parseFinancial(deposit.amount))
      .toString();
  });

  return stats;
}

// Plain object singleton for depositService.method() pattern
export const depositService = {
  getDeposits,
  getDepositById,
  createDeposit,
  verifyDeposit,
  rejectDeposit,
  getDepositStats,
};

// Keep DepositService as a type alias for backward compatibility in barrel exports
export type DepositService = typeof depositService;
