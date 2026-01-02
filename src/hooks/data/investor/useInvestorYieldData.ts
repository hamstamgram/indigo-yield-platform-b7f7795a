/**
 * Investor Yield Data Hooks
 * React Query hooks for investor positions, performance, and fees
 */

import { useQuery } from "@tanstack/react-query";
import {
  getStatementPeriodId,
  getInvestorPositionsWithFunds,
  getInvestorPerformanceForPeriod,
  getInvestorFeeSchedule,
} from "@/services/admin/yieldDistributionService";
import { QUERY_KEYS } from "@/constants/queryKeys";

/**
 * Hook to get statement period ID for a date
 */
export function useStatementPeriodId(date: Date | null) {
  const year = date?.getFullYear() ?? 0;
  const month = date ? date.getMonth() + 1 : 0;

  return useQuery({
    queryKey: QUERY_KEYS.statementPeriodId(year, month),
    queryFn: () => getStatementPeriodId(year, month),
    enabled: !!date,
  });
}

/**
 * Hook to get investor positions with fund details
 */
export function useInvestorPositionsWithFunds(investorId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.investorPositionsWithFunds(investorId),
    queryFn: () => getInvestorPositionsWithFunds(investorId),
    enabled: !!investorId,
  });
}

/**
 * Hook to get investor performance for a period
 */
export function useInvestorPerformanceForPeriod(investorId: string, periodId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.investorPerformanceForPeriod(investorId, periodId || undefined),
    queryFn: () => getInvestorPerformanceForPeriod(investorId, periodId!),
    enabled: !!investorId && !!periodId,
  });
}

/**
 * Hook to get investor fee schedule
 */
export function useInvestorFeeScheduleData(investorId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.investorFeeSchedule(investorId),
    queryFn: () => getInvestorFeeSchedule(investorId),
    enabled: !!investorId,
  });
}
