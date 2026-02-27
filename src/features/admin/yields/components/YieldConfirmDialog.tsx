/**
 * YieldConfirmDialog - Confirmation dialog for yield distribution
 * Extracted from YieldOperationsPage for maintainability
 */

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  Button,
  Label,
  Badge,
  Checkbox,
} from "@/components/ui";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { YieldCalculationResult } from "@/services/admin";
import { toNum } from "@/utils/numeric";

interface ReconciliationData {
  has_warning: boolean;
  positions_sum: number;
  recorded_aum: number;
  discrepancy_pct: number;
  tolerance_pct: number;
}

interface YieldConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFund: { name: string; asset: string } | null;
  yieldPurpose: "reporting" | "transaction";
  aumDate: string;
  distributionDate: Date;
  yieldPreview: YieldCalculationResult | null;
  formatValue: (value: number, asset: string) => string;
  confirmationText: string;
  setConfirmationText: (text: string) => void;
  reconciliation: ReconciliationData | null | undefined;
  acknowledgeDiscrepancy: boolean;
  setAcknowledgeDiscrepancy: (acknowledge: boolean) => void;
  onApply: () => void;
  applyLoading: boolean;
  existingDistributionDate: string | null;
}

export function YieldConfirmDialog({
  open,
  onOpenChange,
  selectedFund,
  yieldPurpose,
  aumDate,
  distributionDate,
  yieldPreview,
  formatValue,
  confirmationText,
  setConfirmationText,
  reconciliation,
  acknowledgeDiscrepancy,
  setAcknowledgeDiscrepancy,
  onApply,
  applyLoading,
  existingDistributionDate,
}: YieldConfirmDialogProps) {
  const asset = selectedFund?.asset || "";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex flex-col items-center gap-3 text-center pt-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <span className="text-xl font-bold tracking-tight">Are you certain?</span>
            <span className="text-sm font-normal text-muted-foreground">
              This will distribute yield to all active investors in this fund.
            </span>
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Review the distribution details below:
              </p>

              <div className="p-3 rounded-md bg-muted space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fund:</span>
                  <span className="font-medium">{selectedFund?.name}</span>
                </div>
                {/* Added AUM Date display */}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">AUM Date:</span>
                  <span className="font-semibold">
                    {aumDate ? format(new Date(aumDate + "T12:00:00"), "MMMM d, yyyy") : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Purpose:</span>
                  <Badge
                    variant="outline"
                    className={
                      yieldPurpose === "reporting"
                        ? "border-green-500 text-yield"
                        : "border-orange-500 text-orange-700"
                    }
                  >
                    {yieldPurpose === "reporting" ? "Reporting" : "Transaction"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Effective Date:</span>
                  <span className="font-medium">
                    {format(yieldPurpose === "transaction" ? distributionDate : aumDate, "PPP")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gross Yield:</span>
                  <span className="font-mono font-medium text-yield">
                    +{formatValue(toNum(yieldPreview?.grossYield ?? 0), asset)} {asset}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Fees:</span>
                  <span className="font-mono">
                    {formatValue(toNum(yieldPreview?.totalFees ?? 0), asset)} {asset}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IB Fees:</span>
                  <span className="font-mono text-purple-600">
                    {formatValue(toNum(yieldPreview?.totalIbFees ?? 0), asset)} {asset}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">INDIGO FEES Credit:</span>
                  <span className="font-mono text-blue-400">
                    {formatValue(toNum(yieldPreview?.indigoFeesCredit ?? 0), asset)} {asset}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Investors:</span>
                  <span className="font-medium">{yieldPreview?.investorCount}</span>
                </div>
              </div>

              {yieldPurpose === "reporting" && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-green-950/20 text-yield text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>This yield will be visible to investors</strong> on their statements and
                    dashboards.
                  </span>
                </div>
              )}

              {existingDistributionDate && yieldPurpose === "reporting" && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Reporting yield has already been distributed for this period. Void the existing
                    distribution before reapplying.
                  </span>
                </div>
              )}

              {/* AUM Discrepancy Acknowledgment */}
              {reconciliation?.has_warning && (
                <div className="space-y-2 p-3 rounded-md border border-destructive/50 bg-destructive/10">
                  <Label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={acknowledgeDiscrepancy}
                      onCheckedChange={(checked) => setAcknowledgeDiscrepancy(checked === true)}
                    />
                    <span className="text-destructive">
                      I acknowledge the {(reconciliation.discrepancy_pct ?? 0).toFixed(2)}% AUM
                      discrepancy and want to proceed
                    </span>
                  </Label>
                </div>
              )}

              <div className="flex items-start space-x-2 pt-2">
                <Checkbox
                  id="confirm-distribution"
                  checked={confirmationText === "APPLY"}
                  onCheckedChange={(checked) =>
                    setConfirmationText(checked === true ? "APPLY" : "")
                  }
                />
                <label
                  htmlFor="confirm-distribution"
                  className="text-sm leading-tight cursor-pointer"
                >
                  I confirm this yield distribution is accurate and ready to apply
                </label>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-border/50 text-muted-foreground hover:text-foreground">
            Cancel
          </AlertDialogCancel>
          <Button
            onClick={onApply}
            disabled={
              confirmationText !== "APPLY" ||
              applyLoading ||
              (yieldPurpose === "reporting" && Boolean(existingDistributionDate)) ||
              (reconciliation?.has_warning && !acknowledgeDiscrepancy)
            }
            className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/25 transition-all duration-150"
          >
            {applyLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            {applyLoading ? "Distributing..." : "Confirm Distribution"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
