/**
 * Unified Investor Hooks
 * Consolidated logic for fetching, managing, and enriching investor data.
 * Replaces:
 * - hooks/data/shared/useInvestors.ts
 * - hooks/data/shared/useUnifiedInvestors.ts
 * - hooks/data/admin/useInvestorDetail.ts
 * - hooks/data/admin/useAdminInvestorsWithAssets.ts
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { QUERY_KEYS } from "@/constants/queryKeys";

import {
  adminInvestorService,
  deleteInvestorUser,
  investorDetailService,
  type AdminInvestorSummary,
  type InvestorDetailData,
  type OpsIndicators,
  type AdminInvestorPosition,
  type InvestorPositionsData,
} from "@/services/admin";

import { assetService } from "@/services/shared";

import { getActiveFundsForList, getActiveInvestorPositions } from "@/services/investor";

import { AssetRef as Asset } from "@/types/asset";

// ==================== Types ====================

interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
}

export interface EnrichedInvestor extends AdminInvestorSummary {
  fundsHeldCount: number;
  lastActivityDate: string | null;
  pendingWithdrawals: number;
  lastReportPeriod: string | null;
  ibParentName: string | null;
  isSystemAccount?: boolean;
}

export interface UnifiedInvestorsData {
  investors: AdminInvestorSummary[];
  enrichedInvestors: EnrichedInvestor[];
  assets: Asset[];
  funds: Fund[];
  investorPositions: Map<string, string[]>;
}

export type {
  AdminInvestorSummary,
  InvestorDetailData,
  OpsIndicators,
  AdminInvestorPosition as InvestorPosition, // Alias for backward compatibility
  InvestorPositionsData,
  AdminInvestorPosition,
};

// ==================== Queries ====================

/**
 * Basic useInvestors hook
 * Fetches summary list and active assets
 */
export function useInvestors() {
  const [searchTerm, setSearchTerm] = useState("");

  const assetsQuery = useQuery<Asset[]>({
    queryKey: QUERY_KEYS.assetsActive,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .eq("is_active", true)
        .order("symbol");
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const investorsQuery = useQuery<AdminInvestorSummary[]>({
    queryKey: QUERY_KEYS.investorsSummary,
    queryFn: () => adminInvestorService.getAllInvestorsWithSummary(),
    staleTime: 2 * 60 * 1000,
  });

  const investors = investorsQuery.data || [];

  // Basic search filter
  const filteredInvestors = investors.filter((inv) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      inv.email.toLowerCase().includes(term) ||
      inv.firstName?.toLowerCase().includes(term) ||
      inv.lastName?.toLowerCase().includes(term)
    );
  });

  // Handle errors via toast effect
  useEffect(() => {
    if (investorsQuery.error || assetsQuery.error) {
      const err = investorsQuery.error || assetsQuery.error;
      toast.error(err instanceof Error ? err.message : "Failed to load investor data");
    }
  }, [investorsQuery.error, assetsQuery.error]);

  return {
    investors,
    filteredInvestors,
    searchTerm,
    setSearchTerm,
    loading: investorsQuery.isLoading,
    error: investorsQuery.error || assetsQuery.error,
    assets: assetsQuery.data || [],
    isAdmin: true,
    refetch: investorsQuery.refetch,
  };
}

/**
 * Hook to fetch investor detail
 */
export function useInvestorDetail(investorId: string | undefined) {
  return useQuery<InvestorDetailData | null>({
    queryKey: QUERY_KEYS.investorDetail(investorId || ""),
    queryFn: () => investorDetailService.fetchInvestorDetail(investorId!),
    enabled: !!investorId,
  });
}

/**
 * Hook to fetch investor ops indicators
 */
export function useInvestorOpsIndicators(
  investorId: string | undefined,
  ibParentId: string | null | undefined
) {
  return useQuery<OpsIndicators>({
    queryKey: QUERY_KEYS.adminInvestorOpsIndicators(investorId || ""),
    queryFn: () => investorDetailService.loadOpsIndicators(investorId!, ibParentId ?? null),
    enabled: !!investorId,
  });
}

/**
 * Hook to fetch investor positions with fund details and totals
 */
export function useInvestorPositions(investorId: string | undefined) {
  return useQuery<InvestorPositionsData>({
    queryKey: QUERY_KEYS.adminInvestorPositions(investorId || ""),
    queryFn: () => investorDetailService.fetchInvestorPositionsWithTotals(investorId!),
    enabled: !!investorId,
  });
}

/**
 * Hook to fetch investor active positions (for delete confirmation)
 */
export function useInvestorActivePositions(
  investorId: string | undefined,
  enabled: boolean = false
) {
  return useQuery<AdminInvestorPosition[]>({
    queryKey: QUERY_KEYS.adminInvestorActivePositions(investorId || ""),
    queryFn: () => investorDetailService.fetchActivePositions(investorId!),
    enabled: !!investorId && enabled,
  });
}

