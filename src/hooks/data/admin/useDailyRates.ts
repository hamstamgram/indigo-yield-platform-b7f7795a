/**
 * Daily Rates Hooks
 * React Query hooks for daily rates management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { dailyRatesService, type DailyRate } from "@/services";

/**
 * Hook to fetch daily rate for a specific date
 */
export function useDailyRate(date: string | undefined) {
  return useQuery<DailyRate | null>({
    queryKey: QUERY_KEYS.dailyRate(date),
    queryFn: () => dailyRatesService.getByDate(date!),
    enabled: !!date,
  });
}

/**
 * Hook to fetch recent daily rates
 */
export function useRecentDailyRates(days: number = 7) {
  return useQuery<DailyRate[]>({
    queryKey: QUERY_KEYS.recentDailyRates,
    queryFn: () => dailyRatesService.getRecent(days),
  });
}

/**
 * Hook to upsert daily rates
 */
export function useSaveDailyRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rateData: Omit<DailyRate, "id">) => dailyRatesService.upsert(rateData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dailyRate(variables.rate_date) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recentDailyRates });
    },
  });
}

/**
 * Hook to send daily rate notification to investors
 */
export function useSendDailyRateNotification() {
  return useMutation({
    mutationFn: (rateData: DailyRate) => dailyRatesService.sendNotificationToInvestors(rateData),
  });
}

// Re-export types
export type { DailyRate };
