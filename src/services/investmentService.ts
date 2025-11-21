import { supabase } from "@/integrations/supabase/client";
import type { Investment, InvestmentFormData, InvestmentFilters } from "@/types/investment";

class InvestmentService {
  async getInvestments(filters?: InvestmentFilters): Promise<Investment[]> {
    let query = supabase
      .from("investments")
      .select(
        `
        *,
        investor:investors!inner(id, name, email),
        fund:funds!inner(id, name, code)
      `
      )
      .order("created_at", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    if (filters?.fund_id) {
      query = query.eq("fund_id", filters.fund_id);
    }

    if (filters?.investor_id) {
      query = query.eq("investor_id", filters.investor_id);
    }

    if (filters?.date_from) {
      query = query.gte("investment_date", filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte("investment_date", filters.date_to);
    }

    if (filters?.search) {
      query = query.or(
        `reference_number.ilike.%${filters.search}%,investor.name.ilike.%${filters.search}%`
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((inv: any) => ({
      ...inv,
      status: inv.status as Investment["status"],
      transaction_type: inv.transaction_type as Investment["transaction_type"],
      reference_number: inv.reference_number ?? undefined,
      notes: inv.notes ?? undefined,
      created_by: inv.created_by ?? undefined,
      processed_by: inv.processed_by ?? undefined,
      processed_at: inv.processed_at ?? undefined,
      metadata: inv.metadata as Record<string, any> | undefined,
      investor_name: inv.investor?.name,
      investor_email: inv.investor?.email,
      fund_name: inv.fund?.name,
      fund_code: inv.fund?.code,
    }));
  }

  async getInvestmentById(id: string): Promise<Investment> {
    const { data, error } = await supabase
      .from("investments")
      .select(
        `
        *,
        investor:investors!inner(id, name, email),
        fund:funds!inner(id, name, code)
      `
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) throw new Error("Investment not found");

    return {
      ...data,
      status: data.status as Investment["status"],
      transaction_type: data.transaction_type as Investment["transaction_type"],
      reference_number: data.reference_number ?? undefined,
      notes: data.notes ?? undefined,
      created_by: data.created_by ?? undefined,
      processed_by: data.processed_by ?? undefined,
      processed_at: data.processed_at ?? undefined,
      metadata: data.metadata as Record<string, any> | undefined,
      investor_name: data.investor?.name,
      investor_email: data.investor?.email,
      fund_name: data.fund?.name,
      fund_code: data.fund?.code,
    };
  }

  async createInvestment(formData: InvestmentFormData): Promise<Investment> {
    const { data, error } = await supabase
      .from("investments")
      .insert({
        ...formData,
        status: "pending",
        shares: 0, // Will be calculated on approval
      })
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      status: data.status as Investment["status"],
      transaction_type: data.transaction_type as Investment["transaction_type"],
      reference_number: data.reference_number ?? undefined,
      notes: data.notes ?? undefined,
      created_by: data.created_by ?? undefined,
      processed_by: data.processed_by ?? undefined,
      processed_at: data.processed_at ?? undefined,
      metadata: data.metadata as Record<string, any> | undefined,
    };
  }

  async approveInvestment(id: string, shares: number): Promise<Investment> {
    const { data, error } = await supabase
      .from("investments")
      .update({
        status: "active",
        shares,
        processed_at: new Date().toISOString(),
        processed_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      status: data.status as Investment["status"],
      transaction_type: data.transaction_type as Investment["transaction_type"],
      reference_number: data.reference_number ?? undefined,
      notes: data.notes ?? undefined,
      created_by: data.created_by ?? undefined,
      processed_by: data.processed_by ?? undefined,
      processed_at: data.processed_at ?? undefined,
      metadata: data.metadata as Record<string, any> | undefined,
    };
  }

  async rejectInvestment(id: string, reason: string): Promise<Investment> {
    const { data, error } = await supabase
      .from("investments")
      .update({
        status: "rejected",
        notes: reason,
        processed_at: new Date().toISOString(),
        processed_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      status: data.status as Investment["status"],
      transaction_type: data.transaction_type as Investment["transaction_type"],
      reference_number: data.reference_number ?? undefined,
      notes: data.notes ?? undefined,
      created_by: data.created_by ?? undefined,
      processed_by: data.processed_by ?? undefined,
      processed_at: data.processed_at ?? undefined,
      metadata: data.metadata as Record<string, any> | undefined,
    };
  }

  async cancelInvestment(id: string): Promise<Investment> {
    const { data, error } = await supabase
      .from("investments")
      .update({
        status: "cancelled",
        processed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      status: data.status as Investment["status"],
      transaction_type: data.transaction_type as Investment["transaction_type"],
      reference_number: data.reference_number ?? undefined,
      notes: data.notes ?? undefined,
      created_by: data.created_by ?? undefined,
      processed_by: data.processed_by ?? undefined,
      processed_at: data.processed_at ?? undefined,
      metadata: data.metadata as Record<string, any> | undefined,
    };
  }

  async updateInvestment(id: string, updates: Partial<InvestmentFormData>): Promise<Investment> {
    const { data, error } = await supabase
      .from("investments")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      status: data.status as Investment["status"],
      transaction_type: data.transaction_type as Investment["transaction_type"],
      reference_number: data.reference_number ?? undefined,
      notes: data.notes ?? undefined,
      created_by: data.created_by ?? undefined,
      processed_by: data.processed_by ?? undefined,
      processed_at: data.processed_at ?? undefined,
      metadata: data.metadata as Record<string, any> | undefined,
    };
  }

  async getInvestmentSummary() {
    const { data, error } = await supabase
      .from("investment_summary")
      .select("*")
      .order("total_invested", { ascending: false });

    if (error) throw error;
    return data || [];
  }
}

export const investmentService = new InvestmentService();
