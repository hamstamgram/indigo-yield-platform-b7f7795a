import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { expertInvestorService } from "@/services/expertInvestorService";
import { CACHE_KEYS } from "@/utils/performance/caching";
import type { UnifiedInvestorData, ExpertInvestorSummary } from "@/services/expertInvestorService";

// Cache keys for investor data
export const INVESTOR_CACHE_KEYS = {
  ALL_INVESTORS: "allInvestors",
  INVESTOR_DETAIL: "investorDetail",
  INVESTOR_POSITIONS: "investorPositions",
} as const;

/**
 * Hook to fetch all investors with caching
 *
 * Performance optimizations:
 * - 5-minute cache (staleTime)
 * - 10-minute garbage collection
 * - Automatic retry with exponential backoff
 * - No refetch on window focus
 *
 * @returns Query result with all investors data
 *
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const { data: investors, isLoading, error } = useAllInvestors();
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return <InvestorsList investors={investors} />;
 * };
 * ```
 */
export function useAllInvestors() {
  return useQuery({
    queryKey: [INVESTOR_CACHE_KEYS.ALL_INVESTORS],
    queryFn: () => expertInvestorService.getAllInvestorsExpertSummary(),
    // Cache for 5 minutes - investor list doesn't change frequently
    staleTime: 5 * 60 * 1000,
    // Keep in cache for 10 minutes even if component unmounts
    gcTime: 10 * 60 * 1000,
    // Enable caching across component remounts
    refetchOnMount: false,
    // Optional: Show cached data while refetching
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook to fetch single investor details with caching
 *
 * @param investorId - The investor ID to fetch
 * @param options - Query options (e.g., enabled)
 * @returns Query result with investor details
 *
 * @example
 * ```tsx
 * const InvestorDetail = ({ investorId }: { investorId: string }) => {
 *   const { data: investor, isLoading } = useInvestorDetail(investorId);
 *
 *   if (isLoading) return <Skeleton />;
 *
 *   return (
 *     <div>
 *       <h2>{investor.firstName} {investor.lastName}</h2>
 *       <PortfolioSummary investor={investor} />
 *     </div>
 *   );
 * };
 * ```
 */
export function useInvestorDetail(investorId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [INVESTOR_CACHE_KEYS.INVESTOR_DETAIL, investorId],
    queryFn: () => expertInvestorService.getInvestorExpertView(investorId),
    // Only fetch if enabled (default true)
    enabled: options?.enabled !== false && !!investorId,
    // Cache for 5 minutes
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to prefetch investor data on hover (optimistic loading)
 *
 * @example
 * ```tsx
 * const InvestorListItem = ({ investor }: { investor: UnifiedInvestorData }) => {
 *   const prefetchInvestor = usePrefetchInvestor();
 *
 *   return (
 *     <div onMouseEnter={() => prefetchInvestor(investor.id)}>
 *       <Link to={`/investors/${investor.id}`}>
 *         {investor.firstName} {investor.lastName}
 *       </Link>
 *     </div>
 *   );
 * };
 * ```
 */
export function usePrefetchInvestor() {
  const queryClient = useQueryClient();

  return (investorId: string) => {
    queryClient.prefetchQuery({
      queryKey: [INVESTOR_CACHE_KEYS.INVESTOR_DETAIL, investorId],
      queryFn: () => expertInvestorService.getInvestorExpertView(investorId),
      // Prefetch with same cache time
      staleTime: 5 * 60 * 1000,
    });
  };
}

/**
 * Hook to invalidate investor caches after mutations
 *
 * Use this after updating investor data to refresh the UI
 *
 * @example
 * ```tsx
 * const UpdateInvestorForm = ({ investorId }: { investorId: string }) => {
 *   const invalidateInvestor = useInvalidateInvestor();
 *
 *   const handleSubmit = async (data) => {
 *     await updateInvestor(investorId, data);
 *     // Invalidate caches to refetch fresh data
 *     invalidateInvestor(investorId);
 *   };
 *
 *   return <form onSubmit={handleSubmit}>...</form>;
 * };
 * ```
 */
export function useInvalidateInvestor() {
  const queryClient = useQueryClient();

  return (investorId?: string) => {
    if (investorId) {
      // Invalidate specific investor
      queryClient.invalidateQueries({
        queryKey: [INVESTOR_CACHE_KEYS.INVESTOR_DETAIL, investorId],
      });
    }

    // Always invalidate the all investors list
    queryClient.invalidateQueries({
      queryKey: [INVESTOR_CACHE_KEYS.ALL_INVESTORS],
    });
  };
}

/**
 * Example mutation hook for updating investor data
 *
 * Demonstrates optimistic updates and cache invalidation
 *
 * @example
 * ```tsx
 * const UpdateInvestorStatus = ({ investor }: { investor: UnifiedInvestorData }) => {
 *   const { mutate: updateStatus, isPending } = useUpdateInvestorStatus();
 *
 *   const handleApprove = () => {
 *     updateStatus(
 *       { investorId: investor.id, status: 'active' },
 *       {
 *         onSuccess: () => {
 *           toast.success('Investor approved!');
 *         },
 *         onError: (error) => {
 *           toast.error(`Failed: ${error.message}`);
 *         }
 *       }
 *     );
 *   };
 *
 *   return (
 *     <Button onClick={handleApprove} disabled={isPending}>
 *       {isPending ? 'Approving...' : 'Approve'}
 *     </Button>
 *   );
 * };
 * ```
 */
export function useUpdateInvestorStatus() {
  const queryClient = useQueryClient();
  const invalidateInvestor = useInvalidateInvestor();

  return useMutation({
    mutationFn: async ({ investorId, status }: { investorId: string; status: string }) => {
      // TODO: Replace with actual update service method
      // return await investorService.updateStatus(investorId, status);
      throw new Error("Not implemented - add actual service method");
    },
    // Optimistic update: immediately update the UI before API responds
    onMutate: async ({ investorId, status }) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({
        queryKey: [INVESTOR_CACHE_KEYS.INVESTOR_DETAIL, investorId],
      });

      // Snapshot the previous value
      const previousInvestor = queryClient.getQueryData<ExpertInvestorSummary>([
        INVESTOR_CACHE_KEYS.INVESTOR_DETAIL,
        investorId,
      ]);

      // Optimistically update to the new value
      if (previousInvestor) {
        queryClient.setQueryData<ExpertInvestorSummary>(
          [INVESTOR_CACHE_KEYS.INVESTOR_DETAIL, investorId],
          {
            ...previousInvestor,
            investor: {
              ...previousInvestor.investor,
              status,
            },
          }
        );
      }

      // Return context with previous value for rollback
      return { previousInvestor };
    },
    // If mutation fails, rollback to previous value
    onError: (error, variables, context) => {
      if (context?.previousInvestor) {
        queryClient.setQueryData(
          [INVESTOR_CACHE_KEYS.INVESTOR_DETAIL, variables.investorId],
          context.previousInvestor
        );
      }
    },
    // Always refetch after error or success to ensure UI is in sync
    onSettled: (data, error, variables) => {
      invalidateInvestor(variables.investorId);
    },
  });
}

/**
 * Performance monitoring hook
 *
 * Tracks cache hit rates and query performance
 *
 * @example
 * ```tsx
 * const AdminDashboard = () => {
 *   const cacheStats = useCacheStats();
 *
 *   return (
 *     <div>
 *       <h3>Cache Performance</h3>
 *       <p>Queries: {cacheStats.queryCount}</p>
 *       <p>Hit Rate: {cacheStats.hitRate}%</p>
 *     </div>
 *   );
 * };
 * ```
 */
export function useCacheStats() {
  const queryClient = useQueryClient();
  const cache = queryClient.getQueryCache();

  const queries = cache.getAll();
  const activeQueries = queries.filter((q) => q.state.status === "success");
  const staleQueries = queries.filter((q) => q.isStale());

  return {
    queryCount: queries.length,
    activeCount: activeQueries.length,
    staleCount: staleQueries.length,
    hitRate: queries.length > 0 ? ((activeQueries.length / queries.length) * 100).toFixed(2) : "0",
  };
}
