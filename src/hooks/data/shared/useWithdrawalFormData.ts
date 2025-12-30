import { useQuery } from "@tanstack/react-query";
import { withdrawalService } from "@/services";

/**
 * Hook to fetch investor options for dropdown selection
 */
export function useInvestorOptions(enabled: boolean = true) {
  return useQuery({
    queryKey: ["investor-options"],
    queryFn: () => withdrawalService.fetchInvestorOptions(),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch investor positions for a selected investor
 */
export function useInvestorPositions(investorId: string | null) {
  return useQuery({
    queryKey: ["investor-positions", investorId],
    queryFn: () => withdrawalService.fetchInvestorPositions(investorId!),
    enabled: !!investorId,
    staleTime: 30 * 1000, // 30 seconds - positions change more frequently
  });
}
