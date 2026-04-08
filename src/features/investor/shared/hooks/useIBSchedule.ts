import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ibScheduleService } from "@/features/admin/ib/services/ibScheduleService";
import { QUERY_KEYS } from "@/constants/queryKeys";

export function useIBSchedule(investorId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.investorIBSchedule(investorId),
    queryFn: () => ibScheduleService.getIBScheduleWithFunds(investorId),
    enabled: !!investorId,
  });
}

export function useAddIBScheduleEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      investorId: string;
      fundId: string | null;
      ibPercentage: number;
      effectiveDate: string;
      endDate?: string | null;
    }) =>
      ibScheduleService.addIBEntry({
        investorId: params.investorId,
        fundId: params.fundId,
        ibPercentage: params.ibPercentage,
        effectiveDate: params.effectiveDate,
        endDate: params.endDate,
      }),
    onSuccess: (_, { investorId }) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.investorIBSchedule(investorId),
      });
    },
  });
}

export function useDeleteIBScheduleEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { entryId: string; investorId: string }) =>
      ibScheduleService.deleteIBEntry(params.entryId),
    onSuccess: (_, { investorId }) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.investorIBSchedule(investorId),
      });
    },
  });
}
