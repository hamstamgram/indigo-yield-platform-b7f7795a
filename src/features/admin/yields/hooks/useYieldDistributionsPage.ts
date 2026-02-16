import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  fetchYieldDistributionsPageData,
  type YieldDistributionsFilters,
  type YieldDistributionsPageData,
} from "@/services/admin/yields/yieldDistributionsPageService";

export function useYieldDistributionsPage(filters: YieldDistributionsFilters) {
  return useQuery<YieldDistributionsPageData>({
    queryKey: [
      ...QUERY_KEYS.yieldDistributions(filters.fundId === "all" ? undefined : filters.fundId),
      filters.month,
      filters.purpose ?? "all",
      filters.includeVoided ?? false,
    ],
    queryFn: () => fetchYieldDistributionsPageData(filters),
  });
}

export type { YieldDistributionsFilters, YieldDistributionsPageData };
