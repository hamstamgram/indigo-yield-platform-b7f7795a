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
  type AdminInvestorPosition,
  type InvestorPositionsData,
} from "@/services";

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
    queryKey: QUERY_KEYS.adminInvestorOpsIndicators(investorId || ""),
    queryFn: () => investorDetailService.loadOpsIndicators(investorId!, ibParentId ?? null),
    enabled: !!investorId,
  });
}

/**
 * Hook to fetch investor positions with fund details
 */
export function useInvestorPositions(investorId: string | undefined) {
  return useQuery<InvestorPositionsData>({
    queryKey: QUERY_KEYS.adminInvestorPositions(investorId || ""),
    queryFn: () => investorDetailService.fetchInvestorPositions(investorId!),
    enabled: !!investorId,
  });
}

/**
 * Hook to fetch investor active positions (for delete confirmation)
 */
export function useInvestorActivePositions(investorId: string | undefined, enabled: boolean = false) {
  return useQuery<AdminInvestorPosition[]>({
    queryKey: QUERY_KEYS.adminInvestorActivePositions(investorId || ""),
    queryFn: () => investorDetailService.fetchActivePositions(investorId!),
    enabled: !!investorId && enabled,
  });
}

// Re-export types (use original name for local exports, aliased for clarity)
export type { InvestorDetailData, OpsIndicators, InvestorPositionsData };
export type { AdminInvestorPosition as InvestorPosition };
