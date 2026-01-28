/**
 * Investor Portal Hooks
 *
 * React Query hooks for investor-facing portal functionality.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { useAuth } from "@/services/auth";
import {
  getInvestorTransactionAssets,
  getInvestorTransactionsList,
  getInvestorStatements,
  getStatementYears,
  getStatementAssets,
  getStatementHtmlContent,
  getInvestorProfile,
  getUserPreferences,
  saveUserPreferences,
  getActiveSessions,
  getAccessLogs,
  revokeSession,
} from "@/services/investor";
import {
  type Session,
  type AccessLog,
  type UserSettings,
  type InvestorProfile,
  type MonthlyStatement,
} from "@/services/investor";

// Re-export types
export type { Session, AccessLog, UserSettings, InvestorProfile, MonthlyStatement };

// ============= Transaction Hooks =============

export function useInvestorTransactionAssets() {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.transactionAssets(user?.id),
    queryFn: () => getInvestorTransactionAssets(user!.id),
    enabled: !!user,
  });
}

export function useInvestorTransactionsList(
  searchTerm?: string,
  assetFilter?: string,
  typeFilter?: string
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.investorTransactions(user?.id || "", searchTerm ? 100 : undefined),
    queryFn: () => getInvestorTransactionsList(user!.id, searchTerm, assetFilter, typeFilter),
    enabled: !!user,
  });
}

// ============= Statement Hooks =============

export function useMonthlyStatements(year: number, assetFilter?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.monthlyStatements(year, assetFilter || "all"),
    queryFn: async () => {
      const {
        data: { user: authUser },
      } = await (await import("@/integrations/supabase/client")).supabase.auth.getUser();
      if (!authUser) throw new Error("No authenticated user");
      return getInvestorStatements(authUser.id, year, assetFilter);
    },
  });
}

export function useStatementYears() {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.statementYears,
    queryFn: async () => {
      const {
        data: { user: authUser },
      } = await (await import("@/integrations/supabase/client")).supabase.auth.getUser();
      if (!authUser) return [new Date().getFullYear()];
      return getStatementYears(authUser.id);
    },
  });
}

export function useStatementAssets() {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.statementAssets,
    queryFn: async () => {
      const {
        data: { user: authUser },
      } = await (await import("@/integrations/supabase/client")).supabase.auth.getUser();
      if (!authUser) return [];
      return getStatementAssets(authUser.id);
    },
  });
}

export function useDownloadStatement() {
  return useMutation({
    mutationFn: async ({
      periodYear,
      periodMonth,
    }: {
      periodYear: number;
      periodMonth: number;
    }) => {
      const {
        data: { user },
      } = await (await import("@/integrations/supabase/client")).supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      return getStatementHtmlContent(user.id, periodYear, periodMonth);
    },
  });
}

// ============= Profile/Settings Hooks =============

export function useInvestorProfileData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.investorProfile(user?.id),
    queryFn: () => getInvestorProfile(user!.id),
    enabled: !!user,
  });
}

export function useUserPreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.userPreferences(user?.id),
    queryFn: () => getUserPreferences(user!.id),
    enabled: !!user,
  });
}

export function useSaveUserPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: UserSettings) => saveUserPreferences(user!.id, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userPreferences(user?.id) });
    },
  });
}

// ============= Session Management Hooks =============

export function useActiveSessions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.activeSessions(user?.id),
    queryFn: () => getActiveSessions(user!.id),
    enabled: !!user,
  });
}

export function useAccessLogs(limit = 20) {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.accessLogs(user?.id, limit),
    queryFn: () => getAccessLogs(user!.id, limit),
    enabled: !!user,
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: revokeSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.activeSessions(user?.id) });
    },
  });
}
