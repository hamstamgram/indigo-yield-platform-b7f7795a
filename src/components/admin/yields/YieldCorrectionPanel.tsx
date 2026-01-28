/**
 * Yield Correction Panel V2
 * Side panel with month selector, time-weighted preview, and reconciliation
 */

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { X, Loader2, Eye, AlertCircle, CheckCircle2, RefreshCw, Calendar } from "lucide-react";
import {
  Button,
  Input,
  Label,
  Badge,
  ScrollArea,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { CryptoIcon } from "@/components/CryptoIcons";
import { toast } from "sonner";
import {
  previewYieldCorrectionV2,
  applyYieldCorrectionV2,
  regenerateAffectedReports,
  formatTokenAmount,
  type CorrectionPreview,
} from "@/services/admin/yieldCorrectionService";
import { type YieldRecord } from "@/services/admin";
import { YieldCorrectionPreview } from "./YieldCorrectionPreview";
import { CorrectionConfirmDialog } from "./CorrectionConfirmDialog";

interface YieldCorrectionPanelProps {
  record: YieldRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCorrectionApplied: () => void;
}

// Generate month options for the last 24 months
function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy"),
      start: format(startOfMonth(date), "yyyy-MM-dd"),
      end: format(endOfMonth(date), "yyyy-MM-dd"),
    });
  }
  return options;
}

