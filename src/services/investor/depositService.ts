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
      .order("tx_date", { ascending: false })
      .order("id", { ascending: false }); // Deterministic tie-breaker for same-day ordering

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
      user_id: tx.investor_id, // investor_id is now profile.id
      investor_id: tx.investor_id, // keep for backward compatibility if needed
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
      .single();

    if (error) throw error;
    return this.mapTransactionToDeposit(tx, (tx as any).profile);
  }

  async createDeposit(formData: DepositFormData): Promise<Deposit> {
    // Resolve investor_id (which is now profile_id) from user_id
    const profileId = formData.user_id; // user_id is already the profile_id

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
      .single();

    if (!fund?.id) {
      throw new Error(`Fund not found for asset symbol ${assetSymbol}`);
    }

    // Fetch existing position for balance_before
    const { data: existingPosition } = await supabase
      .from("investor_positions")
      .select("shares, cost_basis, current_value")
      .eq("investor_id", profileId) // Use profileId
      .eq("fund_id", fund.id)
      .maybeSingle();

    const amount = Number(formData.amount);
    const previousShares = Number(existingPosition?.shares || 0);
    const previousCostBasis = Number(existingPosition?.cost_basis || 0);
    const previousCurrentValue = Number(existingPosition?.current_value || 0);

    // Upsert investor_positions (composite key investor_id + fund_id)
    if (existingPosition) {
      const { error: updateError } = await supabase
        .from("investor_positions")
        .update({
          shares: previousShares + amount,
          cost_basis: previousCostBasis + amount,
          current_value: previousCurrentValue + amount,
          updated_at: new Date().toISOString(),
          fund_class: fund.fund_class || fund.asset,
        })
        .eq("investor_id", profileId) // Use profileId
        .eq("fund_id", fund.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase.from("investor_positions").insert([
        {
          investor_id: profileId, // Use profileId
          fund_id: fund.id,
          shares: amount,
          cost_basis: amount,
          current_value: amount,
          fund_class: fund.fund_class || fund.asset,
        },
      ]);
      if (insertError) throw insertError;
    }

    const txDate = formData.tx_date || new Date().toISOString().split("T")[0];

    // Record transaction
    const { data, error } = await supabase
      .from("transactions_v2")
      .insert({
        investor_id: profileId, // Use profileId
        fund_id: fund.id,
        type: "DEPOSIT",
        asset: fund.asset || assetSymbol,
        fund_class: fund.fund_class || fund.asset,
        amount,
        tx_hash: formData.transaction_hash || null,
        balance_before: previousShares,
        balance_after: previousShares + amount,
        tx_date: txDate,
        value_date: txDate,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapTransactionToDeposit(data);
  }

  async verifyDeposit(id: string): Promise<Deposit> {
    const { data, error } = await supabase
      .from("transactions_v2")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return this.mapTransactionToDeposit(data);
  }

  async rejectDeposit(id: string): Promise<Deposit> {
    const { data, error } = await supabase
      .from("transactions_v2")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return this.mapTransactionToDeposit(data);
  }

  async getDepositStats(): Promise<{
    total: number;
    pending: number;
    verified: number;
    rejected: number;
    total_amount: number;
    by_asset: Record<string, { count: number; amount: number }>;
  }> {
    const { data, error } = await supabase
      .from("transactions_v2")
      .select("asset, amount")
      .eq("type", "DEPOSIT");

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
