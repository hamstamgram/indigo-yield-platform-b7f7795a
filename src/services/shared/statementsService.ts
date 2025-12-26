/**
 * Statements Service
 * Handles statement generation, storage, and document creation
 */

import { supabase } from "@/integrations/supabase/client";

export interface StatementUpsertData {
  investor_id: string;
  period_year: number;
  period_month: number;
  asset_code: string;
  begin_balance: number;
  additions: number;
  redemptions: number;
  net_income: number;
  end_balance: number;
  storage_path?: string;
}

export interface CreateStatementDocumentParams {
  investorId: string;
  title: string;
  storagePath: string;
  periodStart: string;
  periodEnd: string;
  createdBy?: string;
}

class StatementsService {
  /**
   * Upsert a statement record
   */
  async upsertStatement(data: StatementUpsertData): Promise<void> {
    const { error } = await supabase.from("statements").upsert({
      investor_id: data.investor_id,
      period_year: data.period_year,
      period_month: data.period_month,
      asset_code: data.asset_code as any,
      begin_balance: data.begin_balance,
      additions: data.additions,
      redemptions: data.redemptions,
      net_income: data.net_income,
      end_balance: data.end_balance,
      storage_path: data.storage_path || null,
    } as any);

    if (error) throw error;
  }

  /**
   * Upload statement PDF to storage
   */
  async uploadStatementPDF(
    investorId: string,
    blob: Blob,
    filename: string
  ): Promise<string> {
    const filePath = `${investorId}/${filename}`;
    
    const { data, error } = await supabase.storage
      .from("statements")
      .upload(filePath, blob, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (error) throw error;
    return data?.path || filePath;
  }

  /**
   * Create a document record for a statement
   */
  async createStatementDocument(params: CreateStatementDocumentParams): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from("documents")
      .insert({
        user_id: params.investorId,
        type: "statement" as any,
        title: params.title,
        storage_path: params.storagePath,
        period_start: params.periodStart,
        period_end: params.periodEnd,
        created_by: params.createdBy || user?.id,
      })
      .select("id")
      .single();

    if (error) throw error;
    return data.id;
  }

  /**
   * Get statements for a specific month
   */
  async getStatementsByMonth(yearMonth: string): Promise<any[]> {
    const [year, month] = yearMonth.split("-").map(Number);
    
    const { data, error } = await supabase
      .from("statements")
      .select("*, profile:profiles!statements_investor_id_fkey(first_name, last_name, email)")
      .eq("period_year", year)
      .eq("period_month", month)
      .order("created_at", { ascending: false });

    if (error) throw error;
    
    return (data || []).map((stmt) => {
      const profile = stmt.profile as any;
      return {
        ...stmt,
        investor_name: profile 
          ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email 
          : "Unknown",
        period: `${year}-${String(month).padStart(2, "0")}`,
        status: stmt.storage_path ? "published" : "draft",
      };
    });
  }
}

export const statementsService = new StatementsService();
