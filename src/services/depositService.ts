import { supabase } from "@/integrations/supabase/client";
import type { Deposit, DepositFormData, DepositFilters } from "@/types/deposit";

export class DepositService {
  async getDeposits(filters?: DepositFilters): Promise<Deposit[]> {
    let query = supabase
      .from("transactions_v2")
      .select("*")
      .eq("type", "DEPOSIT")
      .order("occurred_at", { ascending: false });

    if (filters?.asset_symbol) {
      query = query.eq("asset", filters.asset_symbol);
    }

    if (filters?.search) {
      query = query.or(`tx_hash.ilike.%${filters.search}%,asset.ilike.%${filters.search}%`);
    }

    if (filters?.start_date) {
      query = query.gte("occurred_at", filters.start_date);
    }

    if (filters?.end_date) {
      query = query.lte("occurred_at", filters.end_date);
    }

    const { data: transactions, error } = await query;

    if (error) throw error;

    // Fetch investors for all transactions
    const investorIds = Array.from(
      new Set(
        (transactions || [])
          .map((d: any) => d.investor_id)
          .filter((id): id is string => id !== null)
      )
    );

    if (investorIds.length === 0) {
      return (transactions || []).map((tx) => this.mapTransactionToDeposit(tx)) as Deposit[];
    }

    const { data: investors, error: investorsError } = await supabase
      .from("investors")
      .select("id, name, email, profile_id")
      .in("id", investorIds);

    if (investorsError) {
      console.error("Error fetching investors:", investorsError);
      return (transactions || []).map((tx) => this.mapTransactionToDeposit(tx)) as Deposit[];
    }

    const investorMap = new Map(investors?.map((i) => [i.id, i]) || []);

    return (transactions || []).map((tx) => {
      const investor = tx.investor_id ? investorMap.get(tx.investor_id) : undefined;
      return this.mapTransactionToDeposit(tx, investor);
    }) as Deposit[];
  }

  private mapTransactionToDeposit(tx: any, investor?: any): Deposit {
    return {
      id: tx.id,
      user_id: investor?.profile_id, // Map back to user_id if possible
      investor_id: tx.investor_id,
      amount: tx.amount,
      asset_symbol: tx.asset,
      status: "completed",
      transaction_hash: tx.tx_hash,
      created_at: tx.occurred_at || tx.created_at,
      updated_at: tx.updated_at,
      user_name: investor?.name,
      user_email: investor?.email,
    };
  }

  async getDepositById(id: string): Promise<Deposit> {
    const { data: tx, error } = await supabase
      .from("transactions_v2")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    let investor;
    if (tx.investor_id) {
      const { data: inv } = await supabase
        .from("investors")
        .select("id, name, email, profile_id")
        .eq("id", tx.investor_id)
        .single();
      investor = inv;
    }

    return this.mapTransactionToDeposit(tx, investor);
  }

  async createDeposit(formData: DepositFormData): Promise<Deposit> {
    // Resolve investor_id from user_id (profile_id)
    const { data: investor } = await supabase
      .from("investors")
      .select("id")
      .eq("profile_id", formData.user_id)
      .maybeSingle();

    if (!investor?.id) {
      throw new Error("Investor not found for user_id");
    }

    // Resolve fund by asset symbol
    const assetSymbol = formData.asset_symbol.toUpperCase();
    const { data: fund } = await supabase
      .from("funds")
      .select("id, asset, fund_class")
      .eq("asset", assetSymbol)
      .maybeSingle();

    if (!fund?.id) {
      throw new Error(`Fund not found for asset symbol ${assetSymbol}`);
    }

    // Fetch existing position for balance_before
    const { data: existingPosition } = await supabase
      .from("investor_positions")
      .select("shares, cost_basis, current_value")
      .eq("investor_id", investor.id)
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
        .eq("investor_id", investor.id)
        .eq("fund_id", fund.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase.from("investor_positions").insert([
        {
          investor_id: investor.id,
          fund_id: fund.id,
          shares: amount,
          cost_basis: amount,
          current_value: amount,
          fund_class: fund.fund_class || fund.asset,
        },
      ]);
      if (insertError) throw insertError;
    }

    const occurredAt = new Date().toISOString();

    // Record transaction
    const { data, error } = await supabase
      .from("transactions_v2")
      .insert({
        investor_id: investor.id,
        fund_id: fund.id,
        type: "DEPOSIT",
        asset: fund.asset || assetSymbol,
        fund_class: fund.fund_class || fund.asset,
        amount,
        tx_hash: formData.transaction_hash || null,
        balance_before: previousShares,
        balance_after: previousShares + amount,
        occurred_at: occurredAt,
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
