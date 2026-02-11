import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db/index";
import { logError } from "@/lib/logger";

export interface IBScheduleEntry {
  id: string;
  investor_id: string;
  fund_id: string | null;
  ib_percentage: number;
  effective_date: string;
  end_date?: string | null;
  fund?: { name: string } | null;
}

class IBScheduleService {
  async getIBScheduleWithFunds(investorId: string): Promise<IBScheduleEntry[]> {
    const { data, error } = await supabase
      .from("ib_commission_schedule")
      .select("*, fund:funds(name)")
      .eq("investor_id", investorId)
      .order("effective_date", { ascending: false });

    if (error) {
      logError("ibScheduleService.getIBScheduleWithFunds", error);
      return [];
    }
    return data || [];
  }

  async addIBEntry(params: {
    investorId: string;
    fundId: string | null;
    ibPercentage: number;
    effectiveDate: string;
    endDate?: string | null;
  }): Promise<void> {
    const result = await db.insert("ib_commission_schedule", {
      investor_id: params.investorId,
      fund_id: params.fundId,
      ib_percentage: params.ibPercentage,
      effective_date: params.effectiveDate,
      ...(params.endDate ? { end_date: params.endDate } : {}),
    });

    if (result.error) {
      throw new Error(result.error.userMessage);
    }
  }

  async deleteIBEntry(entryId: string): Promise<void> {
    const result = await db.delete("ib_commission_schedule", { column: "id", value: entryId });

    if (result.error) {
      throw new Error(result.error.userMessage);
    }
  }
}

export const ibScheduleService = new IBScheduleService();
