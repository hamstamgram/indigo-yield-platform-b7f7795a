/**
 * Investor Balance Hooks
 * Abstracts balance checking operations from components
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QUERY_KEYS } from "@/constants/queryKeys";

/**
 * Hook to check an investor's current balance in a fund
 */
export function useInvestorBalance(investorId: string | undefined, fundId: string | undefined) {
  return useQuery<number | null, Error>({
    queryKey: investorId && fundId ? QUERY_KEYS.investorBalance(investorId, fundId) : ["investor-balance"],
    queryFn: async () => {
      if (!investorId || !fundId) return null;

      const { data, error } = await supabase
        .from("investor_positions")
        .select("current_value")
        .eq("investor_id", investorId)
        .eq("fund_id", fundId)
        .maybeSingle();

      if (error) throw error;
      return data?.current_value ?? 0;
    },
    enabled: !!investorId && !!fundId,
  });
}

/**
 * Hook to check if AUM exists for a fund on a specific date
 */
export function useAUMExists(fundId: string | undefined, txDate: string | undefined) {
  return useQuery<boolean | null, Error>({
    queryKey: fundId && txDate ? QUERY_KEYS.aumExists(fundId, txDate) : ["aum-exists"],
    queryFn: async () => {
      if (!fundId || !txDate) return null;

      const { data, error } = await supabase
        .from("fund_daily_aum")
        .select("id")
        .eq("fund_id", fundId)
        .eq("aum_date", txDate)
        .eq("purpose", "transaction")
        .maybeSingle();

      if (error) {
        console.error("Error checking AUM:", error);
        return null;
      }
      return !!data;
    },
    enabled: !!fundId && !!txDate,
  });
}
