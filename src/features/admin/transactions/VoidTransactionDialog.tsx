/**
 * Void Transaction Dialog
 * Allows admins to void a transaction with reason, confirmation, and impact preview
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Textarea,
  Alert,
  AlertDescription,
} from "@/components/ui";
import { AlertTriangle, Loader2, Info, TrendingDown, Database } from "lucide-react";
import { toast } from "sonner";
import { useTransactionMutations } from "@/hooks/data";
import { transactionsV2Service } from "@/services/investor/transactionsV2Service";
import { FinancialValue } from "@/components/common/FinancialValue";
import { logError } from "@/lib/logger";

/**
 * Minimal transaction data required for the void dialog
 * amount is string to preserve NUMERIC precision
 */
interface VoidableTransaction {
  id: string;
  type: string;
  amount: string; // String for NUMERIC precision preservation
  asset: string;
  investorName: string;
  txDate: string;
  isSystemGenerated?: boolean;
  // Optional fields for cache invalidation
  investorId?: string;
  fundId?: string | null;
}

interface VoidImpact {
  success: boolean;
  error?: string;
  transaction_type?: string;
  transaction_amount?: number;
  transaction_date?: string;
  current_position?: number;
  projected_position?: number;
  position_change?: number;
  would_go_negative?: boolean;
  aum_records_affected?: number;
  related_records?: { type: string; count: number }[];
  is_system_generated?: boolean;
  // Yield dependency warning from void_transaction enhancement
  yield_dependency?: {
    warning?: string;
    severity?: string;
    count?: number;
    affected_yield_ids?: string[];
  };
}

interface VoidTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: VoidableTransaction | null;
  onSuccess: () => void;
}

export function VoidTransactionDialog({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}: VoidTransactionDialogProps) {
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [impact, setImpact] = useState<VoidImpact | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [acknowledgeNegative, setAcknowledgeNegative] = useState(false);
  const { voidMutation } = useTransactionMutations();

  // Fetch impact preview when dialog opens
  useEffect(() => {
    if (open && transaction?.id) {
      setLoadingImpact(true);
      transactionsV2Service
        .getVoidImpact(transaction.id)
        .then(setImpact)
        .catch((err) => {
          logError("VoidTransactionDialog.fetchImpact", err, { transactionId: transaction?.id });
          setImpact(null);
        })
        .finally(() => setLoadingImpact(false));
    } else {
      setImpact(null);
    }
  }, [open, transaction?.id]);

  const handleVoid = async () => {
    if (!transaction) return;

    if (confirmText !== "VOID") {
      toast.error("Please type VOID to confirm");
      return;
    }

    if (reason.trim().length < 3) {
      toast.error("Void reason must be at least 3 characters");
      return;
    }

    voidMutation.mutate(
      {
        transactionId: transaction.id,
        reason: reason.trim(),
        investorId: transaction.investorId,
        fundId: transaction.fundId || undefined,
      },
      {
        onSuccess: () => {
          setReason("");
          setConfirmText("");
          setImpact(null);
          onSuccess();
          onOpenChange(false);
        },
      }
    );
  };

  const handleClose = () => {
    setReason("");
    setConfirmText("");
    setImpact(null);
    setAcknowledgeNegative(false);
    onOpenChange(false);
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Void Transaction
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. The transaction will be marked as voided and positions/AUM
            will be recalculated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Transaction details */}
          <Alert>
            <AlertDescription className="space-y-1">
              <div>
                <strong>Investor:</strong> {transaction.investorName}
              </div>
              <div>
                <strong>Type:</strong> {transaction.type}
              </div>
              <div>
                <strong>Amount:</strong>{" "}
                <FinancialValue value={transaction.amount} asset={transaction.asset} showAsset />
              </div>
              <div>
                <strong>Date:</strong> {transaction.txDate}
              </div>
            </AlertDescription>
          </Alert>

          {/* Impact Preview */}
          {loadingImpact ? (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Loading impact preview...</span>
            </div>
          ) : impact?.success ? (
            <div className="space-y-2 p-3 bg-muted/50 rounded-md border">
              <div className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Impact Preview
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div>Current Position:</div>
                <div className="font-mono">
                  <FinancialValue value={impact.current_position ?? 0} displayDecimals={4} />
                </div>
                <div>After Void:</div>
                <div className="font-mono">
                  <FinancialValue value={impact.projected_position ?? 0} displayDecimals={4} />
                </div>
                <div>Change:</div>
                <div className="font-mono">
                  <FinancialValue
                    value={impact.position_change ?? 0}
                    displayDecimals={4}
                    colorize
                    prefix={(impact.position_change ?? 0) >= 0 ? "+" : ""}
                  />
                </div>
              </div>

              {(impact.aum_records_affected ?? 0) > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <Database className="h-3 w-3" />
                  {impact.aum_records_affected} AUM record(s) will be recalculated
                </div>
              )}

              {impact.would_go_negative && (
                <Alert className="mt-2 border-destructive/50 bg-destructive/10">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-destructive space-y-2">
                    <p>Warning: This would result in a negative balance!</p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acknowledgeNegative}
                        onChange={(e) => setAcknowledgeNegative(e.target.checked)}
                        className="rounded border-destructive"
                      />
                      <span className="text-sm">I understand and want to proceed anyway</span>
                    </label>
                  </AlertDescription>
                </Alert>
              )}

              {impact.yield_dependency && (impact.yield_dependency.count ?? 0) > 0 && (
                <Alert className="mt-2 border-amber-500/50 bg-amber-500/10">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-700">
                    <strong>Yield Recalculation Required:</strong> {impact.yield_dependency.count}{" "}
                    yield distribution(s) were calculated after this transaction date and may need
                    review.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : null}

          {transaction.isSystemGenerated && (
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
                <div className="flex-1">
                  <AlertDescription className="font-medium text-amber-700">
                    System-generated transaction
                  </AlertDescription>
                  <p className="text-xs text-amber-600/80 mt-1">
                    This transaction was automatically created by yield distributions, fee
                    calculations, or IB allocations. Voiding may affect related records.
                  </p>
                </div>
              </div>
            </Alert>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for voiding *</Label>
            <Textarea
              id="reason"
              placeholder="Explain why this transaction is being voided..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 3 characters required for audit trail
            </p>
            {reason.trim().length > 0 && reason.trim().length < 3 && (
              <p className="text-sm text-destructive">Reason must be at least 3 characters</p>
            )}
          </div>

          {/* Confirmation */}
          <div className="space-y-2">
            <Label htmlFor="confirm">Type VOID to confirm</Label>
            <Input
              id="confirm"
              placeholder="Type VOID"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={voidMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleVoid}
            disabled={
              voidMutation.isPending ||
              confirmText !== "VOID" ||
              reason.trim().length < 3 ||
              (impact?.would_go_negative && !acknowledgeNegative)
            }
          >
            {voidMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Void Transaction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
