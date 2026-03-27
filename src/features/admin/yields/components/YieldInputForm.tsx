/**
 * YieldInputForm - Step 1 & 2 of yield operations
 * Handles period/purpose selection and AUM input
 */

import { useState } from "react";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { NumericInput } from "@/components/common/NumericInput";
import { ArrowRight, AlertTriangle, Info, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import Decimal from "decimal.js";
import { toNum } from "@/utils/numeric";
import { type YieldPurpose, type Fund } from "@/hooks/data/admin/useYieldOperationsState";

interface ReconciliationData {
  has_warning: boolean;
  positions_sum: number;
  recorded_aum: number;
  discrepancy_pct: number;
  tolerance_pct: number;
}

interface PendingEvents {
  count: number;
}

interface YieldInputFormProps {
  selectedFund: Fund | null;
  newAUM: string;
  setNewAUM: (value: string) => void;
  yieldPurpose: YieldPurpose;
  setYieldPurpose: (purpose: YieldPurpose) => void;
  aumDate: string; // Changed from Date to string
  setAumDate: (date: string) => void; // Changed from Date to string
  reportingMonth: string;
  availableMonths: { value: string; label: string }[];
  handleReportingMonthChange: (month: string) => void;
  validateEffectiveDate: () => { valid: boolean; error?: string };
  handlePreviewYield: () => void;
  previewLoading: boolean;
  hasPreview: boolean;
  formatValue: (value: number, asset: string) => string;
  reconciliation?: ReconciliationData | null;
  pendingEvents?: PendingEvents | null;
  // Historical AUM as-of the selected date
  asOfAum: number | null;
  asOfAumLoading: boolean;
  existingDistributionDate: string | null;
  aumTime: string;
  setAumTime: (time: string) => void;
}

export function YieldInputForm({
  selectedFund,
  newAUM,
  setNewAUM,
  yieldPurpose,
  setYieldPurpose,
  aumDate,
  setAumDate,
  reportingMonth,
  availableMonths,
  handleReportingMonthChange,
  validateEffectiveDate,
  handlePreviewYield,
  previewLoading,
  hasPreview,
  formatValue,
  reconciliation,
  pendingEvents,
  asOfAum,
  asOfAumLoading,
  existingDistributionDate,
  aumTime,
  setAumTime,
}: YieldInputFormProps) {
  const validationResult = validateEffectiveDate();

  // Display AUM: simpler approach as requested by user
  const displayedAum = asOfAum ?? 0;

  const isReporting = yieldPurpose === "reporting";

  // Computed yield display when entering new AUM
  const [yieldAmount, setYieldAmount] = useState("");

  const handleNewAUMChange = (value: string) => {
    setNewAUM(value);
    // Sync yield amount display
    if (value && asOfAum !== null) {
      try {
        const newAumDec = new Decimal(value);
        const yieldDec = newAumDec.minus(new Decimal(asOfAum));
        setYieldAmount(yieldDec.isZero() ? "0" : yieldDec.toString());
      } catch {
        setYieldAmount("");
      }
    } else {
      setYieldAmount("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Warning: No AUM History */}
      {selectedFund && selectedFund.aum_record_count === 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              No AUM History for {selectedFund.name}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              First yield distribution will establish baseline AUM.
            </p>
          </div>
        </div>
      )}

      {/* Step 1: Period & Purpose */}
      <div className="p-4 border rounded-lg bg-muted/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
              1
            </div>
            <h3 className="font-semibold">Choose Period & Purpose</h3>
          </div>
        </div>

        {/* Purpose Selector - Both options always visible */}
        <div className="space-y-3 mb-4">
          <Label className="text-sm font-medium">Purpose</Label>

          <div className="grid grid-cols-2 gap-3">
            <div
              data-testid="purpose-transaction"
              className={cn(
                "flex items-start gap-3 p-3 border rounded-md bg-background cursor-pointer transition-colors",
                yieldPurpose === "transaction"
                  ? "border-orange-500 ring-1 ring-orange-500/20"
                  : "hover:border-orange-500/50"
              )}
              onClick={() => setYieldPurpose("transaction")}
            >
              <div
                className={cn(
                  "mt-0.5 h-4 w-4 rounded-full flex-shrink-0",
                  yieldPurpose === "transaction" ? "bg-orange-500" : "bg-muted-foreground/30"
                )}
              />
              <div>
                <p className="font-medium text-sm">Transaction</p>
                <p className="text-xs text-muted-foreground">Operational (withdrawals/top-ups)</p>
              </div>
            </div>
            <div
              data-testid="purpose-reporting"
              className={cn(
                "flex items-start gap-3 p-3 border rounded-md bg-background cursor-pointer transition-colors",
                yieldPurpose === "reporting"
                  ? "border-green-500 ring-1 ring-green-500/20"
                  : "hover:border-green-500/50"
              )}
              onClick={() => setYieldPurpose("reporting")}
            >
              <div
                className={cn(
                  "mt-0.5 h-4 w-4 rounded-full flex-shrink-0",
                  yieldPurpose === "reporting" ? "bg-yield" : "bg-muted-foreground/30"
                )}
              />
              <div>
                <p className="font-medium text-sm">Reporting</p>
                <p className="text-xs text-muted-foreground">Month-end official yield</p>
              </div>
            </div>
          </div>

          {/* Purpose Explainer */}
          <div
            className={cn(
              "flex items-start gap-2 p-3 rounded-md text-sm",
              isReporting ? "bg-green-950/20 text-yield" : "bg-orange-950/20 text-orange-400"
            )}
          >
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              {isReporting ? (
                <span>
                  <strong>Reporting Yield.</strong> Visible to investors for month-end statements.
                </span>
              ) : (
                <span>
                  <strong>Transaction Yield.</strong> Internal operational yield applied mid-month.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Reporting Month Selector */}
        {yieldPurpose === "reporting" && (
          <div className="space-y-2 mb-4">
            <Label>Reporting Month</Label>
            <Select value={reportingMonth} onValueChange={handleReportingMonthChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select month to close" />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Effective Date - only shown for transaction purpose */}
        {!isReporting && (
          <div className="space-y-2 mb-4">
            <Label>Effective Date</Label>
            <div className="relative">
              <Input
                type="date"
                value={aumDate}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    setAumDate(val);
                  }
                }}
                className={cn("w-full pl-3 pr-10", !aumDate && "border-destructive")}
              />
            </div>

            {/* Time picker */}
            <div className="flex items-center gap-2 mt-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label className="text-xs text-muted-foreground whitespace-nowrap">
                Snapshot Time
              </Label>
              <Input
                type="time"
                value={aumTime}
                onChange={(e) => setAumTime(e.target.value)}
                className="w-32 h-8 text-sm"
              />
            </div>
          </div>
        )}

        {/* AUM Display */}
        <div className="space-y-2 mb-4">
          <Label className="text-muted-foreground">
            AUM as of{" "}
            {reportingMonth
              ? format(new Date(reportingMonth + "T12:00:00"), "MMMM yyyy")
              : "selected month"}
          </Label>
          {asOfAumLoading ? (
            <div className="flex items-center gap-2 text-2xl">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Loading...</span>
            </div>
          ) : (
            <div className="text-2xl font-mono font-semibold">
              {selectedFund && formatValue(displayedAum, selectedFund.asset)}{" "}
              <span className="text-base text-muted-foreground">{selectedFund?.asset}</span>
            </div>
          )}
        </div>

        {/* New AUM Input */}
        <div className="space-y-2">
          <Label htmlFor="new-aum">Closing AUM ({selectedFund?.asset})</Label>
          <NumericInput
            id="new-aum"
            data-testid="aum-input"
            asset={selectedFund?.asset}
            value={newAUM}
            onChange={handleNewAUMChange}
            placeholder="Enter new total AUM after yield"
            showFormatted
          />
          {yieldAmount && (
            <p
              className={cn(
                "text-xs",
                toNum(yieldAmount) < 0 ? "text-red-500" : "text-muted-foreground"
              )}
            >
              Yield: {toNum(yieldAmount) >= 0 ? "+" : ""}
              {selectedFund && formatValue(toNum(yieldAmount) || 0, selectedFund.asset)}{" "}
              {selectedFund?.asset}
              {toNum(yieldAmount) < 0 && " (loss month - fees waived)"}
            </p>
          )}
        </div>
      </div>

      {/* Effective Date Validation Warning */}
      {yieldPurpose === "reporting" && reportingMonth && !validationResult.valid && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-red-950/20 text-red-400 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{validationResult.error}</span>
        </div>
      )}

      {/* Existing Distribution Warning (reporting only - transaction allows multiple per day) */}
      {existingDistributionDate && isReporting && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            Reporting yield has already been distributed for this period. Void the existing
            distribution before reapplying.
          </span>
        </div>
      )}

      {/* Pending Yield Events Info */}
      {yieldPurpose === "reporting" && pendingEvents && pendingEvents.count > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
          <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              {pendingEvents.count} pending mid-month{" "}
              {pendingEvents.count !== 1 ? "events" : "event"}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Derived from intra-month adjustments. Will be visible to investors once confirmed.
            </p>
          </div>
        </div>
      )}

      {/* AUM Reconciliation Warning */}
      {reconciliation?.has_warning && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-destructive">AUM Discrepancy Detected</p>
            <p className="text-sm text-destructive/80">
              Positions sum:{" "}
              {formatValue(reconciliation.positions_sum, selectedFund?.asset || "USD")}{" "}
              {selectedFund?.asset}
              <br />
              Recorded AUM: {formatValue(
                reconciliation.recorded_aum,
                selectedFund?.asset || "USD"
              )}{" "}
              {selectedFund?.asset}
              <br />
              Difference: {(reconciliation.discrepancy_pct ?? 0).toFixed(2)}% (threshold:{" "}
              {reconciliation.tolerance_pct ?? 0.01}%)
            </p>
            <p className="text-sm text-destructive font-medium">
              Review before applying yield to ensure accuracy.
            </p>
          </div>
        </div>
      )}

      {/* Step 2: Preview Button */}
      <div className="p-4 border rounded-lg bg-muted/20">
        <div className="flex items-center gap-2 mb-4">
          <div
            className={cn(
              "h-6 w-6 rounded-full flex items-center justify-center text-sm font-bold",
              hasPreview ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            2
          </div>
          <h3 className="font-semibold">Preview Distribution</h3>
        </div>

        <Button
          onClick={() => handlePreviewYield()}
          disabled={
            !newAUM ||
            previewLoading ||
            (isReporting && Boolean(existingDistributionDate)) ||
            (isReporting && !validationResult.valid)
          }
          variant="secondary"
          className="w-full"
        >
          {previewLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4 mr-2" />
          )}
          Preview Yield Distribution
        </Button>
      </div>
    </div>
  );
}
