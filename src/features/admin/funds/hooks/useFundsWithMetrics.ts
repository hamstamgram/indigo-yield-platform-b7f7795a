/**
 * useFundsWithMetrics - React Query hook for fund management
 * Fetches funds with AUM and investor metrics, provides archive/restore mutations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logError } from "@/lib/logger";
import { toast } from "sonner";
import { fundService, deleteFund as deleteFundService } from "@/services/admin";
import { auditLogService } from "@/services/shared";
import { useAuth } from "@/services/auth";
import type { Fund, FundStatus } from "@/types/domains/fund";
import { rpc } from "@/lib/rpc/index";

export interface FundWithMetrics extends Fund {
  total_aum: number;
  investor_count: number;
  status: FundStatus | null; // Override status to match Fund or be specific
}

const QUERY_KEY = ["funds", "with-metrics"] as const;

/**
 * Fetch all funds with their AUM and investor count metrics
 */
export function useFundsWithMetrics() {
  return useQuery<FundWithMetrics[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      // 1. Fetch the full fund data to satisfy the `Fund` interface
      const fundsData = await fundService.getAllFunds();

      // 2. Fetch the newly unified AUM data via RPC
      const { data: aumData, error, success } = await rpc.callNoArgs("get_funds_with_aum");

      if (!success || error) {
        logError(
          "useFundsWithMetrics.aumRefresh",
          error || new Error("Failed to fetch AUM via RPC")
        );
      }

      const aumMap = new Map((aumData || []).map((a) => [a.fund_id, a]));

      // 3. Merge the unified AUM data with the full fund objects
      const fundsWithMetrics = (fundsData || []).map((fund) => {
        const aumInfo = aumMap.get(fund.id);

        return {
          ...fund,
          status: fund.status || "active",
          total_aum: Number(aumInfo?.total_aum || 0),
          investor_count: Number(aumInfo?.investor_count || 0),
        };
      });

      return fundsWithMetrics;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Archive a fund (set status to deprecated)
 */
export function useArchiveFund() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (fund: FundWithMetrics) => {
      await fundService.updateFundStatus(fund.id, "deprecated" as FundStatus);

      await auditLogService.logEvent({
        actorUserId: user?.id || "",
        action: "ARCHIVE_FUND",
        entity: "fund",
        entityId: fund.id,
        oldValues: { status: fund.status },
        newValues: { status: "deprecated" },
      });

      return fund;
    },
    onSuccess: (fund) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(`Fund "${fund.name}" archived successfully`);
    },
    onError: (error: Error) => {
      logError("useArchiveFund.onError", error);
      toast.error(error.message || "Failed to archive fund");
    },
  });
}

/**
 * Restore a fund (set status to active)
 */
export function useRestoreFund() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (fund: FundWithMetrics) => {
      await fundService.updateFundStatus(fund.id, "active" as FundStatus);

      await auditLogService.logEvent({
        actorUserId: user?.id || "",
        action: "RESTORE_FUND",
        entity: "fund",
        entityId: fund.id,
        oldValues: { status: fund.status },
        newValues: { status: "active" },
      });

      return fund;
    },
    onSuccess: (fund) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(`Fund "${fund.name}" restored successfully`);
    },
    onError: (error: Error) => {
      logError("useRestoreFund.onError", error);
      toast.error(error.message || "Failed to restore fund");
    },
  });
}

/**
 * Delete a fund (hard delete with cascade cleanup)
 * Requires: zero active investor positions + super_admin role
 */
export function useDeleteFund() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (fund: FundWithMetrics) => {
      // Log audit BEFORE deletion (fund row will be gone after)
      await auditLogService.logEvent({
        actorUserId: user?.id || "",
        action: "DELETE_FUND",
        entity: "fund",
        entityId: fund.id,
        oldValues: {
          name: fund.name,
          code: fund.code,
          asset: fund.asset,
          status: fund.status,
        },
        newValues: null,
      });

      await deleteFundService(fund.id);
      return fund;
    },
    onSuccess: (fund) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(`Fund "${fund.name}" permanently deleted`);
    },
    onError: (error: Error) => {
      logError("useDeleteFund.onError", error);
      toast.error(error.message || "Failed to delete fund");
    },
  });
}
