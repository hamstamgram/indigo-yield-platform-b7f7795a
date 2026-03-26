/**
 * Yield History Page
 * Merged view combining Recorded Yields (AUM checkpoints) and Yield Distributions
 * into a single unified interface using First Principles.
 */

import { useState, useEffect, useCallback } from "react";
import { AdminGuard } from "@/features/admin/shared/AdminGuard";
import { useFunds, useUrlFilters, useToast } from "@/hooks";
import { canEditYields } from "@/services/admin";
import { YieldsFilterBar, YieldsTable } from "@/features/admin/yields/components";
import { VoidDistributionDialog } from "@/features/admin/yields/components/VoidDistributionDialog";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { voidYieldDistribution } from "@/services/admin/yields/yieldManagementService";
import {
  useYieldDistributionsPage,
  type YieldDistributionsFilters,
} from "@/features/admin/yields/hooks/useYieldDistributionsPage";
import { PageShell } from "@/components/layout/PageShell";
import type { DistributionRow } from "@/services/admin/yields/yieldDistributionsPageService";

interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
}

export default function YieldHistoryPage() {
  const { data: fundsData = [] } = useFunds(true);
  const funds: Fund[] = fundsData.map((f) => ({
    id: f.id,
    code: f.code,
    name: f.name,
    asset: f.asset,
  }));

  const fundMap = new Map(funds.map((f) => [f.id, f]));

  const [canEdit, setCanEdit] = useState(false);
  const [voidTarget, setVoidTarget] = useState<{
    id: string;
    fund_name: string;
    fund_asset: string;
    gross_yield: number | string;
    net_yield: number | string;
    total_fees: number | string;
    total_ib: number | string;
    purpose: string;
    effective_date: string;
    period_end?: string;
  } | null>(null);
  const [voidPending, setVoidPending] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    filters: urlFilters,
    setFilter,
    clearFilters,
  } = useUrlFilters({
    keys: ["fundId", "purpose", "month"],
    defaults: { fundId: "all", purpose: "all", month: "" },
  });

  const filters: YieldDistributionsFilters = {
    fundId: urlFilters.fundId || "all",
    purpose: urlFilters.purpose || "all",
    month: urlFilters.month || "",
    includeVoided: false,
  };

  useEffect(() => {
    canEditYields().then(setCanEdit);
  }, []);

  const { data, isLoading } = useYieldDistributionsPage(filters);

  const handleVoidOpen = useCallback(
    (distribution: DistributionRow) => {
      const fund = fundMap.get(distribution.fund_id);
      setVoidTarget({
        id: distribution.id,
        fund_name: fund?.name || "Unknown",
        fund_asset: fund?.asset || "",
        gross_yield: distribution.gross_yield,
        net_yield: distribution.net_yield || 0,
        total_fees: distribution.total_fees || 0,
        total_ib: distribution.total_ib || 0,
        purpose: distribution.purpose,
        effective_date: distribution.effective_date,
        period_end: distribution.period_end,
      });
    },
    [fundMap]
  );

  const handleVoidConfirm = useCallback(
    async (distributionId: string, reason: string, voidCrystals: boolean = false) => {
      setVoidPending(true);
      try {
        await voidYieldDistribution(distributionId, reason, voidCrystals);
        toast({ title: "Distribution voided successfully" });
        setVoidTarget(null);
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.yieldDistributions() });
      } catch (err) {
        toast({
          title: "Failed to void distribution",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
      } finally {
        setVoidPending(false);
      }
    },
    [queryClient, toast]
  );

  return (
    <AdminGuard>
      <PageShell maxWidth="wide">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Yield History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View historical yield distributions and investor allocations across all funds.
          </p>
        </div>

        <div className="space-y-6">
          {/* Note: YieldsFilterBar originally expected Aum filters, 
              but it mostly supports fundId and purpose which match YieldDistributionsFilters. 
              We cast it slightly or use it as is since it receives { fundId, purpose, etc }.
           */}
          <YieldsFilterBar
            filters={urlFilters as any}
            funds={funds}
            onFilterChange={setFilter}
            onReset={clearFilters}
          />

          <YieldsTable
            distributions={data?.distributions || []}
            allocationsMap={data?.allocationsByDistribution || {}}
            investorMap={data?.investorMap || {}}
            funds={funds}
            isLoading={isLoading}
            canEdit={canEdit}
            onVoid={handleVoidOpen}
          />

          <VoidDistributionDialog
            distribution={voidTarget}
            open={!!voidTarget}
            onOpenChange={(open) => !open && setVoidTarget(null)}
            onConfirm={handleVoidConfirm}
            isPending={voidPending}
          />
        </div>
      </PageShell>
    </AdminGuard>
  );
}
