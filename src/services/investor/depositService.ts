import { supabase } from "@/integrations/supabase/client";
import type { Deposit, DepositFormData, DepositFilters } from "@/types/domains";

export class DepositService {
  async getDeposits(filters?: DepositFilters): Promise<Deposit[]> {
    let query = supabase
      .from("transactions_v2")
      .select(
        `
        *,
        profile:profiles!fk_transactions_v2_profile (
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
      updated_at: tx.updated_at,
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
        profile:profiles!fk_transactions_v2_profile (
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
   * Create deposit using the canonical adjust_investor_position RPC
   * This ensures atomic transaction + position update with invariant checks
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
      .select("id, asset, fund_class")
      .eq("asset", assetSymbol)
      .eq("status", "active")
      .maybeSingle();

    if (!fund?.id) {
      throw new Error(`Fund not found for asset symbol ${assetSymbol}`);
    }

    const amount = Number(formData.amount);
    const txDate = formData.tx_date || new Date().toISOString().split("T")[0];
    
    // Generate unique reference_id for idempotency
    const referenceId = `deposit:${fund.id}:${profileId}:${txDate}:${crypto.randomUUID()}`;

    // Use canonical adjust_investor_position RPC for atomic transaction + position update
    const rpcCall = (supabase.rpc as any).bind(supabase);
    const { data, error } = await rpcCall("adjust_investor_position", {
      p_investor_id: profileId,
      p_fund_id: fund.id,
      p_delta: amount,
      p_note: `DEPOSIT of ${amount} ${assetSymbol}`,
      p_admin_id: null,
      p_tx_type: "DEPOSIT",
      p_tx_date: txDate,
      p_reference_id: referenceId,
    });

    if (error) {
      console.error("adjust_investor_position error:", error);
      throw new Error(error.message || "Failed to create deposit");
    }

    // Get the created transaction ID from the RPC result
    const result = data?.[0];
    if (!result?.out_success) {
      throw new Error(result?.out_message || "Failed to create deposit");
    }

    return this.getDepositById(result.out_transaction_id);
  }

  async verifyDeposit(id: string): Promise<Deposit> {
    const { data, error } = await supabase
      .from("transactions_v2")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Deposit not found");
    return this.mapTransactionToDeposit(data);
  }

  async rejectDeposit(id: string): Promise<Deposit> {
    const { data, error } = await supabase
      .from("transactions_v2")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Deposit not found");
    return this.mapTransactionToDeposit(data);
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
