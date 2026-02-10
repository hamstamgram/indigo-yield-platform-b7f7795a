/**
 * Recorded Yields Admin Page
 * Lists all yield records with filtering and editing capabilities
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

interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
}

function RecordedYieldsContent() {
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

  // URL-persisted filters
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

  // Data fetching
  const { data: yields = [], isLoading } = useRecordedYieldsData(filters);

  // Mutations
  const voidMutation = useVoidYieldMutation(() => setVoidRecord(null));
  const editAumMutation = useUpdateYieldAum(() => setEditAumRecord(null));

  return (
    <PageShell>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">Recorded Yields</h1>
        <p className="text-muted-foreground mt-1">
          View and manage all yield entries. {canEdit ? "You can edit records." : "View only."}
        </p>
      </div>

      {/* Filters */}
      <YieldsFilterBar
        filters={filters}
        funds={funds}
        onFilterChange={setFilter}
        onReset={clearFilters}
      />

      {/* Yields Table */}
      <YieldsTable
        yields={yields}
        isLoading={isLoading}
        canEdit={canEdit}
        onEdit={setEditAumRecord}
        onVoid={setVoidRecord}
      />

      {/* Dialogs */}
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
    </PageShell>
  );
}

export default function RecordedYieldsPage() {
  return (
    <AdminGuard>
      <RecordedYieldsContent />
    </AdminGuard>
  );
}
