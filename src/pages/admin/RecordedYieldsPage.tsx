/**
 * Recorded Yields Admin Page
 * Lists all yield records with filtering and editing capabilities
 */

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Filter, 
  Loader2, 
  Check,
  X,
  AlertCircle,
  TrendingUp,
  RefreshCw
} from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CryptoIcon } from "@/components/CryptoIcons";
import { useFunds, useUrlFilters } from "@/hooks";
import { toast } from "sonner";
import {
  getYieldRecords,
  canEditYields,
  YieldRecord,
  AumPurpose,
  YieldFilters,
} from "@/services/admin/recordedYieldsService";
import { YieldCorrectionPanel } from "@/components/admin/yields/YieldCorrectionPanel";
import { getYieldCorrectionHistory, CorrectionHistoryItem } from "@/services/admin/yieldCorrectionService";
import { VoidYieldDialog } from "@/components/admin/yields/VoidYieldDialog";
import { EditYieldDialog } from "@/components/admin/yields/EditYieldDialog";
import { YieldActionsColumn } from "@/components/admin/yields/YieldActionsColumn";
import { voidYieldRecord, updateYieldAum } from "@/services/admin/yieldManagementService";
import { QUERY_KEYS } from "@/constants/queryKeys";
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
  const [historyRecord, setHistoryRecord] = useState<YieldRecord | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [correctionRecord, setCorrectionRecord] = useState<YieldRecord | null>(null);
  const [correctionHistoryRecord, setCorrectionHistoryRecord] = useState<YieldRecord | null>(null);
  const [voidRecord, setVoidRecord] = useState<YieldRecord | null>(null);
  const [editAumRecord, setEditAumRecord] = useState<YieldRecord | null>(null);

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

  // Funds are loaded via useFunds hook above

  // Check if user can edit yields
  useEffect(() => {
    canEditYields().then(setCanEdit);
  }, []);

  // Fetch yield records
  const { data: yields = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.recordedYields(filters as unknown as Record<string, unknown>),
    queryFn: () => getYieldRecords(filters),
  });

  // Fetch correction history for all yields (for badge display)
  const { data: correctionHistory = [] } = useQuery({
    queryKey: QUERY_KEYS.yieldCorrections(filters.fundId === "all" ? undefined : filters.fundId),
    queryFn: () => getYieldCorrectionHistory(filters.fundId === "all" ? undefined : filters.fundId),
  });

  // Fetch correction history for a specific record
  const { data: recordCorrectionHistory = [], isLoading: isLoadingCorrectionHistory } = useQuery({
    queryKey: QUERY_KEYS.yieldCorrectionHistory(correctionHistoryRecord?.fund_id, correctionHistoryRecord?.aum_date, correctionHistoryRecord?.aum_date),
    queryFn: () => correctionHistoryRecord 
      ? getYieldCorrectionHistory(correctionHistoryRecord.fund_id, correctionHistoryRecord.aum_date, correctionHistoryRecord.aum_date)
      : Promise.resolve([]),
    enabled: !!correctionHistoryRecord,
  });

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

  // Void mutation
  const voidMutation = useMutation({
    mutationFn: async (reason: string) => {
      if (!voidRecord) throw new Error("No record selected");
      return voidYieldRecord(voidRecord.id, reason);
    },
    onSuccess: () => {
      toast.success("Yield record voided successfully");
      setVoidRecord(null);
      invalidateAfterYieldOp(queryClient);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to void record");
    },
  });

  // Edit AUM mutation
  const editAumMutation = useMutation({
    mutationFn: async ({ newAum, reason }: { newAum: number; reason: string }) => {
      if (!editAumRecord) throw new Error("No record selected");
      return updateYieldAum(editAumRecord.id, newAum, reason);
    },
    onSuccess: () => {
      toast.success("Yield AUM updated successfully");
      setEditAumRecord(null);
      invalidateAfterYieldOp(queryClient);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update AUM");
    },
  });

  const formatValue = (value: number, asset?: string) => {
    if (asset === "BTC") {
      return value.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    } else if (asset === "ETH" || asset === "SOL") {
      return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    }
    return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

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
                    const isVoided = (record as any).is_voided;
                    
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
                        <TableCell className="text-right font-mono">
                          {formatValue(record.total_aum, record.fund_asset)}
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
                        <p className="font-mono">{c.old_aum?.toLocaleString(undefined, { maximumFractionDigits: 8 })}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">New AUM</p>
                        <p className="font-mono">{c.new_aum?.toLocaleString(undefined, { maximumFractionDigits: 8 })}</p>
                      </div>
                      <div className={`rounded-lg p-3 ${(c.delta_aum || 0) >= 0 ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
                        <p className="text-xs text-muted-foreground mb-1">Delta</p>
                        <p className={`font-mono ${(c.delta_aum || 0) >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                          {(c.delta_aum || 0) > 0 ? "+" : ""}{c.delta_aum?.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                        </p>
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
          queryClient.invalidateQueries({ queryKey: ["recorded-yields"] });
          queryClient.invalidateQueries({ queryKey: ["yield-corrections"] });
        }}
      />

      {/* Void Yield Dialog */}
      <VoidYieldDialog
        record={voidRecord}
        open={!!voidRecord}
        onOpenChange={(open) => !open && setVoidRecord(null)}
        onConfirm={async (reason) => {
          await voidMutation.mutateAsync(reason);
        }}
        isPending={voidMutation.isPending}
      />

      {/* Edit AUM Dialog */}
      <EditYieldDialog
        record={editAumRecord}
        open={!!editAumRecord}
        onOpenChange={(open) => !open && setEditAumRecord(null)}
        onSave={async (newAum, reason) => {
          await editAumMutation.mutateAsync({ newAum, reason });
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
