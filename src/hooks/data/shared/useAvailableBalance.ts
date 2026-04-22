import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc";
import { logError } from "@/lib/logger";
import { parseFinancial } from "@/utils/financial";
import Decimal from "decimal.js";

/**
 * Result of the available balance calculation.
 *
 * All fields are strings to preserve full NUMERIC(28,10) precision.
 * Consumers MUST use parseFinancial() / Decimal.js for arithmetic and
 * comparisons — never Number()/parseFloat().
 */
export interface AvailableBalanceResult {
  /** Authoritative ledger balance (sum of non-voided transactions). */
  positionValue: string;
  /** Sum of pending/approved/processing withdrawal amounts. */
  pendingWithdrawals: string;
  /** Available balance = max(0, positionValue - pendingWithdrawals). */
  availableBalance: string;
}

/**
 * Hook to calculate the true available balance for withdrawals.
 *
 * Reads the authoritative balance from the transaction ledger (via
 * get_investor_ledger_balance) rather than investor_positions.current_value,
 * which is a derived/cached column that can drift. This keeps the Full
 * Withdrawal auto-fill aligned with the UI "Maximum withdrawal" value
 * computed in fetchPositionsForWithdrawal.
 *
 * @param investorId - The investor's UUID
 * @param fundId - The fund's UUID
 */
export function useAvailableBalance(investorId: string | null, fundId: string | null) {
  return useQuery<AvailableBalanceResult | null>({
    queryKey: QUERY_KEYS.availableBalance(investorId, fundId),
    queryFn: async () => {
      if (!investorId || !fundId) return null;

      // Authoritative position value from the transaction ledger.
      const { data: ledgerBalance, error: ledgerError } = await rpc.call(
        "get_investor_ledger_balance",
        { p_investor_id: investorId, p_fund_id: fundId }
      );

      if (ledgerError) {
        logError("useAvailableBalance.ledgerFetch", ledgerError, { investorId, fundId });
        throw new Error(ledgerError.message || "Failed to fetch ledger balance");
      }

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

      const positionValue = parseFinancial(ledgerBalance ?? 0);
      const totalPending = (pendingWithdrawals || []).reduce(
        (sum, w) => sum.plus(parseFinancial(w.requested_amount)),
        new Decimal(0)
      );
      const available = Decimal.max(0, positionValue.minus(totalPending));

      return {
        positionValue: positionValue.toString(),
        pendingWithdrawals: totalPending.toString(),
        availableBalance: available.toString(),
      };
    },
    enabled: !!investorId && !!fundId,
    staleTime: 10 * 1000, // 10 seconds - critical for withdrawal lock-in
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}
