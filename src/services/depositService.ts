import { supabase } from "@/integrations/supabase/client";
import type { Deposit, DepositFormData, DepositFilters } from "@/types/deposit";

export class DepositService {
  async getDeposits(filters?: DepositFilters): Promise<Deposit[]> {
    let query = supabase.from("deposits").select("*").order("created_at", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    if (filters?.asset_symbol) {
      query = query.eq("asset_symbol", filters.asset_symbol);
    }

    if (filters?.search) {
      query = query.or(
        `transaction_hash.ilike.%${filters.search}%,asset_symbol.ilike.%${filters.search}%`
      );
    }

    if (filters?.start_date) {
      query = query.gte("created_at", filters.start_date);
    }

    if (filters?.end_date) {
      query = query.lte("created_at", filters.end_date);
    }

    const { data: deposits, error } = await query;

    if (error) throw error;

    // Fetch user profiles for all deposits
    const userIds = Array.from(
      new Set(deposits?.map((d) => d.user_id).filter((id): id is string => id !== null))
    );

    if (userIds.length === 0) {
      return (deposits || []) as Deposit[];
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return (deposits || []) as Deposit[];
    }

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    return (deposits || []).map((d) => {
      const profile = d.user_id ? profileMap.get(d.user_id) : undefined;
      return {
        ...d,
        user_email: profile?.email,
        user_name: profile
          ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
          : undefined,
      };
    }) as Deposit[];
  }

  async getDepositById(id: string): Promise<Deposit> {
    const { data: deposit, error } = await supabase
      .from("deposits")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    // Fetch user profile
    if (deposit.user_id) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("id", deposit.user_id)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
      }

      return {
        ...deposit,
        user_email: profile?.email,
        user_name: profile
          ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
          : undefined,
      } as Deposit;
    }

    return deposit as Deposit;
  }

  async createDeposit(formData: DepositFormData): Promise<Deposit> {
    const { data, error } = await supabase
      .from("deposits")
      .insert({
        user_id: formData.user_id,
        asset_symbol: formData.asset_symbol,
        amount: formData.amount,
        transaction_hash: formData.transaction_hash || null,
        status: formData.status || "pending",
      })
      .select()
      .single();

    if (error) throw error;
    return data as Deposit;
  }

  async verifyDeposit(id: string): Promise<Deposit> {
    const { data, error } = await supabase
      .from("deposits")
      .update({ status: "verified" })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Deposit;
  }

  async rejectDeposit(id: string): Promise<Deposit> {
    const { data, error } = await supabase
      .from("deposits")
      .update({ status: "rejected" })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Deposit;
  }

  async getDepositStats(): Promise<{
    total: number;
    pending: number;
    verified: number;
    rejected: number;
    total_amount: number;
    by_asset: Record<string, { count: number; amount: number }>;
  }> {
    const { data, error } = await supabase.from("deposits").select("status, asset_symbol, amount");

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      pending: data?.filter((d) => d.status === "pending").length || 0,
      verified: data?.filter((d) => d.status === "verified").length || 0,
      rejected: data?.filter((d) => d.status === "rejected").length || 0,
      total_amount: data?.reduce((sum, d) => sum + Number(d.amount), 0) || 0,
      by_asset: {} as Record<string, { count: number; amount: number }>,
    };

    data?.forEach((deposit) => {
      if (!stats.by_asset[deposit.asset_symbol]) {
        stats.by_asset[deposit.asset_symbol] = { count: 0, amount: 0 };
      }
      stats.by_asset[deposit.asset_symbol].count++;
      stats.by_asset[deposit.asset_symbol].amount += Number(deposit.amount);
    });

    return stats;
  }
}

export const depositService = new DepositService();
