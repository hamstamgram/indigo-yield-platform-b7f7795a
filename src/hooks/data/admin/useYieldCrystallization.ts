/**
 * Yield Crystallization Hooks
 * React Query hooks for admin yield crystallization operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  crystallizeYieldBeforeFlow,
  finalizeMonthYield,
  getYieldEventsForFund,
  getYieldEventsForInvestor,
  getFundYieldSnapshots,
  getPendingYieldEventsCount,
  getAggregatedYieldForPeriod,
} from "@/services/admin/yieldCrystallizationService";
import { useAuth } from "@/lib/auth/context";
import { toast } from "sonner";
import { QUERY_KEYS, YIELD_RELATED_KEYS } from "@/constants/queryKeys";

/**
 * Hook to get yield events for a fund
 */
export function useFundYieldEvents(
  fundId: string | null,
  options?: {
    startDate?: Date;
    endDate?: Date;
    visibilityScope?: "all" | "admin_only" | "investor_visible";
  }
) {
  return useQuery({
    queryKey: QUERY_KEYS.fundYieldEvents(fundId!, options),
    queryFn: () => getYieldEventsForFund(fundId!, options),
    enabled: !!fundId,
  });
}

/**
 * Hook to get yield events for an investor (admin view)
 */
export function useInvestorYieldEventsAdmin(
  investorId: string | null,
  options?: {
    fundId?: string;
    startDate?: Date;
    endDate?: Date;
    visibilityScope?: "all" | "admin_only" | "investor_visible";
  }
) {
  return useQuery({
    queryKey: QUERY_KEYS.investorYieldEventsAdmin(investorId!, options),
    queryFn: () => getYieldEventsForInvestor(investorId!, options),
    enabled: !!investorId,
  });
}

/**
 * Hook to get fund yield snapshots
 */
export function useFundYieldSnapshots(fundId: string | null, limit = 30) {
  return useQuery({
    queryKey: QUERY_KEYS.fundYieldSnapshots(fundId!, limit),
    queryFn: () => getFundYieldSnapshots(fundId!, limit),
    enabled: !!fundId,
  });
}

/**
 * Hook to get pending yield events count
 */
export function usePendingYieldEvents(
  fundId: string | null,
  year: number,
  month: number
) {
  return useQuery({
    queryKey: QUERY_KEYS.pendingYieldEvents(fundId!, year, month),
    queryFn: () => getPendingYieldEventsCount(fundId!, year, month),
    enabled: !!fundId && !!year && !!month,
  });
}

/**
 * Hook to get aggregated yield for a period
 */
export function useAggregatedYield(
  fundId: string | null,
  periodStart: Date | null,
  periodEnd: Date | null,
  visibilityFilter?: "all" | "admin_only" | "investor_visible"
) {
  return useQuery({
    queryKey: QUERY_KEYS.aggregatedYield(fundId!, periodStart?.toISOString(), periodEnd?.toISOString(), visibilityFilter),
    queryFn: () => getAggregatedYieldForPeriod(fundId!, periodStart!, periodEnd!, visibilityFilter),
    enabled: !!fundId && !!periodStart && !!periodEnd,
  });
}

/**
 * Hook to manually crystallize yield
 */
export function useCrystallizeYield() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      fundId,
      triggerType,
      eventTs,
      closingAum,
      triggerReference,
    }: {
      fundId: string;
      triggerType: "deposit" | "withdrawal" | "month_end" | "manual";
      eventTs: Date;
      closingAum: string;
      triggerReference?: string;
    }) => {
      return crystallizeYieldBeforeFlow(
        fundId,
        triggerType,
        eventTs,
        closingAum,
        triggerReference,
        user?.id
      );
    },
    onSuccess: (result) => {
      const grossYield = result.gross_yield ?? "0";
      const txCount = result.yield_tx_count ?? 0;
      if (txCount === 0) {
        toast.info(`No yield to crystallize (gross_yield=${grossYield})`);
      } else {
        toast.success(`Yield crystallized (${txCount} YIELD transactions)`);
      }
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fundYieldEvents() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fundYieldSnapshots() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorYieldEventsAdmin() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pendingYieldEvents() });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to crystallize yield");
    },
  });
}

/**
 * Hook to finalize month yield (make visible to investors)
 */
export function useFinalizeMonthYield() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      fundId,
      year,
      month,
    }: {
      fundId: string;
      year: number;
      month: number;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");
      return finalizeMonthYield(fundId, year, month, user.id);
    },
    onSuccess: (result) => {
      toast.success(
        `${result.events_made_visible} yield events now visible to investors`
      );
      // Invalidate all yield-related queries
      YIELD_RELATED_KEYS.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fundYieldEvents() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorYieldEvents });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pendingYieldEvents() });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to finalize yield");
    },
  });
}
