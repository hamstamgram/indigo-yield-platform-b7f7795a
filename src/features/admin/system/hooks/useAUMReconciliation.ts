/**
 * AUM Reconciliation Hook
 * React Query hook for checking AUM discrepancies
 */

import { useQuery } from "@tanstack/react-query";
import {
  checkAUMReconciliation,
  AUMReconciliationResult,
} from "@/services/admin/aumReconciliationService";
import { QUERY_KEYS } from "@/constants/queryKeys";

/**
 * Hook to check AUM reconciliation for a fund as of a specific date
 */
export function useAUMReconciliation(
  fundId: string | null,
  tolerancePct?: number,
  asOfDate: string = new Date().toISOString().split("T")[0]
) {
  return useQuery({
    queryKey: QUERY_KEYS.aumReconciliation(fundId || undefined, tolerancePct, asOfDate),
    queryFn: () => checkAUMReconciliation(fundId!, tolerancePct, asOfDate),
    enabled: !!fundId,
    staleTime: 60 * 1000, // 60 seconds
  });
}

export type { AUMReconciliationResult };
