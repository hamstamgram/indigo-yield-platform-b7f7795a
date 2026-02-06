/**
 * Investor Detail Hooks
 * Hooks for fetching investor detail, ops indicators, and positions.
 */

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  investorDetailService,
  type InvestorDetailData,
  type OpsIndicators,
  type AdminInvestorPosition,
  type InvestorPositionsData,
} from "@/services/admin";

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
 * Hook to fetch investor positions with fund details and totals
 * NOTE: For admin context only. For investor portal, use useInvestorPositions from @/hooks/data/investor
 */
export function useAdminInvestorPositions(investorId: string | undefined) {
  return useQuery<InvestorPositionsData>({
    queryKey: QUERY_KEYS.adminInvestorPositions(investorId || ""),
    queryFn: () => investorDetailService.fetchInvestorPositionsWithTotals(investorId!),
    enabled: !!investorId,
  });
}

/** @deprecated Use useAdminInvestorPositions instead */
export const useInvestorPositions = useAdminInvestorPositions;

/**
 * Hook to fetch investor active positions (for delete confirmation)
 */
export function useInvestorActivePositions(
  investorId: string | undefined,
  enabled: boolean = false
) {
  return useQuery<AdminInvestorPosition[]>({
    queryKey: QUERY_KEYS.adminInvestorActivePositions(investorId || ""),
    queryFn: () => investorDetailService.fetchActivePositions(investorId!),
    enabled: !!investorId && enabled,
  });
}
