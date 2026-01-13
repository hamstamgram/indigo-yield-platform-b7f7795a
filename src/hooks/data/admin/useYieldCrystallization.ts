/**
 * Yield Crystallization Hooks
 * React Query hooks for admin yield crystallization operations
 * Enhanced with type guards and validation (2026-01-13)
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
import { useAuth } from "@/services/auth";
import { toast } from "sonner";
import { QUERY_KEYS, YIELD_RELATED_KEYS } from "@/constants/queryKeys";

// ============================================================================
// TYPE GUARDS FOR CRYSTALLIZATION RESULTS
// ============================================================================

interface CrystallizationResult {
  success: boolean;
  snapshot_id?: string;
  gross_yield?: string | number;
  yield_tx_count?: number;
  error?: string;
}

interface FinalizeResult {
  success: boolean;
  events_made_visible?: number;
  error?: string;
}

/**
 * Type guard to validate crystallization RPC response
 */
function isCrystallizationResult(result: unknown): result is CrystallizationResult {
  if (typeof result !== "object" || result === null) return false;
  const obj = result as Record<string, unknown>;
  return typeof obj.success === "boolean";
}

/**
 * Type guard to validate finalize month yield RPC response
 */
function isFinalizeResult(result: unknown): result is FinalizeResult {
  if (typeof result !== "object" || result === null) return false;
  const obj = result as Record<string, unknown>;
  return typeof obj.success === "boolean";
}

/**
 * Validate and extract crystallization result with safe defaults
 */
function validateCrystallizationResult(result: unknown): CrystallizationResult {
  if (!isCrystallizationResult(result)) {
    console.error("[useYieldCrystallization] Invalid RPC response structure:", result);
    throw new Error("Invalid crystallization response from server");
  }

  if (!result.success) {
    const errorMsg = result.error || "Crystallization failed - unknown error";
    console.error("[useYieldCrystallization] Crystallization failed:", errorMsg);
    throw new Error(errorMsg);
  }

  return result;
}

/**
 * Validate and extract finalize result with safe defaults
 */
function validateFinalizeResult(result: unknown): FinalizeResult {
  if (!isFinalizeResult(result)) {
    console.error("[useYieldCrystallization] Invalid finalize response structure:", result);
    throw new Error("Invalid finalize response from server");
  }

  if (!result.success) {
    const errorMsg = result.error || "Finalize failed - unknown error";
    console.error("[useYieldCrystallization] Finalize failed:", errorMsg);
    throw new Error(errorMsg);
  }

  return result;
}

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
export function usePendingYieldEvents(fundId: string | null, year: number, month: number) {
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
    queryKey: QUERY_KEYS.aggregatedYield(
      fundId!,
      periodStart?.toISOString(),
      periodEnd?.toISOString(),
      visibilityFilter
    ),
    queryFn: () => getAggregatedYieldForPeriod(fundId!, periodStart!, periodEnd!, visibilityFilter),
    enabled: !!fundId && !!periodStart && !!periodEnd,
  });
}

/**
 * Hook to manually crystallize yield
 * Enhanced with type validation (2026-01-13)
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
      // Input validation
      if (!fundId || !fundId.match(/^[0-9a-f-]{36}$/i)) {
        throw new Error("Invalid fund ID format");
      }
      if (!closingAum || isNaN(parseFloat(closingAum))) {
        throw new Error("Invalid closing AUM value");
      }

      const rawResult = await crystallizeYieldBeforeFlow(
        fundId,
        triggerType,
        eventTs,
        closingAum,
        triggerReference,
        user?.id
      );

      // Validate response structure and success status
      return validateCrystallizationResult(rawResult);
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
      console.error("[useCrystallizeYield] Error:", error);
      toast.error(error.message || "Failed to crystallize yield");
    },
  });
}

/**
 * Hook to finalize month yield (make visible to investors)
 * Enhanced with type validation (2026-01-13)
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
      // Input validation
      if (!user?.id) throw new Error("Not authenticated");
      if (!fundId || !fundId.match(/^[0-9a-f-]{36}$/i)) {
        throw new Error("Invalid fund ID format");
      }
      if (year < 2020 || year > 2100) {
        throw new Error("Invalid year value");
      }
      if (month < 1 || month > 12) {
        throw new Error("Invalid month value (must be 1-12)");
      }

      const rawResult = await finalizeMonthYield(fundId, year, month, user.id);

      // Validate response structure and success status
      return validateFinalizeResult(rawResult);
    },
    onSuccess: (result) => {
      const visibleCount = result.events_made_visible ?? 0;
      toast.success(`${visibleCount} yield events now visible to investors`);
      // Invalidate all yield-related queries
      YIELD_RELATED_KEYS.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fundYieldEvents() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorYieldEvents });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pendingYieldEvents() });
    },
    onError: (error: Error) => {
      console.error("[useFinalizeMonthYield] Error:", error);
      toast.error(error.message || "Failed to finalize yield");
    },
  });
}
