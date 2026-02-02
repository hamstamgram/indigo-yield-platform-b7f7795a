/**
 * Investor Yield Events Hooks
 * React Query hooks for investor-facing yield data
 */

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  getInvestorVisibleYield,
  getInvestorYieldSummaryByFund,
  getInvestorCumulativeYield,
} from "@/services/investor/investorYieldService";

/**
 * Hook to get visible yield events for an investor
 */
export function useInvestorYieldEvents(
  investorId: string,
  options?: {
    year?: number;
    month?: number;
    fundId?: string;
    limit?: number;
  }
) {
  return useQuery({
    queryKey: QUERY_KEYS.investorYieldEventsInvestor(
      investorId,
      options?.year,
      options?.month,
      options?.fundId,
      options?.limit
    ),
    queryFn: () => getInvestorVisibleYield(investorId, options),
    enabled: !!investorId,
  });
}

/**
 * Hook to get yield summary by fund for an investor
 */
export function useInvestorYieldSummary(investorId: string, year?: number, month?: number) {
  return useQuery({
    queryKey: QUERY_KEYS.investorYieldSummary(investorId, year, month),
    queryFn: () => getInvestorYieldSummaryByFund(investorId, year, month),
    enabled: !!investorId,
  });
}

/**
 * Hook to get cumulative yield for an investor
 */
export function useInvestorCumulativeYield(investorId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.investorCumulativeYield(investorId),
    queryFn: () => getInvestorCumulativeYield(investorId),
    enabled: !!investorId,
  });
}
