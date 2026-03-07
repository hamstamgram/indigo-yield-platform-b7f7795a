/**
 * DistributeYieldDialog — single ceremonious confirmation modal for yield distribution.
 * Shows full validation details + confirmation checkbox.
 * Three states: confirm -> processing -> success.
 */
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, TrendingUp, Users, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toNum } from "@/utils/numeric";

interface ReconciliationData {
  has_warning: boolean;
  discrepancy_pct: number;
}

interface DistributeYieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grossYield: string;
  asset: string;
  fundName: string;
  investorCount: number;
  onConfirm: () => void;
  isLoading: boolean;
  // Validation detail props
  yieldPurpose: "reporting" | "transaction";
  aumDate: string;
  distributionDate: Date;
  totalFees?: string;
  totalIbFees?: string;
  indigoFeesCredit?: string;
  netYield?: string;
  reconciliation?: ReconciliationData | null;
  existingDistributionDate?: string | null;
  asOfAum?: string | number | null;
  formatValue: (value: number, asset: string) => string;
}

type Phase = "confirm" | "processing" | "success";

export function DistributeYieldDialog({
  open,
  onOpenChange,
  grossYield,
  asset,
  fundName,
  investorCount,
  onConfirm,
  isLoading,
  yieldPurpose,
  aumDate,
  distributionDate,
  totalFees,
  totalIbFees,
  indigoFeesCredit,
  netYield,
  reconciliation,
  existingDistributionDate,
  asOfAum,
  formatValue,
}: DistributeYieldDialogProps) {
  const [phase, setPhase] = useState<Phase>("confirm");
  const [confirmed, setConfirmed] = useState(false);
  const [acknowledgeDiscrepancy, setAcknowledgeDiscrepancy] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPhase("confirm");
      setConfirmed(false);
      setAcknowledgeDiscrepancy(false);
    }
  }, [open]);

  // When external loading starts, move to processing then success
  useEffect(() => {
    if (isLoading && phase === "confirm") {
      setPhase("processing");
    }
    if (!isLoading && phase === "processing") {
      const t = setTimeout(() => setPhase("success"), 400);
      return () => clearTimeout(t);
    }
  }, [isLoading, phase]);

  const handleConfirm = () => {
    setPhase("processing");
    onConfirm();
  };

  const handleClose = () => {
    if (phase === "processing") return;
    onOpenChange(false);
  };

  const hasExistingReporting = yieldPurpose === "reporting" && Boolean(existingDistributionDate);
  const hasDiscrepancy = reconciliation?.has_warning === true;

  const canConfirm =
    confirmed && !hasExistingReporting && (!hasDiscrepancy || acknowledgeDiscrepancy);

  const effectiveDate = yieldPurpose === "transaction" ? distributionDate : aumDate;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-md glass-panel border-white/10 p-0 overflow-hidden"
        onInteractOutside={(e) => {
          if (phase === "processing") e.preventDefault();
        }}
      >
        {/* Top accent bar */}
        <div
          className="h-1 w-full"
          style={{
            background: "linear-gradient(90deg, hsl(var(--indigo-brand)), hsl(var(--yield-neon)))",
          }}
        />

        <div className="p-7">
          {/* CONFIRM PHASE */}
          {phase === "confirm" && (
            <>
              <DialogHeader className="mb-5">
                <DialogTitle className="flex items-center gap-3 text-xl text-white">
                  <div className="h-9 w-9 rounded-full bg-indigo-500/15 flex items-center justify-center border border-indigo-500/20">
                    <TrendingUp className="h-4 w-4 text-indigo-400" />
                  </div>
                  Distribute Yield
                </DialogTitle>
                <DialogDescription className="text-slate-400 mt-1">
                  Review the distribution details and confirm below.
                </DialogDescription>
              </DialogHeader>

              {/* Distribution details */}
              <div className="rounded-xl border border-white/8 bg-white/[0.03] divide-y divide-white/5 mb-4">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Gross Yield
                  </div>
                  <span
                    className="text-xl font-bold tabular-nums tracking-tight"
                    style={{ color: "hsl(var(--yield-neon))" }}
                  >
                    +{grossYield} {asset}
                  </span>
                </div>
                {netYield && (
                  <div className="flex flex-col gap-1 px-4 py-2 bg-indigo-500/5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground font-medium">Net Yield</span>
                      <span className="text-sm font-mono font-bold text-white">
                        {formatValue(toNum(netYield), asset)} {asset}
                      </span>
                    </div>
                    {/* Math Reconciliation breakdown */}
                    <div className="flex flex-col gap-1.5 pl-3 border-l border-indigo-500/20 my-1">
                      {totalIbFees && (
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
                            + IB Fees
                          </span>
                          <span className="text-[11px] font-mono text-purple-400">
                            {formatValue(toNum(totalIbFees), asset)} {asset}
                          </span>
                        </div>
                      )}
                      {totalFees && (
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
                            + INDIGO Fees
                          </span>
                          <span className="text-[11px] font-mono text-indigo-400">
                            {formatValue(toNum(totalFees), asset)} {asset}
                          </span>
                        </div>
                      )}
                      <div className="h-px bg-white/5 w-full my-0.5" />
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-indigo-300 font-semibold uppercase tracking-wider">
                          = Gross Yield
                        </span>
                        <span className="text-[11px] font-mono font-bold text-indigo-300">
                          {grossYield} {asset}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {totalFees && toNum(totalFees) > 0 && (
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-muted-foreground">INDIGO Fees Credit</span>
                    <span className="text-sm font-mono text-slate-300">
                      {formatValue(toNum(totalFees), asset)} {asset}
                    </span>
                  </div>
                )}
                {totalIbFees && toNum(totalIbFees) > 0 && (
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-muted-foreground">IB Fees</span>
                    <span className="text-sm font-mono text-purple-400">
                      {formatValue(toNum(totalIbFees), asset)} {asset}
                    </span>
                  </div>
                )}
                {indigoFeesCredit && toNum(indigoFeesCredit) > 0 && (
                  <div className="flex items-center justify-between px-4 py-2.5 bg-blue-500/5">
                    <span className="text-sm text-blue-400 font-medium">INDIGO Fees Credit</span>
                    <span className="text-sm font-mono text-blue-400 font-bold">
                      +{formatValue(toNum(indigoFeesCredit), asset)} {asset}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    Recipients
                  </div>
                  <span className="text-sm font-semibold text-white">
                    {investorCount} investor{investorCount !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-muted-foreground">Fund</span>
                  <span className="text-sm font-semibold text-white">{fundName}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-muted-foreground">Purpose</span>
                  <Badge
                    variant="outline"
                    className={
                      yieldPurpose === "reporting"
                        ? "border-green-500/40 text-green-400"
                        : "border-orange-500/40 text-orange-400"
                    }
                  >
                    {yieldPurpose === "reporting" ? "Reporting" : "Transaction"}
                  </Badge>
                </div>
                {aumDate && (
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-muted-foreground">AUM Date</span>
                    <span className="text-sm font-semibold text-white">
                      {format(new Date(aumDate + "T12:00:00"), "MMMM d, yyyy")}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-3 bg-indigo-500/10 border-t border-indigo-500/20">
                  <span className="text-sm font-semibold text-white">Ending Balance</span>
                  <span className="text-lg font-bold text-white tabular-nums">
                    {formatValue(toNum(asOfAum || 0) + toNum(grossYield), asset)} {asset}
                  </span>
                </div>
              </div>

              {/* Warnings */}
              {yieldPurpose === "reporting" && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-green-950/20 text-green-400 text-sm mb-3">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>This yield will be visible to investors</strong> on their statements and
                    dashboards.
                  </span>
                </div>
              )}

              {hasExistingReporting && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-950/20 text-amber-400 text-sm mb-3">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Reporting yield has already been distributed for this period. Void the existing
                    distribution before reapplying.
                  </span>
                </div>
              )}

              {/* AUM Discrepancy Acknowledgment */}
              {hasDiscrepancy && (
                <div className="space-y-2 p-3 rounded-lg border border-destructive/50 bg-destructive/10 mb-3">
                  <Label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={acknowledgeDiscrepancy}
                      onCheckedChange={(checked) => setAcknowledgeDiscrepancy(checked === true)}
                    />
                    <span className="text-destructive">
                      I acknowledge the {(reconciliation?.discrepancy_pct ?? 0).toFixed(2)}% AUM
                      discrepancy and want to proceed
                    </span>
                  </Label>
                </div>
              )}

              {/* Confirmation checkbox */}
              <div className="flex items-start space-x-2 mb-5">
                <Checkbox
                  id="confirm-distribution"
                  checked={confirmed}
                  onCheckedChange={(checked) => setConfirmed(checked === true)}
                />
                <label
                  htmlFor="confirm-distribution"
                  className="text-sm leading-tight cursor-pointer text-slate-300"
                >
                  I confirm this yield distribution is accurate and ready to apply
                </label>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-white/10 text-muted-foreground hover:text-white"
                  onClick={handleClose}
                >
                  Cancel
                </Button>
                <Button
                  className={cn(
                    "flex-1 text-white shadow-lg transition-all duration-150",
                    canConfirm
                      ? "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/25"
                      : "bg-indigo-600/40 cursor-not-allowed"
                  )}
                  onClick={handleConfirm}
                  disabled={!canConfirm}
                >
                  Confirm Distribution
                </Button>
              </div>
            </>
          )}

          {/* PROCESSING PHASE */}
          {phase === "processing" && (
            <div className="flex flex-col items-center justify-center py-10 gap-5">
              <div className="h-14 w-14 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-lg">Processing distribution…</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Distributing yield to {investorCount} investor
                  {investorCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          )}

          {/* SUCCESS PHASE */}
          {phase === "success" && (
            <div className="flex flex-col items-center justify-center py-10 gap-5">
              <div
                className={cn(
                  "h-14 w-14 rounded-full flex items-center justify-center border",
                  "bg-emerald-500/10 border-emerald-500/20"
                )}
              >
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-lg">Distribution complete</p>
                <p className="text-muted-foreground text-sm mt-1">
                  {grossYield} {asset} distributed to {investorCount} investor
                  {investorCount !== 1 ? "s" : ""}
                </p>
              </div>
              <Button
                className="mt-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20"
                onClick={handleClose}
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
