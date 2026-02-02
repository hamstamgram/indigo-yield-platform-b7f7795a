/**
 * YieldInputForm - Step 1 & 2 of yield operations
 * Handles period/purpose selection and AUM input
 */

import {
  Card,
  CardContent,
  Button,
  Label,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { NumericInput } from "@/components/common/NumericInput";
import { ArrowRight, CalendarIcon, AlertTriangle, Info, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { type YieldPurpose, type Fund } from "@/hooks/admin/useYieldOperationsState";

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
  aumDate: Date;
  setAumDate: (date: Date) => void;
  datePickerOpen: boolean;
  setDatePickerOpen: (open: boolean) => void;
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
}

export function YieldInputForm({
  selectedFund,
  newAUM,
  setNewAUM,
  yieldPurpose,
  setYieldPurpose,
  aumDate,
  setAumDate,
  datePickerOpen,
  setDatePickerOpen,
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
}: YieldInputFormProps) {
  const validationResult = validateEffectiveDate();

  // Determine displayed AUM: prefer as-of AUM, fallback to current positions
  const displayedAum = asOfAum ?? selectedFund?.total_aum ?? 0;
  const isUsingHistoricalAum = asOfAum !== null && asOfAum !== undefined;

  const isReporting = yieldPurpose === "reporting";

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
              This fund has no historical AUM records. Before distributing yield, you should record
              AUM data via the <span className="font-medium">Daily Rates Management</span> page or
              by completing this form. The first yield distribution will establish the baseline.
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
            <p className="text-xs text-muted-foreground">
              Select the reporting month this yield applies to
            </p>
          </div>
        )}

        {/* AUM Input */}
        <div className="grid grid-cols-2 gap-6 mb-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">
              {isUsingHistoricalAum
                ? `AUM as of ${reportingMonth ? format(new Date(reportingMonth + "T12:00:00"), "MMMM yyyy") : "selected month"}`
                : "Current AUM"}
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
                {!isUsingHistoricalAum && selectedFund && (
                  <span className="block text-xs text-amber-600 dark:text-amber-400 mt-1">
                    (current positions - no historical data)
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-aum">New AUM ({selectedFund?.asset})</Label>
            <NumericInput
              id="new-aum"
              asset={selectedFund?.asset}
              value={newAUM}
              onChange={setNewAUM}
              placeholder="Enter new total AUM after yield"
              showFormatted
            />
          </div>
        </div>

        {/* Date Picker */}
        <div className="space-y-2 mb-4">
          <Label>Effective Date</Label>
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !aumDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {aumDate ? format(aumDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={aumDate}
                onSelect={(date) => {
                  if (date) {
                    setAumDate(date);
                    setDatePickerOpen(false);
                  }
                }}
                initialFocus
                className="p-3 pointer-events-auto"
                captionLayout="dropdown-buttons"
                fromYear={2024}
                toYear={new Date().getFullYear()}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Purpose Selector */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Purpose</Label>
          <div className="grid grid-cols-2 gap-3">
            <div
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
                  yieldPurpose === "reporting" ? "bg-green-500" : "bg-muted-foreground/30"
                )}
              />
              <div>
                <p className="font-medium text-sm">Reporting</p>
                <p className="text-xs text-muted-foreground">Month-end official yield</p>
              </div>
            </div>
            <div
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
          </div>

          {/* Purpose Explainer */}
          <div
            className={cn(
              "flex items-start gap-2 p-3 rounded-md text-sm",
              yieldPurpose === "reporting"
                ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400"
                : "bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400"
            )}
          >
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              {yieldPurpose === "reporting" ? (
                <>
                  <strong>Visible to investors.</strong> Official month-end yield that appears on
                  investor statements and dashboards.
                </>
              ) : (
                <>
                  <strong>Internal only.</strong> Operational yield for processing withdrawals or
                  top-ups. Not visible to investors.
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Effective Date Validation Warning */}
      {yieldPurpose === "reporting" && reportingMonth && !validationResult.valid && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{validationResult.error}</span>
        </div>
      )}

      {/* Existing Distribution Warning */}
      {existingDistributionDate && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            Yield has already been distributed for this date. Void the existing distribution before
            reapplying.
          </span>
        </div>
      )}

      {/* Pending Crystallization Events Info */}
      {yieldPurpose === "reporting" && pendingEvents && pendingEvents.count > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
          <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              {pendingEvents.count} pending yield event{pendingEvents.count !== 1 ? "s" : ""} from
              mid-month flows
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              These events were crystallized from deposits/withdrawals during this period. They will
              become visible to investors after you apply this month-end yield.
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
          onClick={handlePreviewYield}
          disabled={
            !newAUM ||
            previewLoading ||
            Boolean(existingDistributionDate) ||
            (yieldPurpose === "reporting" && !validationResult.valid)
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
