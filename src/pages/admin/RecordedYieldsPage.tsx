/**
 * Recorded Yields Admin Page
 * Lists all yield records with filtering and editing capabilities
 */

import { useState, useEffect, useMemo } from "react";
import { AdminGuard } from "@/components/admin";
import { useSuperAdmin } from "@/components/admin/SuperAdminGuard";
import { useFunds, useUrlFilters } from "@/hooks";
import { canEditYields, type AumPurpose, type YieldFilters } from "@/services";
import {
  LockedPeriodBanner,
  YieldsFilterBar,
  YieldsTable,
  LockedPeriodsTable,
  CorrectionHistoryDialog,
  YieldCorrectionPanel,
  VoidYieldDialog,
  EditYieldDialog,
  UnlockPeriodDialog,
} from "@/components/admin/yields";
import {
  useRecordedYieldsData,
  useYieldCorrectionHistory,
  useRecordCorrectionHistory,
  useVoidYieldMutation,
  useUpdateYieldAum,
  useLockedPeriods,
  type RecordedYieldRecord,
  type LockedPeriod,
} from "@/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateAfterYieldOp } from "@/utils/cacheInvalidation";

interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
}

function RecordedYieldsContent() {
  const { data: fundsData = [] } = useFunds(true);
  const funds: Fund[] = fundsData.map(f => ({ id: f.id, code: f.code, name: f.name, asset: f.asset }));
  
  const [canEdit, setCanEdit] = useState(false);
  const [correctionRecord, setCorrectionRecord] = useState<RecordedYieldRecord | null>(null);
  const [correctionHistoryRecord, setCorrectionHistoryRecord] = useState<RecordedYieldRecord | null>(null);
  const [voidRecord, setVoidRecord] = useState<RecordedYieldRecord | null>(null);
  const [editAumRecord, setEditAumRecord] = useState<RecordedYieldRecord | null>(null);
  const [unlockPeriod, setUnlockPeriod] = useState<LockedPeriod | null>(null);

  const { isSuperAdmin } = useSuperAdmin();
  const queryClient = useQueryClient();

  // URL-persisted filters
  const { filters: urlFilters, setFilter, clearFilters } = useUrlFilters({
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
  const { data: lockedPeriods = [], isLoading: isLoadingLockedPeriods } = useLockedPeriods(
    filters.fundId === "all" ? undefined : filters.fundId
  );
  const { data: correctionHistory = [] } = useYieldCorrectionHistory(
    filters.fundId === "all" ? undefined : filters.fundId
  );
  const { data: recordCorrectionHistory = [], isLoading: isLoadingCorrectionHistory } = 
    useRecordCorrectionHistory(correctionHistoryRecord);

  // Build correction map
  const correctedRecordsMap = useMemo(() => {
    const map = new Map<string, { count: number; lastCorrectedAt: string }>();
    correctionHistory.forEach((c) => {
      const key = `${c.fund_id}:${c.effective_date}:${c.purpose}`;
      const existing = map.get(key);
      if (!existing || new Date(c.applied_at) > new Date(existing.lastCorrectedAt)) {
        map.set(key, { count: (existing?.count || 0) + 1, lastCorrectedAt: c.applied_at });
      } else {
        map.set(key, { ...existing, count: existing.count + 1 });
      }
    });
    return map;
  }, [correctionHistory]);

  // Mutations
  const voidMutation = useVoidYieldMutation(() => setVoidRecord(null));
  const editAumMutation = useUpdateYieldAum(() => setEditAumRecord(null));

  return (
    <div className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Locked Period Alert Banner - Super Admin Only */}
      {isSuperAdmin && lockedPeriods.length > 0 && (
        <LockedPeriodBanner periods={lockedPeriods} onUnlock={setUnlockPeriod} />
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Recorded Yields</h1>
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
        correctedRecordsMap={correctedRecordsMap}
        canEdit={canEdit}
        onEdit={setEditAumRecord}
        onVoid={setVoidRecord}
        onCorrect={setCorrectionRecord}
        onViewHistory={() => {}}
        onViewCorrectionHistory={setCorrectionHistoryRecord}
      />

      {/* Locked Periods Section - Super Admin Only */}
      {isSuperAdmin && lockedPeriods.length > 0 && (
        <LockedPeriodsTable
          periods={lockedPeriods}
          isLoading={isLoadingLockedPeriods}
          onUnlock={setUnlockPeriod}
        />
      )}

      {/* Dialogs */}
      <CorrectionHistoryDialog
        record={correctionHistoryRecord}
        history={recordCorrectionHistory}
        isLoading={isLoadingCorrectionHistory}
        onClose={() => setCorrectionHistoryRecord(null)}
      />

      <YieldCorrectionPanel
        record={correctionRecord}
        open={!!correctionRecord}
        onOpenChange={(open) => !open && setCorrectionRecord(null)}
        onCorrectionApplied={() => invalidateAfterYieldOp(queryClient)}
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

      {unlockPeriod && (
        <UnlockPeriodDialog
          open={!!unlockPeriod}
          onOpenChange={(open) => !open && setUnlockPeriod(null)}
          fundId={unlockPeriod.fund_id}
          fundName={unlockPeriod.fund_name}
          periodId={unlockPeriod.period_id}
          periodLabel={unlockPeriod.period_name}
          onSuccess={() => invalidateAfterYieldOp(queryClient)}
        />
      )}
    </div>
  );
}

export default function RecordedYieldsPage() {
  return (
    <AdminGuard>
      <RecordedYieldsContent />
    </AdminGuard>
  );
}
