/**
 * Pending Transaction Details Hook
 * React Query hook for fetching pending transaction details
 */

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { depositService, withdrawalService } from "@/services/investor";

export interface PendingTransactionDetail {
  id: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  status: string;
  amount: number;
  asset: string;
  created_at?: string;
  transaction_hash?: string;
  rejection_reason?: string;
  [key: string]: unknown;
}

/**
 * Hook to fetch pending transaction details by type and ID
 */
export function usePendingTransactionDetails(type?: string, id?: string) {
  return useQuery<PendingTransactionDetail>({
    queryKey: QUERY_KEYS.pendingTransactionDetails(type || "", id || ""),
    queryFn: async () => {
      if (!id || !type) throw new Error("Missing parameters");

      if (type === "deposit") {
        const deposit = await depositService.getDepositById(id);
        return {
          ...deposit,
          asset: deposit.asset_symbol,
          type: "DEPOSIT" as const,
        };
      } else if (type === "withdrawal") {
        const withdrawal = await withdrawalService.getWithdrawalById(id);
        if (!withdrawal) throw new Error("Withdrawal not found");
        return {
          ...withdrawal,
          asset: withdrawal.asset || "Unknown",
          amount: withdrawal.requested_amount,
          type: "WITHDRAWAL" as const,
        };
      }
      throw new Error("Invalid transaction type");
    },
    enabled: !!id && !!type,
  });
}
