/**
 * Yield History Page
 * Merged view combining Recorded Yields (AUM checkpoints) and Yield Distributions
 * into a single tabbed interface.
 */

import { useState, useEffect } from "react";
import { AdminGuard } from "@/components/admin";
import { useFunds, useUrlFilters } from "@/hooks";
import { canEditYields } from "@/services/admin";
import { type AumPurpose, type YieldFilters } from "@/services/admin";
import {
  YieldsFilterBar,
  YieldsTable,
  VoidYieldDialog,
  EditYieldDialog,
} from "@/features/admin/yields/components";
import {
  useRecordedYieldsData,
  useVoidYieldMutation,
  useUpdateYieldAum,
  type RecordedYieldRecord,
} from "@/hooks";
import { PageShell } from "@/components/layout/PageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { YieldDistributionsContent } from "./YieldDistributionsPage";

interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
}

function RecordedYieldsTab() {
  const { data: fundsData = [] } = useFunds(true);
  const funds: Fund[] = fundsData.map((f) => ({
    id: f.id,
    code: f.code,
    name: f.name,
    asset: f.asset,
  }));

  const [canEdit, setCanEdit] = useState(false);
  const [voidRecord, setVoidRecord] = useState<RecordedYieldRecord | null>(null);
  const [editAumRecord, setEditAumRecord] = useState<RecordedYieldRecord | null>(null);

  const {
    filters: urlFilters,
    setFilter,
    clearFilters,
  } = useUrlFilters({
    keys: ["fundId", "purpose", "dateFrom", "dateTo"],
    defaults: { fundId: "all", purpose: "all" },
  });

  const filters: YieldFilters = {
    fundId: urlFilters.fundId || "all",
    purpose: (urlFilters.purpose as AumPurpose | "all") || "all",
    dateFrom: urlFilters.dateFrom,
    dateTo: urlFilters.dateTo,
  };

  useEffect(() => {
    canEditYields().then(setCanEdit);
  }, []);

  const { data: yields = [], isLoading } = useRecordedYieldsData(filters);
  const voidMutation = useVoidYieldMutation(() => setVoidRecord(null));
  const editAumMutation = useUpdateYieldAum(() => setEditAumRecord(null));

  return (
    <div className="space-y-6">
      <YieldsFilterBar
        filters={filters}
        funds={funds}
        onFilterChange={setFilter}
        onReset={clearFilters}
      />

      <YieldsTable
        yields={yields}
        isLoading={isLoading}
        canEdit={canEdit}
        onEdit={setEditAumRecord}
        onVoid={setVoidRecord}
      />

      <VoidYieldDialog
        record={voidRecord}
        open={!!voidRecord}
        onOpenChange={(open) => !open && setVoidRecord(null)}
        onConfirm={async (reason) => {
          if (!voidRecord) return;
          await voidMutation.mutateAsync({ recordId: voidRecord.id, reason });
        }}
        isPending={voidMutation.isPending}
      />

      <EditYieldDialog
        record={editAumRecord}
        open={!!editAumRecord}
        onOpenChange={(open) => !open && setEditAumRecord(null)}
        onSave={async (newAum, reason) => {
          if (!editAumRecord) return;
          await editAumMutation.mutateAsync({ recordId: editAumRecord.id, newAum, reason });
        }}
        isPending={editAumMutation.isPending}
      />
    </div>
  );
}

function YieldHistoryContent() {
  return (
    <PageShell maxWidth="wide">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">Yield History</h1>
        <p className="text-muted-foreground mt-1">
          View AUM checkpoints and historical yield distributions.
        </p>
      </div>

      <Tabs defaultValue="recorded" className="w-full">
        <TabsList className="bg-black/20 border border-white/10 p-1 rounded-xl">
          <TabsTrigger
            value="recorded"
            className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
          >
            Recorded Yields
          </TabsTrigger>
          <TabsTrigger
            value="distributions"
            className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
          >
            Yield Distributions
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="recorded" className="mt-0 focus-visible:outline-none">
            <RecordedYieldsTab />
          </TabsContent>
          <TabsContent value="distributions" className="mt-0 focus-visible:outline-none">
            <YieldDistributionsContent embedded />
          </TabsContent>
        </div>
      </Tabs>
    </PageShell>
  );
}

export default function YieldHistoryPage() {
  return (
    <AdminGuard>
      <YieldHistoryContent />
    </AdminGuard>
  );
}
