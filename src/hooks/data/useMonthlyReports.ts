/**
 * Monthly Reports Hooks
 * React Query hooks for investor monthly report operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getInvestorMonthlyReports,
  createMonthlyReportTemplate,
  updateMonthlyReportField,
} from "@/services/admin/yieldDistributionService";
import { toast } from "sonner";

/**
 * Hook to fetch investor monthly reports
 */
export function useInvestorMonthlyReports(investorId: string) {
  return useQuery({
    queryKey: ["investorMonthlyReports", investorId],
    queryFn: () => getInvestorMonthlyReports(investorId),
    enabled: !!investorId,
  });
}

/**
 * Hook to create monthly report template
 */
export function useCreateMonthlyTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      investorId,
      year,
      month,
      assetCode = "USDT",
    }: {
      investorId: string;
      year: number;
      month: number;
      assetCode?: string;
    }) => {
      return createMonthlyReportTemplate(investorId, year, month, assetCode);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["investorMonthlyReports", variables.investorId],
      });
      toast.success("Monthly template generated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to generate monthly template");
    },
  });
}

/**
 * Hook to update monthly report field
 */
export function useUpdateMonthlyReportField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reportId,
      field,
      value,
    }: {
      reportId: string;
      field: string;
      value: number;
      investorId: string; // For cache invalidation
    }) => {
      return updateMonthlyReportField(reportId, field, value);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["investorMonthlyReports", variables.investorId],
      });
      toast.success("Value updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update value");
    },
  });
}
