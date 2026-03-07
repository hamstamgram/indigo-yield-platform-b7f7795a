/**
 * Void Distribution Dialog
 * Confirmation dialog for voiding yield distributions with cascade impact preview
 */

import { useState, useEffect } from "react";
import { AlertTriangle, Loader2, Trash2, Users, FileX, DollarSign } from "lucide-react";
import { logError } from "@/lib/logger";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Textarea,
  Label,
  Checkbox,
  Badge,
} from "@/components/ui";
import { format } from "date-fns";
import { FinancialValue } from "@/components/common/FinancialValue";
import {
  getVoidYieldImpact,
  type VoidYieldImpactResult,
} from "@/features/admin/funds/services/reconciliationService";

interface DistributionSummary {
  id: string;
  fund_name: string;
  fund_asset: string;
  gross_yield: number;
  net_yield: number;
  total_fees: number;
  total_ib: number;
  purpose: string;
  effective_date: string;
  period_end?: string;
}

interface VoidDistributionDialogProps {
  distribution: DistributionSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (distributionId: string, reason: string, voidCrystals: boolean) => Promise<void>;
  isPending?: boolean;
}

export function VoidDistributionDialog({
  distribution,
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
}: VoidDistributionDialogProps) {
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [voidCrystals, setVoidCrystals] = useState(false);
  const [impact, setImpact] = useState<VoidYieldImpactResult | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);

  const isValid = reason.trim().length >= 5 && confirmed;

  useEffect(() => {
    if (open && distribution?.id) {
      setLoadingImpact(true);
      getVoidYieldImpact(distribution.id)
        .then(setImpact)
        .catch((err) => {
          logError("VoidDistributionDialog.getVoidYieldImpact", err, {
            distributionId: distribution.id,
          });
          setImpact(null);
        })
        .finally(() => setLoadingImpact(false));
    } else {
      setImpact(null);
    }
  }, [open, distribution?.id]);

  const handleConfirm = async () => {
    if (!isValid || !distribution) return;
    await onConfirm(distribution.id, reason.trim(), voidCrystals);
    setReason("");
    setConfirmed(false);
    setVoidCrystals(false);
    setImpact(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason("");
      setConfirmed(false);
      setVoidCrystals(false);
      setImpact(null);
    }
    onOpenChange(newOpen);
  };

  if (!distribution) return null;

  const displayDate = distribution.period_end || distribution.effective_date;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Void Yield Distribution
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              This will void the entire distribution and cascade to all related yield allocations,
              fee allocations, IB allocations, and transactions. Affected investor positions will be
              recalculated.
            </p>

            <div className="bg-muted rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fund:</span>
                <span className="font-medium">{distribution.fund_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Period:</span>
                <span className="font-medium">{format(new Date(displayDate), "MMM d, yyyy")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gross yield:</span>
                <span className="font-medium">
                  <FinancialValue
                    value={distribution.gross_yield}
                    asset={distribution.fund_asset}
                  />
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Purpose:</span>
                <Badge variant="outline" className="text-xs uppercase tracking-wider">
                  {distribution.purpose === "reporting" ? "Reporting" : "Transaction"}
                </Badge>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          {loadingImpact ? (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Loading impact preview...</span>
            </div>
          ) : impact ? (
            <div className="space-y-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md">
              <div className="text-sm font-medium flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                Cascade Impact
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    <strong>{impact.affected_investors}</strong> investor(s)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileX className="h-4 w-4 text-muted-foreground" />
                  <span>
                    <strong>{impact.transaction_count}</strong> transaction(s)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Yield:{" "}
                    <FinancialValue
                      value={impact.total_investor_yield}
                      asset={distribution.fund_asset}
                    />
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Fees:{" "}
                    <FinancialValue value={impact.total_fees} asset={distribution.fund_asset} />
                  </span>
                </div>
              </div>

              {impact.total_ib_commissions > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>
                    IB commissions:{" "}
                    <FinancialValue
                      value={impact.total_ib_commissions}
                      asset={distribution.fund_asset}
                    />
                  </span>
                </div>
              )}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="void-dist-reason">
              Reason for voiding <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="void-dist-reason"
              placeholder="Explain why this distribution needs to be voided (min 5 characters)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
            {reason.length > 0 && reason.length < 5 && (
              <p className="text-xs text-destructive">Reason must be at least 5 characters</p>
            )}
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="void-crystals"
              checked={voidCrystals}
              onCheckedChange={(checked) => setVoidCrystals(checked === true)}
            />
            <label htmlFor="void-crystals" className="text-sm leading-tight cursor-pointer">
              Also void recorded yield distributions created within this period (use when
              re-distributing from scratch).
            </label>
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="confirm-void-dist"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked === true)}
            />
            <label htmlFor="confirm-void-dist" className="text-sm leading-tight cursor-pointer">
              I understand this will void all related allocations and transactions, and recalculate
              all affected investor positions.
            </label>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={!isValid || isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Voiding...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Void Distribution
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
