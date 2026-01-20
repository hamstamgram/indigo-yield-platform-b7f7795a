import { supabase } from "@/integrations/supabase/client";
import type { Deposit, DepositFormData, DepositFilters } from "@/types/domains";
import { depositNotifications } from "@/services/notifications";
import { logError } from "@/lib/logger";
import { callRPC } from "@/lib/supabase/typedRPC";
import { rpc } from "@/lib/rpc";
import { getTodayString } from "@/utils/dateUtils";

export class DepositService {
  async getDeposits(filters?: DepositFilters): Promise<Deposit[]> {
    let query = supabase
      .from("transactions_v2")
      .select(
        `
        *,
        profile:profiles!transactions_v2_investor_id_fkey (
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
      query = query.or(`tx_hash.ilike.%${filters.search}%,asset.ilike.%${filters.search}%`);
    }

    if (filters?.start_date) {
      query = query.gte("tx_date", filters.start_date);
    }

    if (filters?.end_date) {
      query = query.lte("tx_date", filters.end_date);
    }

    const { data: transactions, error } = await query;

    if (error) throw error;

    return (transactions || []).map((tx) =>
      this.mapTransactionToDeposit(tx, (tx as any).profile)
    ) as Deposit[];
  }

  private mapTransactionToDeposit(tx: any, profile?: any): Deposit {
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

  async getDepositById(id: string): Promise<Deposit> {
    const { data: tx, error } = await supabase
      .from("transactions_v2")
      .select(
        `
        *,
        profile:profiles!transactions_v2_investor_id_fkey (
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
    return this.mapTransactionToDeposit(tx, (tx as any).profile);
  }

  /**
   * Create deposit using crystallize-before-flow accounting.
   * NOTE: This requires an authoritative new total AUM snapshot (p_new_total_aum).
   */
  async createDeposit(formData: DepositFormData): Promise<Deposit> {
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

    const amount = Number(formData.amount);
    const txDate = formData.tx_date || getTodayString();

    const closingAum = formData.closing_aum;
    if (!closingAum) {
      throw new Error(
        "closing_aum is required to apply a deposit (crystallize-before-flow). Provide the authoritative AUM snapshot for this event."
      );
    }

    // Trigger reference for idempotency (used by fund_aum_events + reference_id prefixing)
    const triggerReference = `deposit:${fund.id}:${profileId}:${txDate}:${crypto.randomUUID()}`;

    const { data, error } = await callRPC("apply_deposit_with_crystallization", {
      p_fund_id: fund.id,
      p_investor_id: profileId,
      p_amount: amount,
      p_closing_aum: Number(closingAum),
      p_effective_date: txDate,
      p_admin_id: profileId,
      p_notes: `Deposit - ${triggerReference}`,
      p_purpose: "transaction",
    });

    if (error) {
      logError("depositService.createDeposit", error, { fundId: fund.id, profileId });
      throw new Error(error.message || "Failed to create deposit");
    }

    const result = data as any;
    if (!result?.success || !result?.deposit_tx_id) {
      throw new Error("Failed to create deposit");
    }

    // Send deposit notification (non-blocking)
    depositNotifications
      .onConfirmed(profileId, result.deposit_tx_id, amount, assetSymbol, fund?.name)
      .catch((err) => logError("depositService.notification", err, { profileId }));

    return this.getDepositById(result.deposit_tx_id);
  }

  /**
   * Verify a deposit - marks it as admin-reviewed by updating notes
   * Note: Deposits are created immediately via RPC, so "verify" means admin acknowledgment
   */
  async verifyDeposit(id: string, adminId?: string): Promise<Deposit> {
    // Fetch the deposit first
    const { data: existing, error: fetchError } = await supabase
      .from("transactions_v2")
      .select("*, profile:profiles!transactions_v2_investor_id_fkey (first_name, last_name, email)")
      .eq("id", id)
      .eq("type", "DEPOSIT")
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) throw new Error("Deposit not found");
    if (existing.is_voided) throw new Error("Cannot verify a voided deposit");

    // Update notes to indicate verification
    const verifiedNote = existing.notes
      ? `${existing.notes} | Verified by admin at ${new Date().toISOString()}`
      : `Verified by admin at ${new Date().toISOString()}`;

    const { error: updateError } = await supabase
      .from("transactions_v2")
      .update({ notes: verifiedNote })
      .eq("id", id);

    if (updateError) {
      logError("depositService.verifyDeposit", updateError, { depositId: id });
      throw new Error("Failed to verify deposit");
    }

    return this.mapTransactionToDeposit(
      { ...existing, notes: verifiedNote },
      (existing as any).profile
    );
  }

  /**
   * Reject a deposit - voids the transaction using the canonical void_transaction RPC
   * This reverses the position change and marks the transaction as voided
   */
  async rejectDeposit(id: string, reason: string = "Deposit rejected by admin"): Promise<Deposit> {
    // Get current user for admin_id
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("Admin user not authenticated");

    // Fetch the deposit first to verify it exists and is a DEPOSIT type
    const { data: existing, error: fetchError } = await supabase
      .from("transactions_v2")
      .select("*, profile:profiles!transactions_v2_investor_id_fkey (first_name, last_name, email)")
      .eq("id", id)
      .eq("type", "DEPOSIT")
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) throw new Error("Deposit not found");
    if (existing.is_voided) throw new Error("Deposit is already voided");

    // Call the void_transaction RPC to properly void and recalculate position
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

    // Return the updated deposit (now voided)
    const voided = await this.getDepositById(id).catch(() => {
      // If we can't fetch (may be filtered out), return mapped version
      return this.mapTransactionToDeposit(
        { ...existing, is_voided: true, notes: `${existing.notes || ""} | VOIDED: ${reason}` },
        (existing as any).profile
      );
    });

    return voided;
  }

  async getDepositStats(filters?: DepositFilters): Promise<{
    total: number;
    pending: number;
    verified: number;
    rejected: number;
    total_amount: number;
    by_asset: Record<string, { count: number; amount: number }>;
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
      query = query.or(`tx_hash.ilike.%${filters.search}%,asset.ilike.%${filters.search}%`);
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
      total_amount: data?.reduce((sum, d) => sum + Number(d.amount), 0) || 0,
      by_asset: {} as Record<string, { count: number; amount: number }>,
    };

    data?.forEach((deposit) => {
      const asset = deposit.asset || "UNKNOWN";
      if (!stats.by_asset[asset]) {
        stats.by_asset[asset] = { count: 0, amount: 0 };
      }
      stats.by_asset[asset].count++;
      stats.by_asset[asset].amount += Number(deposit.amount);
    });

    return stats;
  }
}

export const depositService = new DepositService();
