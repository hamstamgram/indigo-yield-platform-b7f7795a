/**
 * useFundsWithMetrics - React Query hook for fund management
 * Fetches funds with AUM and investor metrics, provides archive/restore mutations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fundService } from "@/services/admin";
import { auditLogService } from "@/services/shared";
import { getPositionsByFund } from "@/services/investor";
import { useAuth } from "@/services/auth";
import type { FundStatus } from "@/types/domains/fund";

export interface FundWithMetrics {
  id: string;
  code: string;
  name: string;
  asset: string;
  fund_class?: string;
  status: string;
  inception_date: string;
  logo_url?: string | null;
  created_at?: string | null;
  total_aum: number;
  investor_count: number;
}

const QUERY_KEY = ["funds", "with-metrics"] as const;

/**
 * Fetch all funds with their AUM and investor count metrics
 */
export function useFundsWithMetrics() {
  return useQuery<FundWithMetrics[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const fundsData = await fundService.getAllFunds();

      const fundsWithMetrics = await Promise.all(
        (fundsData || []).map(async (fund) => {
          const positions = await getPositionsByFund(fund.id);

          const total_aum = positions?.reduce(
            (sum, p) => sum + Number(p.currentValue || 0),
            0
          ) || 0;
          const uniqueInvestors = new Set(positions?.map((p) => p.investorId) || []);

          return {
            ...fund,
            status: fund.status || "active",
            total_aum,
            investor_count: uniqueInvestors.size,
          };
        })
      );

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
      console.error("Error archiving fund:", error);
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
      console.error("Error restoring fund:", error);
      toast.error(error.message || "Failed to restore fund");
    },
  });
}
