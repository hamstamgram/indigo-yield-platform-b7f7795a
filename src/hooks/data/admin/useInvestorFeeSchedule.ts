/**
 * Investor Fee Schedule Hook
 * React Query hook for fetching investor fee schedule with funds
 */

import { useQuery } from "@tanstack/react-query";
import { feeScheduleService } from "@/services/admin";

export interface FeeScheduleEntry {
  id: string;
  investor_id: string;
  fund_id: string | null;
  fee_pct: number;
  effective_date: string;
  fund?: { name: string } | null;
}

export function useInvestorFeeSchedule(investorId: string) {
  return useQuery({
    queryKey: ["feeSchedule", investorId],
    queryFn: () => feeScheduleService.getFeeScheduleWithFunds(investorId),
    enabled: !!investorId,
    staleTime: 30_000,
  });
}
