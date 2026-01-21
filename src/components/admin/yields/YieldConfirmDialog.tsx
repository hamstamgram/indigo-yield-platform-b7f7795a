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
  Input,
  Label,
  Badge,
  Checkbox,
} from "@/components/ui";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { YieldCalculationResult } from "@/services";
import { toNum } from "@/utils/numeric";

interface ReconciliationData {
  has_warning: boolean;
  discrepancy_pct: number;
}

interface YieldConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFund: { name: string; asset: string } | null;
  yieldPurpose: "reporting" | "transaction";
  aumDate: Date;
  yieldPreview: YieldCalculationResult | null;
  formatValue: (value: number, asset: string) => string;
  confirmationText: string;
  setConfirmationText: (text: string) => void;
  reconciliation: ReconciliationData | null | undefined;
  acknowledgeDiscrepancy: boolean;
  setAcknowledgeDiscrepancy: (acknowledge: boolean) => void;
  onApply: () => void;
  applyLoading: boolean;
}

export function YieldConfirmDialog({
  open,
  onOpenChange,
  selectedFund,
  yieldPurpose,
  aumDate,
  yieldPreview,
  formatValue,
  confirmationText,
  setConfirmationText,
  reconciliation,
  acknowledgeDiscrepancy,
  setAcknowledgeDiscrepancy,
  onApply,
  applyLoading,
}: YieldConfirmDialogProps) {
  const asset = selectedFund?.asset || "";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Confirm Yield Distribution
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>You are about to distribute yield with the following details:</p>

              <div className="p-3 rounded-md bg-muted space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fund:</span>
                  <span className="font-medium">{selectedFund?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Purpose:</span>
                  <Badge
                    variant="outline"
                    className={
                      yieldPurpose === "reporting"
                        ? "border-green-500 text-green-700"
                        : "border-orange-500 text-orange-700"
                    }
                  >
                    {yieldPurpose === "reporting" ? "Reporting" : "Transaction"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Effective Date:</span>
                  <span className="font-medium">{format(aumDate, "PPP")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gross Yield:</span>
                  <span className="font-mono font-medium text-green-600">
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
                  <span className="font-mono text-blue-600">
                    {formatValue(toNum(yieldPreview?.indigoFeesCredit ?? 0), asset)} {asset}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Investors:</span>
                  <span className="font-medium">{yieldPreview?.investorCount}</span>
                </div>
              </div>

              {yieldPurpose === "reporting" && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>This yield will be visible to investors</strong> on their statements and
                    dashboards.
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

              <div className="space-y-2">
                <Label htmlFor="confirm-text">
                  Type <span className="font-mono font-bold">APPLY</span> to confirm:
                </Label>
                <Input
                  id="confirm-text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value.toUpperCase())}
                  placeholder="APPLY"
                  className="font-mono"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            onClick={onApply}
            disabled={
              confirmationText !== "APPLY" ||
              applyLoading ||
              (reconciliation?.has_warning && !acknowledgeDiscrepancy)
            }
          >
            {applyLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Confirm & Apply
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
