/**
 * Admin Investor Withdrawals Hook
 * React Query hook for fetching withdrawals for a specific investor
 */

import { useQuery } from "@tanstack/react-query";
import { withdrawalService } from "@/services/investor";
import type { Withdrawal, WithdrawalFullStatus } from "@/types/domains";

export function useAdminInvestorWithdrawals(
  investorId: string,
  statusFilter?: WithdrawalFullStatus | "all"
) {
  return useQuery({
    queryKey: ["admin", "investorWithdrawals", investorId, statusFilter],
    queryFn: async (): Promise<Withdrawal[]> => {
      const result = await withdrawalService.getWithdrawals({
        status: statusFilter === "all" ? undefined : statusFilter,
      });
      // Filter to this investor
      return result.data.filter((w) => w.investor_id === investorId);
    },
    enabled: !!investorId,
    staleTime: 30_000,
  });
}
