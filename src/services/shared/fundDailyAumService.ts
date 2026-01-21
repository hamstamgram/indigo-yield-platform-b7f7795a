/**
 * Fund Daily AUM Service
 * Handles fund_daily_aum operations
 *
 * IMPORTANT: fund_daily_aum is a PROTECTED table.
 * All mutations MUST go through canonical RPCs:
 * - set_fund_daily_aum (for manual/baseline AUM setting)
 * - crystallize_yield_before_flow (for pre-transaction snapshots)
 * - ensure_preflow_aum (for automated pre-flow checks)
 *
 * Direct inserts/updates are BLOCKED by database triggers.
 */

import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc";

export interface FundDailyAumRecord {
  id?: string;
  fund_id: string;
  aum_date: string;
  total_aum: number;
  source?: string;
}

class FundDailyAumService {
  /**
   * Get AUM record for a fund on a specific date
   * @param fundId - Fund ID
   * @param date - Date in YYYY-MM-DD format
   * @param purpose - Optional purpose filter ('transaction' or 'reporting')
   */
  async getByFundAndDate(
    fundId: string,
    date: string,
    purpose?: "transaction" | "reporting"
  ): Promise<FundDailyAumRecord | null> {
    let query = supabase
      .from("fund_daily_aum")
      .select("*")
      .eq("fund_id", fundId)
      .eq("aum_date", date)
      .eq("is_voided", false);

    // Add purpose filter if specified (for fund_aum table compatibility)
    if (purpose) {
      query = query.eq("purpose", purpose);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    return data as FundDailyAumRecord | null;
  }

  /**
   * Create a new AUM record using canonical RPC
   */
  async createAumRecord(params: {
    fundId: string;
    date: string;
    totalAum: number;
    source?: string;
  }): Promise<void> {
    // Use canonical RPC - set_fund_daily_aum
    const result = await rpc.call("set_fund_daily_aum", {
      p_fund_id: params.fundId,
      p_aum_date: params.date,
      p_total_aum: params.totalAum,
    });

    if (result.error) {
      throw new Error(result.error.userMessage);
    }
  }

  /**
   * Create a baseline AUM record for opening a period using canonical RPC
   */
  async createBaselineAUM(params: {
    fundId: string;
    date: string;
    totalAum: number;
    purpose: "reporting" | "transaction";
    createdBy: string;
  }): Promise<void> {
    // Check if a record already exists for this date
    const { data: existing } = await supabase
      .from("fund_daily_aum")
      .select("id")
      .eq("fund_id", params.fundId)
      .eq("aum_date", params.date)
      .eq("is_voided", false)
      .maybeSingle();

    if (existing) {
      throw new Error(
        "An AUM record already exists for this date. Void it first or choose a different date."
      );
    }

    // Use canonical RPC - set_fund_daily_aum
    const result = await rpc.call("set_fund_daily_aum", {
      p_fund_id: params.fundId,
      p_aum_date: params.date,
      p_total_aum: params.totalAum,
    });

    if (result.error) {
      throw new Error(result.error.userMessage);
    }
  }

  /**
   * Upsert AUM record using canonical RPC (handles insert/update automatically)
   */
  async upsertAumRecord(params: {
    fundId: string;
    date: string;
    totalAum: number;
    source?: string;
  }): Promise<void> {
    // Use canonical RPC - set_fund_daily_aum handles upsert logic internally
    const result = await rpc.call("set_fund_daily_aum", {
      p_fund_id: params.fundId,
      p_aum_date: params.date,
      p_total_aum: params.totalAum,
    });

    if (result.error) {
      throw new Error(result.error.userMessage);
    }
  }
}

export const fundDailyAumService = new FundDailyAumService();
