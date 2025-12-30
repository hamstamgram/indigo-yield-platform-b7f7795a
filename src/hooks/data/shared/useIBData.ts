/**
 * IB Data Hooks
 * React Query hooks for IB portal data operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/context";
import { ibService } from "@/services";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { invalidateAfterIBOperation } from "@/utils/cacheInvalidation";
import { toast } from "sonner";
import { startOfMonth, startOfQuarter, startOfYear, subMonths } from "date-fns";

export type PeriodType = "MTD" | "QTD" | "YTD" | "ALL";

// ============ Helper Functions ============

export function getPeriodStartDate(periodType: PeriodType): Date | null {
  const now = new Date();
  switch (periodType) {
    case "MTD":
      return startOfMonth(now);
    case "QTD":
      return startOfQuarter(now);
    case "YTD":
      return startOfYear(now);
    case "ALL":
      return null;
  }
}

export function getDateRange(range: string): { start: Date | null; end: Date | null } {
  const now = new Date();
  switch (range) {
    case "1m":
      return { start: subMonths(now, 1), end: now };
    case "3m":
      return { start: subMonths(now, 3), end: now };
    case "6m":
      return { start: subMonths(now, 6), end: now };
    case "1y":
      return { start: subMonths(now, 12), end: now };
    default:
      return { start: null, end: null };
  }
}

// ============ Overview & Dashboard Hooks ============

export function useIBCommissionSummary(period: PeriodType) {
  const { user } = useAuth();
  const startDate = getPeriodStartDate(period);

  return useQuery({
    queryKey: QUERY_KEYS.ibCommissions(user?.id, undefined, period),
    queryFn: () => ibService.getCommissionSummary(user!.id, startDate || undefined),
    enabled: !!user?.id,
  });
}

export function useIBTopReferrals(period: PeriodType) {
  const { user } = useAuth();
  const startDate = getPeriodStartDate(period);

  return useQuery({
    queryKey: QUERY_KEYS.ibTopReferrals(user?.id || "", period),
    queryFn: () => ibService.getTopReferrals(user!.id, startDate || undefined, 10),
    enabled: !!user?.id,
  });
}

export function useIBReferralCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.ibReferralCount(user?.id || ""),
    queryFn: () => ibService.getReferralCount(user!.id),
    enabled: !!user?.id,
  });
}

export function useIBAllocations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.ibAllocations(undefined),
    queryFn: () => ibService.getAllocations(user!.id),
    enabled: !!user?.id,
  });
}

export function useIBPositions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.ibPositions(user?.id || ""),
    queryFn: () => ibService.getIBPositions(user!.id),
    enabled: !!user?.id,
  });
}

// ============ Referrals Hooks ============

export function useIBReferrals(page: number, pageSize = 10) {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.ibReferrals(user?.id, page),
    queryFn: () => ibService.getReferrals(user!.id, page, pageSize),
    enabled: !!user?.id,
  });
}

export function useIBReferralsForDashboard() {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.ibReferrals(user?.id),
    queryFn: () => ibService.getReferralsForDashboard(user!.id),
    enabled: !!user?.id,
  });
}

export function useIBReferralDetail(referralId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.ibReferralDetail(referralId || "", user?.id || ""),
    queryFn: () => ibService.getReferralDetail(referralId!, user!.id),
    enabled: !!user?.id && !!referralId,
  });
}

export function useIBReferralPositions(referralId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.ibReferralPositions(referralId || ""),
    queryFn: () => ibService.getReferralPositions(referralId!),
    enabled: !!referralId && enabled,
  });
}

export function useIBReferralCommissions(referralId: string | undefined, enabled = true) {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.ibReferralCommissions(referralId || "", user?.id || ""),
    queryFn: () => ibService.getReferralCommissions(referralId!, user!.id),
    enabled: !!user?.id && !!referralId && enabled,
  });
}

// ============ Commissions Hooks ============

export function useIBCommissions(page: number, dateRange: string, pageSize = 20) {
  const { user } = useAuth();
  const range = getDateRange(dateRange);

  return useQuery({
    queryKey: QUERY_KEYS.ibCommissions(user?.id, page, dateRange),
    queryFn: () => ibService.getCommissions(user!.id, page, pageSize, range),
    enabled: !!user?.id,
  });
}

// ============ Payout History Hooks ============

export function useIBPayoutHistory(page: number, pageSize = 20) {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.ibPayoutHistory(user?.id || "", page),
    queryFn: () => ibService.getPayoutHistory(user!.id, page, pageSize),
    enabled: !!user?.id,
  });
}

// ============ Profile Hooks ============

export function useIBProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.ibProfile(user?.id),
    queryFn: () => ibService.getIBProfile(user!.id),
    enabled: !!user?.id,
  });
}

export function useUpdateIBProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { first_name: string; last_name: string; phone: string }) =>
      ibService.updateIBProfile(user!.id, data),
    onSuccess: () => {
      toast.success("Profile updated successfully");
      invalidateAfterIBOperation(queryClient, user?.id, user?.id);
    },
    onError: (error) => {
      toast.error("Failed to update profile: " + (error instanceof Error ? error.message : "Unknown error"));
    },
  });
}
