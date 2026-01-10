/**
 * Recorded Yields Admin Page
 * Lists all yield records with filtering and editing capabilities
 */

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { 
  Filter, 
  Loader2, 
  Check,
  X,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Lock,
  Unlock
} from "lucide-react";
import { AdminGuard } from "@/components/admin";
import { useSuperAdmin } from "@/components/admin/SuperAdminGuard";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Input, Label, Badge,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  ResponsiveTable, ResponsiveTableColumn,
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui";
import { CryptoIcon } from "@/components/CryptoIcons";
import { FinancialValue } from "@/components/common/FinancialValue";
import { useFunds, useUrlFilters } from "@/hooks";
import { canEditYields, type AumPurpose, type YieldFilters } from "@/services";
import { YieldCorrectionPanel } from "@/components/admin/yields/YieldCorrectionPanel";
import { VoidYieldDialog } from "@/components/admin/yields/VoidYieldDialog";
import { EditYieldDialog } from "@/components/admin/yields/EditYieldDialog";
import { YieldActionsColumn } from "@/components/admin/yields/YieldActionsColumn";
import { UnlockPeriodDialog } from "@/components/admin/yields/UnlockPeriodDialog";
import {
  useRecordedYieldsData,
  useYieldCorrectionHistory,
  useRecordCorrectionHistory,
  useVoidYieldMutation,
  useUpdateYieldAum,
  useLockedPeriods,
  type RecordedYieldRecord,
  type CorrectionHistoryItem,
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
  // Use data hook for funds
  const { data: fundsData = [] } = useFunds(true); // activeOnly
  const funds: Fund[] = fundsData.map(f => ({ id: f.id, code: f.code, name: f.name, asset: f.asset }));
  const [historyRecord, setHistoryRecord] = useState<RecordedYieldRecord | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [correctionRecord, setCorrectionRecord] = useState<RecordedYieldRecord | null>(null);
  const [correctionHistoryRecord, setCorrectionHistoryRecord] = useState<RecordedYieldRecord | null>(null);
  const [voidRecord, setVoidRecord] = useState<RecordedYieldRecord | null>(null);
  const [editAumRecord, setEditAumRecord] = useState<RecordedYieldRecord | null>(null);
  const [unlockPeriod, setUnlockPeriod] = useState<LockedPeriod | null>(null);

  // Super admin check for unlock capability
  const { isSuperAdmin } = useSuperAdmin();

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
  const queryClient = useQueryClient();
  useEffect(() => {
    canEditYields().then(setCanEdit);
  }, []);

  // Fetch yield records using hook
  const { data: yields = [], isLoading } = useRecordedYieldsData(filters);

  // Fetch locked periods
  const { data: lockedPeriods = [], isLoading: isLoadingLockedPeriods } = useLockedPeriods(
    filters.fundId === "all" ? undefined : filters.fundId
  );

  // Fetch correction history for all yields (for badge display)
  const { data: correctionHistory = [] } = useYieldCorrectionHistory(
    filters.fundId === "all" ? undefined : filters.fundId
  );

  // Fetch correction history for a specific record
  const { data: recordCorrectionHistory = [], isLoading: isLoadingCorrectionHistory } = 
    useRecordCorrectionHistory(correctionHistoryRecord);

  // Build a map of corrected records (fund_id + date + purpose -> correction count)
  const correctedRecordsMap = useMemo(() => {
    const map = new Map<string, { count: number; lastCorrectedAt: string }>();
    correctionHistory.forEach((c) => {
      const key = `${c.fund_id}:${c.effective_date}:${c.purpose}`;
      const existing = map.get(key);
      if (!existing || new Date(c.applied_at) > new Date(existing.lastCorrectedAt)) {
        map.set(key, { 
          count: (existing?.count || 0) + 1, 
          lastCorrectedAt: c.applied_at 
        });
      } else {
        map.set(key, { ...existing, count: existing.count + 1 });
      }
    });
    return map;
  }, [correctionHistory]);

  // Void mutation using hook
  const voidMutation = useVoidYieldMutation(() => setVoidRecord(null));

  // Edit AUM mutation using hook
  const editAumMutation = useUpdateYieldAum(() => setEditAumRecord(null));

  // formatValue removed - using FinancialValue component instead

  return (
    <div className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Locked Period Alert Banner - Super Admin Only */}
      {isSuperAdmin && lockedPeriods.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300">
                  {lockedPeriods.length} Locked Period{lockedPeriods.length !== 1 ? "s" : ""}
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  {lockedPeriods.map(p => `${p.fund_name} (${p.period_name})`).join(", ")}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {lockedPeriods.slice(0, 3).map((period) => (
                <Button
                  key={period.id}
                  variant="outline"
                  size="sm"
                  onClick={() => setUnlockPeriod(period)}
                  className="text-amber-600 border-amber-300 hover:bg-amber-100 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-900/30"
                >
                  <Unlock className="h-4 w-4 mr-1" />
                  Unlock {period.fund_name}
                </Button>
              ))}
              {lockedPeriods.length > 3 && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  +{lockedPeriods.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Recorded Yields</h1>
        <p className="text-muted-foreground mt-1">
          View and manage all yield entries. {canEdit ? "You can edit records." : "View only."}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Fund</Label>
              <Select
                value={filters.fundId || "all"}
                onValueChange={(v) => setFilter("fundId", v)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Funds" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Funds</SelectItem>
                  {funds.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name} ({f.asset})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Purpose</Label>
              <Select
                value={filters.purpose || "all"}
                onValueChange={(v) => setFilter("purpose", v)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="reporting">🟢 Reporting</SelectItem>
                  <SelectItem value="transaction">🟠 Transaction</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Date From</Label>
              <Input
                type="date"
                value={filters.dateFrom || ""}
                onChange={(e) => setFilter("dateFrom", e.target.value || null)}
                className="w-40"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Date To</Label>
              <Input
                type="date"
                value={filters.dateTo || ""}
                onChange={(e) => setFilter("dateTo", e.target.value || null)}
                className="w-40"
              />
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearFilters()}
            >
              <Filter className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Yields Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Yield Records
              </CardTitle>
              <CardDescription>
                {yields.length} record{yields.length !== 1 ? "s" : ""} found
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : yields.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No yield records found. Adjust filters or record yields first.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fund</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead className="text-right">AUM</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Month End</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yields.map((record) => {
                    const correctionKey = `${record.fund_id}:${record.aum_date}:${record.purpose}`;
                    const correctionInfo = correctedRecordsMap.get(correctionKey);
                    const isVoided = record.is_voided;
                    
                    return (
                      <TableRow key={record.id} className={isVoided ? "opacity-50" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CryptoIcon symbol={record.fund_asset || ""} className="h-5 w-5" />
                            <div>
                              <p className="font-medium">{record.fund_name}</p>
                              <p className="text-xs text-muted-foreground">{record.fund_asset}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {format(new Date(record.aum_date), "MMM d, yyyy")}
                            {isVoided && (
                              <Badge variant="destructive" className="text-xs">
                                Voided
                              </Badge>
                            )}
                            {correctionInfo && !isVoided && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs cursor-pointer bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                                      onClick={() => setCorrectionHistoryRecord(record)}
                                    >
                                      <RefreshCw className="h-3 w-3 mr-1" />
                                      {correctionInfo.count}x Corrected
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Last corrected: {format(new Date(correctionInfo.lastCorrectedAt), "MMM d, yyyy HH:mm")}
                                    <br />Click to view correction history
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <FinancialValue 
                            value={record.total_aum} 
                            asset={record.fund_asset}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={record.purpose === "reporting" ? "default" : "secondary"}
                            className={
                              record.purpose === "reporting"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                            }
                          >
                            {record.purpose === "reporting" ? "🟢 Reporting" : "🟠 Transaction"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.is_month_end ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                          {record.source || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{format(new Date(record.created_at), "MMM d, yyyy")}</p>
                            {record.created_by_name && (
                              <p className="text-xs text-muted-foreground">{record.created_by_name}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <YieldActionsColumn
                            record={record}
                            canEdit={canEdit}
                            onEdit={(r) => setEditAumRecord(r)}
                            onVoid={(r) => setVoidRecord(r)}
                            onViewHistory={(r) => setHistoryRecord(r)}
                            onCorrect={(r) => setCorrectionRecord(r)}
                            isVoided={isVoided}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Locked Periods Section - Super Admin Only */}
      {isSuperAdmin && lockedPeriods.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-amber-600" />
                  Locked Periods
                </CardTitle>
                <CardDescription>
                  {lockedPeriods.length} locked period{lockedPeriods.length !== 1 ? "s" : ""} — Super admins can unlock for corrections
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingLockedPeriods ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fund</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">AUM at Snapshot</TableHead>
                      <TableHead>Investors</TableHead>
                      <TableHead>Locked At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lockedPeriods.map((period) => (
                      <TableRow key={period.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CryptoIcon symbol={period.fund_asset} className="h-5 w-5" />
                            <div>
                              <p className="font-medium">{period.fund_name}</p>
                              <p className="text-xs text-muted-foreground">{period.fund_asset}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              <Lock className="h-3 w-3 mr-1" />
                              {period.period_name}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <FinancialValue 
                            value={period.total_aum} 
                            asset={period.fund_asset}
                          />
                        </TableCell>
                        <TableCell>
                          {period.investor_count}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {period.locked_at ? format(new Date(period.locked_at), "MMM d, yyyy HH:mm") : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setUnlockPeriod(period)}
                                  className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-900/20"
                                >
                                  <Unlock className="h-4 w-4 mr-1" />
                                  Unlock
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Unlock period for yield modifications</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Correction History Dialog */}
      <Dialog open={!!correctionHistoryRecord} onOpenChange={(o) => !o && setCorrectionHistoryRecord(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Correction History
            </DialogTitle>
            <DialogDescription>
              {correctionHistoryRecord?.fund_name} - {correctionHistoryRecord?.aum_date} ({correctionHistoryRecord?.purpose})
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 max-h-[500px] overflow-y-auto">
            {isLoadingCorrectionHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : recordCorrectionHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No corrections for this record</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recordCorrectionHistory.map((c: CorrectionHistoryItem) => (
                  <div key={c.correction_id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                          {c.status}
                        </Badge>
                        <span className="text-sm font-medium">
                          {format(new Date(c.applied_at), "MMM d, yyyy HH:mm")}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        by {c.applied_by_name || "System"}
                      </span>
                    </div>
                    
                    {c.reason && (
                      <p className="text-sm text-muted-foreground italic">"{c.reason}"</p>
                    )}
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Old AUM</p>
                        <FinancialValue value={c.old_aum || 0} asset={correctionHistoryRecord?.fund_asset} />
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">New AUM</p>
                        <FinancialValue value={c.new_aum || 0} asset={correctionHistoryRecord?.fund_asset} />
                      </div>
                      <div className={`rounded-lg p-3 ${(c.delta_aum || 0) >= 0 ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
                        <p className="text-xs text-muted-foreground mb-1">Delta</p>
                        <FinancialValue 
                          value={c.delta_aum || 0} 
                          asset={correctionHistoryRecord?.fund_asset}
                          prefix={(c.delta_aum || 0) > 0 ? "+" : ""}
                          colorize
                        />
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Affected {c.investors_affected} investor{c.investors_affected !== 1 ? "s" : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Yield Correction Panel */}
      <YieldCorrectionPanel
        record={correctionRecord}
        open={!!correctionRecord}
        onOpenChange={(open) => !open && setCorrectionRecord(null)}
        onCorrectionApplied={() => {
          invalidateAfterYieldOp(queryClient);
        }}
      />

      {/* Void Yield Dialog */}
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

      {/* Edit AUM Dialog */}
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

      {/* Unlock Period Dialog */}
      {unlockPeriod && (
        <UnlockPeriodDialog
          open={!!unlockPeriod}
          onOpenChange={(open) => !open && setUnlockPeriod(null)}
          fundId={unlockPeriod.fund_id}
          fundName={unlockPeriod.fund_name}
          periodId={unlockPeriod.period_id}
          periodLabel={unlockPeriod.period_name}
          onSuccess={() => {
            invalidateAfterYieldOp(queryClient);
          }}
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
