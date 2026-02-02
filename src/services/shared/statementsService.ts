/**
 * Statements Service
 * Handles statement generation, storage, and document creation
 */

import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db/index";
import type { ProfileRelation } from "@/types/domains/relations";

import type { Database } from "@/integrations/supabase/types";

type AssetCode = Database["public"]["Enums"]["asset_code"];
type DocumentType = Database["public"]["Enums"]["document_type"];

export interface StatementUpsertData {
  investor_id: string;
  period_year: number;
  period_month: number;
  asset_code: AssetCode;
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
    const { error } = await db.upsert("statements", {
      investor_id: data.investor_id,
      period_year: data.period_year,
      period_month: data.period_month,
      asset_code: data.asset_code,
      begin_balance: data.begin_balance,
      additions: data.additions,
      redemptions: data.redemptions,
      net_income: data.net_income,
      end_balance: data.end_balance,
      storage_path: data.storage_path || null,
    });

    if (error) throw new Error(error.userMessage || error.message);
  }

  /**
   * Upload statement PDF to storage
   * Accepts either (storagePath, blob) or (investorId, blob, filename)
   */
  async uploadStatementPDF(
    storagePathOrInvestorId: string,
    blob: Blob,
    filename?: string
  ): Promise<string> {
    // If filename is provided, construct path from investorId + filename
    const filePath = filename ? `${storagePathOrInvestorId}/${filename}` : storagePathOrInvestorId;

    const { data, error } = await supabase.storage.from("statements").upload(filePath, blob, {
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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("documents")
      .insert({
        user_id: params.investorId,
        type: "statement" as DocumentType,
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
      .select("*, profile:profiles!fk_statements_investor_profile(first_name, last_name, email)")
      .eq("period_year", year)
      .eq("period_month", month)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((stmt) => {
      const profile = (stmt as { profile?: unknown }).profile as ProfileRelation | undefined;
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

  /**
   * Get statement period by year and month
   */
  async getStatementPeriod(
    year: number,
    month: number
  ): Promise<{
    id: string;
    period_start_date: string;
    period_end_date: string;
  } | null> {
    // statement_periods has columns: year, month, period_end_date
    const { data, error } = await supabase
      .from("statement_periods")
      .select("id, year, month, period_end_date")
      .eq("year", year)
      .eq("month", month)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    // Compute period_start_date from year/month
    const periodStart = `${year}-${String(month).padStart(2, "0")}-01`;

    return {
      id: data.id,
      period_start_date: periodStart,
      period_end_date: data.period_end_date,
    };
  }
}

export const statementsService = new StatementsService();
