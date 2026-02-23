/**
 * Investor Balance Hooks
 * Abstracts balance checking operations from components
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { logError } from "@/lib/logger";

/**
 * Hook to check an investor's current balance in a fund
 */
export function useInvestorBalance(investorId: string | undefined, fundId: string | undefined) {
  return useQuery<number | null, Error>({
    queryKey:
      investorId && fundId ? QUERY_KEYS.investorBalance(investorId, fundId) : ["investor-balance"],
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
 * Hook to check if an investor has deposit transaction history in a fund
 */
export function useTransactionHistory(investorId: string | undefined, fundId: string | undefined) {
  return useQuery<boolean, Error>({
    queryKey:
      investorId && fundId ? ["transaction-history", investorId, fundId] : ["transaction-history"],
    queryFn: async () => {
      if (!investorId || !fundId) return false;

      const { count, error } = await supabase
        .from("transactions_v2")
        .select("id", { count: "exact", head: true })
        .eq("investor_id", investorId)
        .eq("fund_id", fundId)
        .eq("type", "DEPOSIT")
        .eq("is_voided", false);

      if (error) throw error;
      return (count ?? 0) > 0;
    },
    enabled: !!investorId && !!fundId,
  });
}

/**
 * Hook to check if AUM exists for a fund on a specific date (DEPRECATED)
 * AUM is purely transactional now. Always resolves true.
 */
export function useAUMExists(fundId: string | undefined, txDate: string | undefined) {
  return useQuery<boolean | null, Error>({
    queryKey: fundId && txDate ? QUERY_KEYS.aumExists(fundId, txDate) : ["aum-exists"],
    queryFn: async () => {
      if (!fundId || !txDate) return null;
      return true; // Bypass deprecated static table query
    },
    enabled: !!fundId && !!txDate,
  });
}
