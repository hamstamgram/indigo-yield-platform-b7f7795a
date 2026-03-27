import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";
import { parseFinancial } from "@/utils/financial";

/**
 * Result of the available balance calculation
 */
export interface AvailableBalanceResult {
  /** Current position value from investor_positions */
  positionValue: number;
  /** Sum of pending/approved/processing withdrawal amounts */
  pendingWithdrawals: number;
  /** Available balance = positionValue - pendingWithdrawals */
  availableBalance: number;
}

/**
 * Hook to calculate the true available balance for withdrawals.
 * This accounts for pending/approved/processing withdrawal requests
 * to prevent over-withdrawal (withdrawal lock-in security fix).
 *
 * @param investorId - The investor's UUID
 * @param fundId - The fund's UUID
 * @returns Query result with available balance breakdown
 */
export function useAvailableBalance(investorId: string | null, fundId: string | null) {
  return useQuery<AvailableBalanceResult | null>({
    queryKey: QUERY_KEYS.availableBalance(investorId, fundId),
    queryFn: async () => {
      if (!investorId || !fundId) return null;

      // Get current position value
      const { data: position, error: positionError } = await supabase
        .from("investor_positions")
        .select("current_value")
        .eq("investor_id", investorId)
        .eq("fund_id", fundId)
        .maybeSingle();

      if (positionError) {
        logError("useAvailableBalance.positionFetch", positionError, { investorId, fundId });
        throw positionError;
      }

      // Get sum of pending/approved/processing withdrawals
      const { data: pendingWithdrawals, error: withdrawalError } = await supabase
        .from("withdrawal_requests")
        .select("requested_amount")
        .eq("investor_id", investorId)
        .eq("fund_id", fundId)
        .in("status", ["pending", "approved", "processing"]);

      if (withdrawalError) {
        logError("useAvailableBalance.withdrawalsFetch", withdrawalError, { investorId, fundId });
        throw withdrawalError;
      }

      const positionValue = parseFinancial(position?.current_value).toNumber();
      const totalPending = (pendingWithdrawals || []).reduce(
        (sum, w) => sum + parseFinancial(w.requested_amount).toNumber(),
        0
      );

      return {
        positionValue,
        pendingWithdrawals: totalPending,
        availableBalance: Math.max(0, positionValue - totalPending),
      };
    },
    enabled: !!investorId && !!fundId,
    staleTime: 10 * 1000, // 10 seconds - critical for withdrawal lock-in
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}
