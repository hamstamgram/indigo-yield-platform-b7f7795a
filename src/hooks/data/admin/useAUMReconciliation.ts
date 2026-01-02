/**
 * AUM Reconciliation Hook
 * React Query hook for checking AUM discrepancies
 */

import { useQuery } from "@tanstack/react-query";
import { checkAUMReconciliation, AUMReconciliationResult } from "@/services/admin/aumReconciliationService";

/**
 * Hook to check AUM reconciliation for a fund
 */
export function useAUMReconciliation(
  fundId: string | null,
  tolerancePct?: number
) {
  return useQuery({
    queryKey: ["aumReconciliation", fundId, tolerancePct],
    queryFn: () => checkAUMReconciliation(fundId!, tolerancePct),
    enabled: !!fundId,
    staleTime: 30000, // 30 seconds
  });
}

export type { AUMReconciliationResult };
