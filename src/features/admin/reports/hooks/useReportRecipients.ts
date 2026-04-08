/**
 * Report Recipients Hooks
 * React Query hooks for managing investor report recipients
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { useToast } from "@/hooks";
import { reportRecipientsService } from "@/features/admin/reports/services/reportRecipientsService";

/**
 * Hook to fetch report recipients for an investor
 */
export function useReportRecipients(investorId: string) {
  return useQuery<string[]>({
    queryKey: QUERY_KEYS.reportRecipients(investorId),
    queryFn: () => reportRecipientsService.fetchReportRecipients(investorId),
    enabled: !!investorId,
  });
}

/**
 * Hook to update report recipients
 */
export function useUpdateReportRecipients(investorId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (emails: string[]) =>
      reportRecipientsService.updateReportRecipients(investorId, emails),
    onSuccess: () => {
      toast({
        title: "Recipients Updated",
        description: "Report recipients have been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.reportRecipients(investorId) });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update recipients",
        variant: "destructive",
      });
    },
  });
}
