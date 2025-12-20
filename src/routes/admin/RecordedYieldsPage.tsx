/**
 * Recorded Yields Admin Page
 * Lists all yield records with filtering and editing capabilities
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Pencil, 
  History, 
  Filter, 
  Loader2, 
  Check,
  X,
  AlertCircle,
  TrendingUp 
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { CryptoIcon } from "@/components/CryptoIcons";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth/context";
import {
  getYieldRecords,
  updateYieldRecord,
  getYieldEditHistory,
  canEditYields,
  YieldRecord,
  AumPurpose,
  YieldFilters,
} from "@/services/admin/recordedYieldsService";

interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
}

function RecordedYieldsContent() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [filters, setFilters] = useState<YieldFilters>({
    fundId: "all",
    purpose: "all",
  });
  const [editingRecord, setEditingRecord] = useState<YieldRecord | null>(null);
  const [editValues, setEditValues] = useState<{
    total_aum: string;
    aum_date: string;
    purpose: AumPurpose;
    is_month_end: boolean;
    source: string;
  }>({ total_aum: "", aum_date: "", purpose: "transaction", is_month_end: false, source: "" });
  const [editReason, setEditReason] = useState("");
  const [historyRecord, setHistoryRecord] = useState<YieldRecord | null>(null);
  const [canEdit, setCanEdit] = useState(false);

  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Load funds for filter dropdown
  useEffect(() => {
    const loadFunds = async () => {
      const { data } = await supabase
        .from("funds")
        .select("id, code, name, asset")
        .eq("status", "active")
        .order("code");
      setFunds(data || []);
    };
    loadFunds();
  }, []);

  // Check if user can edit yields
  useEffect(() => {
    canEditYields().then(setCanEdit);
  }, []);

  // Fetch yield records
  const { data: yields = [], isLoading } = useQuery({
    queryKey: ["recorded-yields", filters],
    queryFn: () => getYieldRecords(filters),
  });

  // Fetch edit history
  const { data: editHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ["yield-history", historyRecord?.id],
    queryFn: () => (historyRecord ? getYieldEditHistory(historyRecord.id) : Promise.resolve([])),
    enabled: !!historyRecord,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingRecord || !user) throw new Error("Missing data");
      return updateYieldRecord(
        editingRecord.id,
        {
          total_aum: parseFloat(editValues.total_aum),
          aum_date: editValues.aum_date,
          purpose: editValues.purpose,
          is_month_end: editValues.is_month_end,
          source: editValues.source || undefined,
        },
        user.id,
        editReason || undefined
      );
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Yield record updated" });
      setEditingRecord(null);
      setEditReason("");
      queryClient.invalidateQueries({ queryKey: ["recorded-yields"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update",
        variant: "destructive",
      });
    },
  });

  const openEditDialog = (record: YieldRecord) => {
    setEditingRecord(record);
    setEditValues({
      total_aum: record.total_aum.toString(),
      aum_date: record.aum_date,
      purpose: record.purpose,
      is_month_end: record.is_month_end,
      source: record.source || "",
    });
    setEditReason("");
  };

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
                onValueChange={(v) => setFilters({ ...filters, fundId: v })}
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
                onValueChange={(v) => setFilters({ ...filters, purpose: v as AumPurpose | "all" })}
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
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value || undefined })}
                className="w-40"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Date To</Label>
              <Input
                type="date"
                value={filters.dateTo || ""}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value || undefined })}
                className="w-40"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters({ fundId: "all", purpose: "all" })}
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
                  {yields.map((record) => (
                    <TableRow key={record.id}>
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
                        {format(new Date(record.aum_date), "MMM d, yyyy")}
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
                        <div className="flex items-center justify-end gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setHistoryRecord(record)}
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View edit history</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          {canEdit && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEditDialog(record)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit record</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingRecord} onOpenChange={(o) => !o && setEditingRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Yield Record</DialogTitle>
            <DialogDescription>
              Modify the yield entry. All changes are logged for audit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>AUM ({editingRecord?.fund_asset})</Label>
                <Input
                  type="number"
                  step="any"
                  value={editValues.total_aum}
                  onChange={(e) => setEditValues({ ...editValues, total_aum: e.target.value })}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>Effective Date</Label>
                <Input
                  type="date"
                  value={editValues.aum_date}
                  onChange={(e) => setEditValues({ ...editValues, aum_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purpose</Label>
                <Select
                  value={editValues.purpose}
                  onValueChange={(v) => setEditValues({ ...editValues, purpose: v as AumPurpose })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reporting">🟢 Reporting (Month-end)</SelectItem>
                    <SelectItem value="transaction">🟠 Transaction (Operational)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Month End</Label>
                <Select
                  value={editValues.is_month_end ? "yes" : "no"}
                  onValueChange={(v) =>
                    setEditValues({ ...editValues, is_month_end: v === "yes" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Source / Notes</Label>
              <Input
                value={editValues.source}
                onChange={(e) => setEditValues({ ...editValues, source: e.target.value })}
                placeholder="e.g., manual, excel_import"
              />
            </div>

            <div className="space-y-2">
              <Label>
                Reason for Edit <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Explain why this change is needed..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRecord(null)}>
              Cancel
            </Button>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!historyRecord} onOpenChange={(o) => !o && setHistoryRecord(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit History</DialogTitle>
            <DialogDescription>
              {historyRecord?.fund_name} - {historyRecord?.aum_date}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 max-h-96 overflow-y-auto">
            {isLoadingHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : editHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No edit history for this record</p>
              </div>
            ) : (
              <div className="space-y-4">
                {editHistory.map((h: any) => (
                  <div key={h.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {format(new Date(h.edited_at), "MMM d, yyyy HH:mm")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        by {h.editor?.first_name} {h.editor?.last_name}
                      </span>
                    </div>
                    {h.edit_reason && (
                      <p className="text-sm text-muted-foreground">Reason: {h.edit_reason}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="font-medium">Previous</p>
                        <pre className="bg-muted p-2 rounded text-[10px] overflow-auto max-h-24">
                          {JSON.stringify(h.previous_values, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <p className="font-medium">New</p>
                        <pre className="bg-muted p-2 rounded text-[10px] overflow-auto max-h-24">
                          {JSON.stringify(h.new_values, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
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
