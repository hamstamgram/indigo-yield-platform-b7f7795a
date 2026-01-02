/**
 * Investor Yield Hooks
 * React Query hooks for investor-facing yield data (visible events only)
 */

import { useQuery } from "@tanstack/react-query";
import {
  getInvestorVisibleYield,
  getInvestorYieldSummaryByFund,
  getInvestorCumulativeYield,
  InvestorYieldEvent,
  InvestorYieldSummary,
} from "@/services/investor/investorYieldService";
import { QUERY_KEYS } from "@/constants/queryKeys";

/**
 * Hook to get investor's visible yield events
 */
export function useInvestorYieldEvents(
  investorId: string | null,
  year?: number,
  month?: number,
  fundId?: string,
  limit?: number
) {
  return useQuery({
    queryKey: QUERY_KEYS.investorYieldEventsInvestor(investorId || undefined, year, month, fundId, limit),
    queryFn: () => getInvestorVisibleYield(investorId!, { year, month, fundId, limit }),
    enabled: !!investorId,
  });
}

/**
 * Hook to get investor's yield summary by fund
 */
export function useInvestorYieldSummaryByFund(
  investorId: string | null,
  year?: number,
  month?: number
) {
  return useQuery({
    queryKey: QUERY_KEYS.investorYieldSummary(investorId || undefined, year, month),
    queryFn: () => getInvestorYieldSummaryByFund(investorId!, year, month),
    enabled: !!investorId,
  });
}

/**
 * Hook to get investor's cumulative yield totals
 */
export function useInvestorCumulativeYield(investorId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.investorCumulativeYield(investorId || undefined),
    queryFn: () => getInvestorCumulativeYield(investorId!),
    enabled: !!investorId,
  });
}

export type { InvestorYieldEvent, InvestorYieldSummary };
