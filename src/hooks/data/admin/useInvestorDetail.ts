/**
 * Investor Detail Hooks
 * React Query hooks for investor management page
 */

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  investorDetailService,
  type InvestorDetailData,
  type OpsIndicators,
} from "@/services/admin/investorDetailService";

/**
 * Hook to fetch investor detail
 */
export function useInvestorDetail(investorId: string | undefined) {
  return useQuery<InvestorDetailData | null>({
    queryKey: QUERY_KEYS.investorDetail(investorId || ""),
    queryFn: () => investorDetailService.fetchInvestorDetail(investorId!),
    enabled: !!investorId,
  });
}

/**
 * Hook to fetch investor ops indicators
 */
export function useInvestorOpsIndicators(
  investorId: string | undefined,
  ibParentId: string | null | undefined
) {
  return useQuery<OpsIndicators>({
    queryKey: ["admin", "investor", "opsIndicators", investorId],
    queryFn: () => investorDetailService.loadOpsIndicators(investorId!, ibParentId ?? null),
    enabled: !!investorId,
  });
}

// Re-export types
export type { InvestorDetailData, OpsIndicators };
