/**
 * Investment Service
 * Maps Investment operations to transactions_v2 table (no investments table exists)
 */
import { supabase } from "@/integrations/supabase/client";
import type { Investment, InvestmentFormData, InvestmentFilters } from "@/types/investment";

// Map tx_type to TransactionType
const mapTxTypeToTransactionType = (
  txType: string
): Investment["transaction_type"] => {
  switch (txType) {
    case "DEPOSIT":
      return "initial";
    case "WITHDRAWAL":
      return "redemption";
    default:
      return "additional";
  }
};

// Map our Investment status - transactions_v2 uses approved_at to indicate approval
const getStatusFromTransaction = (
  approvedAt: string | null,
  approvedBy: string | null
): Investment["status"] => {
  if (approvedAt && approvedBy) return "active";
  return "pending";
};

class InvestmentService {
  async getInvestments(filters?: InvestmentFilters): Promise<Investment[]> {
    let query = supabase
      .from("transactions_v2")
      .select(
        `
        *,
        investor:investor_id(id, name, email),
        fund:fund_id(id, name, code)
      `
      )
      .in("type", ["DEPOSIT", "WITHDRAWAL"])
      .order("created_at", { ascending: false });

    if (filters?.fund_id) {
      query = query.eq("fund_id", filters.fund_id);
    }

    if (filters?.investor_id) {
      query = query.eq("investor_id", filters.investor_id);
    }

    if (filters?.date_from) {
      query = query.gte("tx_date", filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte("tx_date", filters.date_to);
    }

    // Status filter - map to approved_at presence
    if (filters?.status) {
      if (filters.status === "active") {
        query = query.not("approved_at", "is", null);
      } else if (filters.status === "pending") {
        query = query.is("approved_at", null);
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((tx: any) => ({
      id: tx.id,
      investor_id: tx.investor_id,
      fund_id: tx.fund_id,
      investment_date: tx.tx_date,
      amount: tx.amount,
      shares: 0, // Not tracked in transactions_v2
      status: getStatusFromTransaction(tx.approved_at, tx.approved_by),
      transaction_type: mapTxTypeToTransactionType(tx.type),
      reference_number: tx.reference_id ?? undefined,
      notes: tx.notes ?? undefined,
      created_by: tx.created_by ?? undefined,
      created_at: tx.created_at || new Date().toISOString(),
      updated_at: tx.created_at || new Date().toISOString(),
      processed_by: tx.approved_by ?? undefined,
      processed_at: tx.approved_at ?? undefined,
      investor_name: tx.investor?.name,
      investor_email: tx.investor?.email,
      fund_name: tx.fund?.name,
      fund_code: tx.fund?.code,
    }));
  }

  async getInvestmentById(id: string): Promise<Investment> {
    const { data, error } = await supabase
      .from("transactions_v2")
      .select(
        `
        *,
        investor:investor_id(id, name, email),
        fund:fund_id(id, name, code)
      `
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) throw new Error("Investment not found");

    return {
      id: data.id,
      investor_id: data.investor_id,
      fund_id: data.fund_id,
      investment_date: data.tx_date,
      amount: data.amount,
      shares: 0,
      status: getStatusFromTransaction(data.approved_at, data.approved_by),
      transaction_type: mapTxTypeToTransactionType(data.type),
      reference_number: data.reference_id ?? undefined,
      notes: data.notes ?? undefined,
      created_by: data.created_by ?? undefined,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.created_at || new Date().toISOString(),
      processed_by: data.approved_by ?? undefined,
      processed_at: data.approved_at ?? undefined,
      investor_name: data.investor?.name,
      investor_email: data.investor?.email,
      fund_name: data.fund?.name,
      fund_code: data.fund?.code,
    };
  }

  async createInvestment(formData: InvestmentFormData): Promise<Investment> {
    const txType =
      formData.transaction_type === "redemption" ? "WITHDRAWAL" : "DEPOSIT";

    const { data, error } = await supabase
      .from("transactions_v2")
      .insert({
        investor_id: formData.investor_id,
        fund_id: formData.fund_id,
        tx_date: formData.investment_date,
        value_date: formData.investment_date,
        amount: formData.amount,
        type: txType,
        asset: "USD", // Default asset
        reference_id: formData.reference_number,
        notes: formData.notes,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      investor_id: data.investor_id,
      fund_id: data.fund_id,
      investment_date: data.tx_date,
      amount: data.amount,
      shares: 0,
      status: "pending",
      transaction_type: formData.transaction_type,
      reference_number: data.reference_id ?? undefined,
      notes: data.notes ?? undefined,
      created_by: data.created_by ?? undefined,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.created_at || new Date().toISOString(),
    };
  }

  async approveInvestment(id: string, _shares: number): Promise<Investment> {
    const user = await supabase.auth.getUser();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("transactions_v2")
      .update({
        approved_at: now,
        approved_by: user.data.user?.id,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      investor_id: data.investor_id,
      fund_id: data.fund_id,
      investment_date: data.tx_date,
      amount: data.amount,
      shares: 0,
      status: "active",
      transaction_type: mapTxTypeToTransactionType(data.type),
      reference_number: data.reference_id ?? undefined,
      notes: data.notes ?? undefined,
      created_by: data.created_by ?? undefined,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: now,
      processed_by: data.approved_by ?? undefined,
      processed_at: data.approved_at ?? undefined,
    };
  }

  async rejectInvestment(id: string, reason: string): Promise<Investment> {
    // Mark as rejected by setting notes and clearing approval
    const { data, error } = await supabase
      .from("transactions_v2")
      .update({
        notes: `REJECTED: ${reason}`,
        approved_at: null,
        approved_by: null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      investor_id: data.investor_id,
      fund_id: data.fund_id,
      investment_date: data.tx_date,
      amount: data.amount,
      shares: 0,
      status: "rejected",
      transaction_type: mapTxTypeToTransactionType(data.type),
      reference_number: data.reference_id ?? undefined,
      notes: data.notes ?? undefined,
      created_by: data.created_by ?? undefined,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  async cancelInvestment(id: string): Promise<Investment> {
    // Mark as cancelled by updating notes
    const { data, error } = await supabase
      .from("transactions_v2")
      .update({
        notes: "CANCELLED",
        approved_at: null,
        approved_by: null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      investor_id: data.investor_id,
      fund_id: data.fund_id,
      investment_date: data.tx_date,
      amount: data.amount,
      shares: 0,
      status: "cancelled",
      transaction_type: mapTxTypeToTransactionType(data.type),
      reference_number: data.reference_id ?? undefined,
      notes: data.notes ?? undefined,
      created_by: data.created_by ?? undefined,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  async updateInvestment(
    id: string,
    updates: Partial<InvestmentFormData>
  ): Promise<Investment> {
    const dbUpdates: any = {};
    if (updates.investment_date) dbUpdates.tx_date = updates.investment_date;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.reference_number !== undefined)
      dbUpdates.reference_id = updates.reference_number;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    const { data, error } = await supabase
      .from("transactions_v2")
      .update(dbUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      investor_id: data.investor_id,
      fund_id: data.fund_id,
      investment_date: data.tx_date,
      amount: data.amount,
      shares: 0,
      status: getStatusFromTransaction(data.approved_at, data.approved_by),
      transaction_type: mapTxTypeToTransactionType(data.type),
      reference_number: data.reference_id ?? undefined,
      notes: data.notes ?? undefined,
      created_by: data.created_by ?? undefined,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  async getInvestmentSummary() {
    // investment_summary view doesn't exist - calculate from transactions_v2
    console.warn(
      "getInvestmentSummary: investment_summary view not available"
    );
    const { data, error } = await supabase
      .from("transactions_v2")
      .select("investor_id, amount, type")
      .in("type", ["DEPOSIT", "WITHDRAWAL"]);

    if (error) throw error;

    // Group by investor and calculate totals
    const summaryMap = new Map<
      string,
      { investor_id: string; total_invested: number }
    >();
    for (const tx of data || []) {
      const existing = summaryMap.get(tx.investor_id) || {
        investor_id: tx.investor_id,
        total_invested: 0,
      };
      if (tx.type === "DEPOSIT") {
        existing.total_invested += tx.amount;
      } else {
        existing.total_invested -= tx.amount;
      }
      summaryMap.set(tx.investor_id, existing);
    }

    return Array.from(summaryMap.values()).sort(
      (a, b) => b.total_invested - a.total_invested
    );
  }
}

export const investmentService = new InvestmentService();
