import { useQuery } from "@tanstack/react-query";
import { getLastFinalizedAUMDate } from "@/services/admin/recordedYieldsService";

export const USE_FUND_YIELD_LOCK_QUERY_KEY = "useFundYieldLock";

export function useFundYieldLock(fundId: string | undefined) {
  return useQuery({
    queryKey: [USE_FUND_YIELD_LOCK_QUERY_KEY, fundId],
    queryFn: async () => {
      if (!fundId) return { locked: false, lastYieldDate: null, gapHours: 0 };

      const lastAumDateStr = await getLastFinalizedAUMDate(fundId);
      if (!lastAumDateStr) {
        // If there's literally never been a yield drop, we don't lock
        return { locked: false, lastYieldDate: null, gapHours: 0 };
      }

      const lastDate = new Date(lastAumDateStr);
      const now = new Date();

      const gapMs = now.getTime() - lastDate.getTime();
      const gapHours = gapMs / (1000 * 60 * 60);

      // 72h transaction lock REMOVED per First Principles.
      // Capital flows should not be artificially blocked by time passed since last yield.
      const locked = false;

      return {
        locked,
        lastYieldDate: lastAumDateStr,
        gapHours,
      };
    },
    enabled: !!fundId,
    staleTime: 5 * 60 * 1000, // 5 mins
  });
}
