/**
 * Recorded Yields Admin Page
 * Lists all yield records with filtering and editing capabilities
 */

import { useState, useEffect, useMemo } from "react";
import { AdminGuard } from "@/components/admin";
import { useFunds, useUrlFilters } from "@/hooks";
import { canEditYields } from "@/services/admin";
import { type AumPurpose, type YieldFilters } from "@/services/admin";
import {
  YieldsFilterBar,
  YieldsTable,
  CorrectionHistoryDialog,
  YieldCorrectionPanel,
  VoidYieldDialog,
  EditYieldDialog,
} from "@/components/admin/yields";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui";
import {
  useRecordedYieldsData,
  useYieldCorrectionHistory,
  useRecordCorrectionHistory,
  useVoidYieldMutation,
  useUpdateYieldAum,
  type RecordedYieldRecord,
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
  const funds: Fund[] = fundsData.map((f) => ({
    id: f.id,
    code: f.code,
    name: f.name,
    asset: f.asset,
  }));

  const [canEdit, setCanEdit] = useState(false);
  const [correctionRecord, setCorrectionRecord] = useState<RecordedYieldRecord | null>(null);
  const [correctionHistoryRecord, setCorrectionHistoryRecord] =
    useState<RecordedYieldRecord | null>(null);
  const [voidRecord, setVoidRecord] = useState<RecordedYieldRecord | null>(null);
  const [editAumRecord, setEditAumRecord] = useState<RecordedYieldRecord | null>(null);

  const queryClient = useQueryClient();

  // URL-persisted filters
  const {
    filters: urlFilters,
    setFilter,
    clearFilters,
  } = useUrlFilters({
    keys: ["fundId", "purpose", "dateFrom", "dateTo"],
    defaults: { fundId: "all", purpose: "all" },
  });

  // Force purpose to "all" on page load to ensure all records are visible
  useEffect(() => {
    setFilter("purpose", "all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency - run only on mount

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

      {/* Yield Math Explanation */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="yield-math">
          <AccordionTrigger className="text-left">Crystallized Yield Math (ADB)</AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              We crystallize yield before any deposit/withdrawal because ownership changes after
              each flow. This locks the pre-flow ownership for the days already elapsed, then
              recalculates ownership for the remaining days.
            </p>
            <div className="grid gap-1 text-xs">
              <div>
                <span className="font-medium text-foreground">ADB share %</span> = investor ADB ÷
                total ADB
              </div>
              <div>
                <span className="font-medium text-foreground">Gross</span> = gross yield × ADB share
                %
              </div>
              <div>
                <span className="font-medium text-foreground">Investor fee</span> = gross × fee %
              </div>
              <div>
                <span className="font-medium text-foreground">IB commission</span> = gross × IB %
              </div>
              <div>
                <span className="font-medium text-foreground">Net</span> = gross − fee − IB
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

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
