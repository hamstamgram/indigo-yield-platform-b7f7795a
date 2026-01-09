/**
 * Locked Periods Hook
 * Fetches locked fund period snapshots for admin management
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QUERY_KEYS } from "@/constants/queryKeys";

export interface LockedPeriod {
  id: string;
  fund_id: string;
  fund_name: string;
  fund_asset: string;
  period_id: string;
  period_name: string;
  period_end_date: string;
  snapshot_date: string;
  total_aum: number;
  investor_count: number;
  locked_at: string;
  locked_by: string | null;
}

export function useLockedPeriods(fundId?: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.yieldRecords, "locked-periods", fundId],
    queryFn: async (): Promise<LockedPeriod[]> => {
      let query = supabase
        .from("fund_period_snapshot")
        .select(`
          id,
          fund_id,
          period_id,
          snapshot_date,
          total_aum,
          investor_count,
          locked_at,
          locked_by,
          funds!inner (name, asset),
          statement_periods!inner (period_name, period_end_date)
        `)
        .eq("is_locked", true)
        .order("snapshot_date", { ascending: false });

      if (fundId && fundId !== "all") {
        query = query.eq("fund_id", fundId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching locked periods:", error);
        throw error;
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        fund_id: row.fund_id,
        fund_name: row.funds.name,
        fund_asset: row.funds.asset,
        period_id: row.period_id,
        period_name: row.statement_periods.period_name,
        period_end_date: row.statement_periods.period_end_date,
        snapshot_date: row.snapshot_date,
        total_aum: row.total_aum,
        investor_count: row.investor_count,
        locked_at: row.locked_at,
        locked_by: row.locked_by,
      }));
    },
  });
}
