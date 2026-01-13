/**
 * Hook for fetching Fund AUM Events
 * Provides audit trail of AUM checkpoints from fund_aum_events table
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FundAUMEvent {
  id: string;
  fund_id: string;
  event_date: string;
  event_ts: string;
  opening_aum: number;
  closing_aum: number;
  post_flow_aum: number | null;
  trigger_type: string;
  trigger_reference: string | null;
  purpose: string;
  is_voided: boolean;
  void_reason: string | null;
  voided_at: string | null;
  voided_by: string | null;
  created_at: string;
  created_by: string | null;
}

interface UseFundAUMEventsOptions {
  fundId: string | null;
  dateRange?: {
    from: string;
    to: string;
  };
  includeVoided?: boolean;
}

export function useFundAUMEvents({ fundId, dateRange, includeVoided = false }: UseFundAUMEventsOptions) {
  return useQuery({
    queryKey: ["fund-aum-events", fundId, dateRange, includeVoided],
    queryFn: async (): Promise<FundAUMEvent[]> => {
      if (!fundId) return [];

      let query = (supabase as any)
        .from("fund_aum_events")
        .select("*")
        .eq("fund_id", fundId)
        .order("event_ts", { ascending: false });

      if (!includeVoided) {
        query = query.eq("is_voided", false);
      }

      if (dateRange?.from) {
        query = query.gte("event_date", dateRange.from);
      }

      if (dateRange?.to) {
        query = query.lte("event_date", dateRange.to);
      }

      const { data, error } = await query.limit(100);

      if (error) {
        console.error("Error fetching fund AUM events:", error);
        throw error;
      }

      return (data || []) as FundAUMEvent[];
    },
    enabled: !!fundId,
  });
}

export default useFundAUMEvents;
