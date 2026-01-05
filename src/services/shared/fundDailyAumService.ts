/**
 * Fund Daily AUM Service
 * Handles fund_daily_aum operations
 */

import { supabase } from "@/integrations/supabase/client";

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
   */
  async getByFundAndDate(fundId: string, date: string): Promise<FundDailyAumRecord | null> {
    const { data, error } = await supabase
      .from("fund_daily_aum")
      .select("*")
      .eq("fund_id", fundId)
      .eq("aum_date", date)
      .eq("is_voided", false)
      .maybeSingle();

    if (error) throw error;
    return data as FundDailyAumRecord | null;
  }

  /**
   * Create a new AUM record
   */
  async createAumRecord(params: {
    fundId: string;
    date: string;
    totalAum: number;
    source?: string;
  }): Promise<void> {
    const { error } = await supabase.from("fund_daily_aum").insert({
      fund_id: params.fundId,
      aum_date: params.date,
      total_aum: params.totalAum,
      source: params.source || "manual",
    });

    if (error) throw error;
  }

  /**
   * Upsert AUM record (check-then-insert/update pattern for partial index compatibility)
   */
  async upsertAumRecord(params: {
    fundId: string;
    date: string;
    totalAum: number;
    source?: string;
  }): Promise<void> {
    // Check for existing active record (partial index workaround)
    const { data: existing } = await supabase
      .from("fund_daily_aum")
      .select("id")
      .eq("fund_id", params.fundId)
      .eq("aum_date", params.date)
      .eq("is_voided", false)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("fund_daily_aum")
        .update({
          total_aum: params.totalAum,
          source: params.source || "manual",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("fund_daily_aum")
        .insert({
          fund_id: params.fundId,
          aum_date: params.date,
          total_aum: params.totalAum,
          source: params.source || "manual",
        });

      if (error) throw error;
    }
  }
}

export const fundDailyAumService = new FundDailyAumService();