// Helper: Enrich investors (Private)
async function enrichInvestorsHelper(
  investorsData: AdminInvestorSummary[],
  posMap: Map<string, string[]>
): Promise<EnrichedInvestor[]> {
  const investorIds = investorsData.map((inv) => inv.id);

  // Batch fetch all enrichment data in parallel
  const [withdrawalsResult, activityResult, reportsResult, profilesResult] = await Promise.all([
    supabase
      .from("withdrawal_requests")
      .select("investor_id")
      .in("investor_id", investorIds)
      .eq("status", "pending"),

    supabase.from("profiles").select("id, last_activity_at").in("id", investorIds),

    supabase
      .from("generated_statements")
      .select("investor_id, period_id, created_at, statement_periods!period_id(period_name)")
      .in("investor_id", investorIds)
      .order("created_at", { ascending: false }),

    supabase
      .from("profiles")
      .select("id, ib_parent_id")
      .in("id", investorIds)
      .not("ib_parent_id", "is", null),
  ]);

  const withdrawalCounts = new Map<string, number>();
  (withdrawalsResult.data || []).forEach((w) => {
    withdrawalCounts.set(w.investor_id, (withdrawalCounts.get(w.investor_id) || 0) + 1);
  });

  const lastActivityDates = new Map<string, string>();
  (activityResult.data || []).forEach((p) => {
    if (p.last_activity_at) {
      lastActivityDates.set(p.id, p.last_activity_at);
    }
  });

  const lastReports = new Map<string, string>();
  (reportsResult.data || []).forEach((r: any) => {
    if (!lastReports.has(r.investor_id)) {
      const periodName = r.statement_periods?.period_name;
      lastReports.set(r.investor_id, periodName || r.period_id);
    }
  });

  const ibParentIds = [
    ...new Set((profilesResult.data || []).map((p) => p.ib_parent_id).filter(Boolean)),
  ];
  const ibParentNames = new Map<string, string>();

  if (ibParentIds.length > 0) {
    const { data: parents } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", ibParentIds);

    (parents || []).forEach((p) => {
      const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
      ibParentNames.set(p.id, name);
    });
  }

  const investorIbParents = new Map<string, string>();
  (profilesResult.data || []).forEach((p) => {
    if (p.ib_parent_id && ibParentNames.has(p.ib_parent_id)) {
      investorIbParents.set(p.id, ibParentNames.get(p.ib_parent_id)!);
    }
  });

  return investorsData.map((inv) => ({
    ...inv,
    fundsHeldCount: posMap.get(inv.id)?.length || 0,
    lastActivityDate: lastActivityDates.get(inv.id) || null,
    pendingWithdrawals: withdrawalCounts.get(inv.id) || 0,
    lastReportPeriod: lastReports.get(inv.id) || null,
    ibParentName: investorIbParents.get(inv.id) || null,
  }));
}

/**
 * Hook to fetch unified investor data with enrichment for admin views
 */
export function useUnifiedInvestors() {
  return useQuery<UnifiedInvestorsData>({
    queryKey: QUERY_KEYS.unifiedInvestors,
    queryFn: async () => {
      const [investorsData, assetsData, fundsData, positionsData] = await Promise.all([
        adminInvestorService.getAllInvestorsWithSummary(),
        assetService.getAssets({ is_active: true }),
        getActiveFundsForList(),
        getActiveInvestorPositions(),
      ]);

      const posMap = new Map<string, string[]>();
      positionsData.forEach((p) => {
        const existing = posMap.get(p.investor_id) || [];
        if (!existing.includes(p.fund_id)) {
          existing.push(p.fund_id);
        }
        posMap.set(p.investor_id, existing);
      });

      const transformedAssets: Asset[] = assetsData.map((a) => ({
        id: a.asset_id ? parseInt(a.asset_id, 10) : 0,
        symbol: a.symbol,
        name: a.name,
      }));

      const enrichedInvestors = await enrichInvestorsHelper(investorsData, posMap);

      return {
        investors: investorsData,
        enrichedInvestors,
        assets: transformedAssets,
        funds: fundsData,
        investorPositions: posMap,
      };
    },
    staleTime: 30000,
  });
}

/**
 * Fetches admin investor list with summary data (Alias for direct query use)
 */
export function useAdminInvestorsList() {
  return useQuery({
    queryKey: QUERY_KEYS.adminInvestors, // Note: kept original key
    queryFn: () => adminInvestorService.getAllInvestorsWithSummary(),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetches assets for admin views
 */
export function useAdminAssets() {
  return useQuery({
    queryKey: QUERY_KEYS.assets(),
    queryFn: async (): Promise<Asset[]> => {
      const assetsData = await assetService.getAssets();
      return assetsData.map((a) => ({
        id: parseInt(a.asset_id.split("-")[0]) || 0,
        symbol: a.symbol,
        name: a.name,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Combined hook for InvestorsListPage data needs
 */
export function useAdminInvestorsWithAssets() {
  const investorsQuery = useAdminInvestorsList();
  const assetsQuery = useAdminAssets();

  return {
    investors: investorsQuery.data ?? [],
    assets: assetsQuery.data ?? [],
    isLoading: investorsQuery.isLoading || assetsQuery.isLoading,
    isError: investorsQuery.isError || assetsQuery.isError,
    error: investorsQuery.error || assetsQuery.error,
    refetch: () => {
      investorsQuery.refetch();
      assetsQuery.refetch();
    },
  };
}

// ==================== Mutations ====================

/**
 * Mutation hook for deleting an investor
 */
export function useDeleteInvestor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (investorId: string) => deleteInvestorUser(investorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminInvestors });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorsSummary });
      toast.success("Investor deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete investor");
    },
  });
}
