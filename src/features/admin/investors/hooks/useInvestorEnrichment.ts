/**
 * Investor Enrichment
 * Split into independent React Query hooks for granular caching.
 */

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { adminInvestorService, type AdminInvestorSummary } from "@/features/admin/investors/services/adminService";
import { investorDetailService } from "@/features/admin/investors/services/investorDetailService";
import { assetService, profileService } from "@/services/shared";
import { getActiveFundsForList, getActiveInvestorPositions } from "@/services/investor";
import { AssetRef as Asset } from "@/types/asset";
import { useMemo } from "react";

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

// ==================== Independent Query Hooks ====================

function useInvestorsSummary() {
  return useQuery({
    queryKey: QUERY_KEYS.investorsList,
    queryFn: () => adminInvestorService.getAllInvestorsWithSummary(),
    staleTime: 60_000,
  });
}

function useActiveAssets() {
  return useQuery({
    queryKey: QUERY_KEYS.assetsActive,
    queryFn: () => assetService.getAssets({ is_active: true }),
    staleTime: 5 * 60_000,
  });
}

function useActiveFunds() {
  return useQuery({
    queryKey: QUERY_KEYS.activeFunds,
    queryFn: getActiveFundsForList,
    staleTime: 5 * 60_000,
  });
}

function useInvestorPositionsMap() {
  return useQuery({
    queryKey: ["investors", "positions-map"],
    queryFn: async () => {
      const positionsData = await getActiveInvestorPositions();
      const posMap = new Map<string, string[]>();
      positionsData.forEach((p) => {
        const existing = posMap.get(p.investor_id) || [];
        if (!existing.includes(p.fund_id)) {
          existing.push(p.fund_id);
        }
        posMap.set(p.investor_id, existing);
      });
      return posMap;
    },
    staleTime: 30_000,
  });
}

function useInvestorEnrichmentData(investorIds: string[]) {
  return useQuery({
    queryKey: ["investors", "enrichment", investorIds.length],
    queryFn: () =>
      Promise.all([
        investorDetailService.getPendingWithdrawalCountsBatch(investorIds),
        profileService.getLastActivityBatch(investorIds),
        investorDetailService.getLastReportPeriodsBatch(investorIds),
        profileService.getIBParentsBatch(investorIds),
      ]),
    enabled: investorIds.length > 0,
    staleTime: 60_000,
  });
}

// ==================== Main Hook ====================

/**
 * Hook to fetch unified investor data with enrichment for admin views.
 * Now uses 5 independent React Query caches instead of one monolith.
 */
export function useUnifiedInvestors() {
  const investorsQuery = useInvestorsSummary();
  const assetsQuery = useActiveAssets();
  const fundsQuery = useActiveFunds();
  const positionsQuery = useInvestorPositionsMap();

  const investorsData = investorsQuery.data;
  const investorIds = useMemo(
    () => (investorsData || []).map((inv) => inv.id),
    [investorsData]
  );

  const enrichmentQuery = useInvestorEnrichmentData(investorIds);

  const isLoading =
    investorsQuery.isLoading ||
    assetsQuery.isLoading ||
    fundsQuery.isLoading ||
    positionsQuery.isLoading ||
    enrichmentQuery.isLoading;

  const data = useMemo<UnifiedInvestorsData | undefined>(() => {
    if (!investorsData || !assetsQuery.data || !fundsQuery.data || !positionsQuery.data) {
      return undefined;
    }

    const posMap = positionsQuery.data;

    const transformedAssets: Asset[] = assetsQuery.data.map((a) => ({
      id: a.asset_id ? parseInt(a.asset_id, 10) : 0,
      symbol: a.symbol,
      name: a.name,
    }));

    let enrichedInvestors: EnrichedInvestor[];
    if (enrichmentQuery.data) {
      const [withdrawalCounts, lastActivityDates, lastReports, investorIbParents] =
        enrichmentQuery.data;
      enrichedInvestors = investorsData.map((inv) => ({
        ...inv,
        fundsHeldCount: posMap.get(inv.id)?.length || 0,
        lastActivityDate: lastActivityDates.get(inv.id) || null,
        pendingWithdrawals: withdrawalCounts.get(inv.id) || 0,
        lastReportPeriod: lastReports.get(inv.id) || null,
        ibParentName: investorIbParents.get(inv.id) || null,
      }));
    } else {
      // Return un-enriched data while enrichment loads
      enrichedInvestors = investorsData.map((inv) => ({
        ...inv,
        fundsHeldCount: posMap.get(inv.id)?.length || 0,
        lastActivityDate: null,
        pendingWithdrawals: 0,
        lastReportPeriod: null,
        ibParentName: null,
      }));
    }

    return {
      investors: investorsData,
      enrichedInvestors,
      assets: transformedAssets,
      funds: fundsQuery.data,
      investorPositions: posMap,
    };
  }, [investorsData, assetsQuery.data, fundsQuery.data, positionsQuery.data, enrichmentQuery.data]);

  return {
    data,
    isLoading,
    refetch: () =>
      Promise.all([
        investorsQuery.refetch(),
        assetsQuery.refetch(),
        fundsQuery.refetch(),
        positionsQuery.refetch(),
        enrichmentQuery.refetch(),
      ]),
  };
}