export function YieldCorrectionPanel({
  record,
  open,
  onOpenChange,
  onCorrectionApplied,
}: YieldCorrectionPanelProps) {
  const [newAum, setNewAum] = useState("");
  const [reason, setReason] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [preview, setPreview] = useState<CorrectionPreview | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [lastCorrectionId, setLastCorrectionId] = useState<string | null>(null);

  const monthOptions = getMonthOptions();

  // Initialize from record
  useEffect(() => {
    if (record && open) {
      setNewAum(record.total_aum.toString());
      // Set month from record date
      const recordDate = new Date(record.aum_date);
      const monthValue = format(recordDate, "yyyy-MM");
      setSelectedMonth(monthValue);
      setPeriodStart(format(startOfMonth(recordDate), "yyyy-MM-dd"));
      setPeriodEnd(record.aum_date);
    }
  }, [record, open]);

  // Update period when month changes
  const handleMonthChange = (value: string) => {
    setSelectedMonth(value);
    const option = monthOptions.find((o) => o.value === value);
    if (option) {
      setPeriodStart(option.start);
      setPeriodEnd(option.end);
    }
    setPreview(null);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setNewAum("");
      setReason("");
      setSelectedMonth("");
      setPeriodStart("");
      setPeriodEnd("");
      setPreview(null);
      setShowConfirmDialog(false);
      setLastCorrectionId(null);
    }
    onOpenChange(isOpen);
  };

  // Preview mutation using V2
  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!record || !periodStart || !periodEnd) throw new Error("Missing period selection");
      const newAumValue = parseFloat(newAum);
      if (isNaN(newAumValue) || newAumValue < 0) throw new Error("Invalid AUM value");
      return previewYieldCorrectionV2(
        record.fund_id,
        periodStart,
        periodEnd,
        record.purpose,
        newAumValue
      );
    },
    onSuccess: (data) => {
      if (data.success) {
        setPreview(data);
      } else {
        toast.error(data.error || "Preview failed");
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Preview failed");
    },
  });

  // Apply mutation using V2
  const applyMutation = useMutation({
    mutationFn: async (confirmation: string) => {
      if (!record || !preview?.summary || !periodStart || !periodEnd)
        throw new Error("No preview available");
      const newAumValue = parseFloat(newAum);
      return applyYieldCorrectionV2(
        record.fund_id,
        periodStart,
        periodEnd,
        record.purpose,
        newAumValue,
        reason,
        confirmation
      );
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || "Correction applied with time-weighted ownership");
        setLastCorrectionId(data.correction_id || null);
        setShowConfirmDialog(false);
        onCorrectionApplied();
      } else {
        toast.error(data.error || "Failed to apply correction");
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to apply correction");
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: (correctionId: string) => regenerateAffectedReports(correctionId),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(
          result.message || `Regenerated ${(result as any).statements_regenerated} statements`
        );
        onCorrectionApplied(); // This will trigger a refresh of the parent component's data
        handleOpenChange(false); // Close the panel
      } else {
        toast.error(result.error || "Failed to regenerate reports");
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to regenerate reports");
    },
  });

  const hasChanges = record && parseFloat(newAum) !== record.total_aum;
  const delta = record ? parseFloat(newAum) - record.total_aum : 0;

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <CryptoIcon symbol={record?.fund_asset || ""} className="h-5 w-5" />
              Correct Yield Record (Time-Weighted)
            </SheetTitle>
            <SheetDescription>
              {record && (
                <>
                  {record.fund_name} •{" "}
                  <Badge
                    variant={record.purpose === "reporting" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {record.purpose}
                  </Badge>
                </>
              )}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 py-4">
            <div className="space-y-6 pr-4">
              {/* Month Selector */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Period (Month)
                </Label>
                <Select value={selectedMonth} onValueChange={handleMonthChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select month..." />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {periodStart && periodEnd && (
                  <p className="text-xs text-muted-foreground">
                    Period: {periodStart} → {periodEnd}
                  </p>
                )}
              </div>

              {/* Current vs New AUM */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">
                    Current AUM ({record?.fund_asset})
                  </Label>
                  <div className="p-3 rounded-lg bg-muted font-mono text-lg">
                    {record ? formatTokenAmount(record.total_aum, record.fund_asset) : "-"}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-aum">New AUM ({record?.fund_asset})</Label>
                  <Input
                    id="new-aum"
                    type="number"
                    step="any"
                    value={newAum}
                    onChange={(e) => {
                      setNewAum(e.target.value);
                      setPreview(null);
                    }}
                    className="font-mono text-lg"
                  />
                </div>
              </div>

              {/* Delta indicator */}
              {hasChanges && !isNaN(delta) && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-lg ${delta > 0 ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" : delta < 0 ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400" : "bg-muted"}`}
                >
                  <span className="text-sm font-medium">Delta:</span>
                  <span className="font-mono">
                    {delta > 0 ? "+" : ""}
                    {formatTokenAmount(delta, record?.fund_asset)} {record?.fund_asset}
                  </span>
                </div>
              )}

              {/* Preview button */}
              <Button
                onClick={() => previewMutation.mutate()}
                disabled={!hasChanges || !selectedMonth || previewMutation.isPending}
                className="w-full"
                variant="secondary"
              >
                {previewMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4 mr-2" />
                )}
                Preview Time-Weighted Impact
              </Button>

              {/* Preview error */}
              {preview && !preview.success && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm">{preview.error}</span>
                </div>
              )}

              {/* Preview results */}
              {preview?.success &&
                preview.summary &&
                preview.investor_rows &&
                preview.tx_diffs &&
                preview.report_impacts && (
                  <>
                    <YieldCorrectionPreview
                      summary={preview.summary}
                      investorRows={preview.investor_rows}
                      txDiffs={preview.tx_diffs}
                      reportImpacts={preview.report_impacts}
                      reconciliation={preview.reconciliation}
                    />
                    <Button onClick={() => setShowConfirmDialog(true)} className="w-full">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Apply Correction
                    </Button>
                  </>
                )}

              {/* Post-correction actions */}
              {lastCorrectionId && (
                <div className="space-y-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Correction Applied (Time-Weighted)</span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => regenerateMutation.mutate(lastCorrectionId)}
                    disabled={regenerateMutation.isPending}
                    className="w-full"
                  >
                    {regenerateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Regenerate Affected Reports
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleOpenChange(false)}
                    className="w-full"
                  >
                    Close
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <CorrectionConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        isMonthClosed={preview?.summary?.is_month_closed || false}
        reason={reason}
        onReasonChange={setReason}
        onConfirm={(confirmation) => applyMutation.mutate(confirmation)}
        isPending={applyMutation.isPending}
      />
    </>
  );
}
