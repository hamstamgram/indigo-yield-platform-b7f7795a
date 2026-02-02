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
 * Hook to check AUM reconciliation for a fund
 */
export function useAUMReconciliation(fundId: string | null, tolerancePct?: number) {
  return useQuery({
    queryKey: QUERY_KEYS.aumReconciliation(fundId || undefined, tolerancePct),
    queryFn: () => checkAUMReconciliation(fundId!, tolerancePct),
    enabled: !!fundId,
    staleTime: 60 * 1000, // 60 seconds
  });
}

export type { AUMReconciliationResult };
