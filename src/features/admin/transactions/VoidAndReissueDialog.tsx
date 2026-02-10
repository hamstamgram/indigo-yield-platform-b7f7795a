/**
 * Void and Reissue Transaction Dialog
 *
 * Finance-grade workflow for correcting transactions.
 * Instead of editing (which breaks ledger immutability), this dialog:
 * 1. Voids the original transaction
 * 2. Creates a new corrected transaction
 * 3. Links them for audit trail
 *
 * This replaces EditTransactionDialog per CFO policy.
 */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import {
  RefreshCw,
  Loader2,
  AlertTriangle,
  Lock,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useTransactionMutations } from "@/hooks/data";
import { FinancialValue } from "@/components/common/FinancialValue";
import usePlatformError, { routeErrorAction } from "@/hooks/usePlatformError";
import { PlatformErrorCode } from "@/types/errors/platformErrors";
import { preflowAumService } from "@/services/admin";
import { authService } from "@/services/shared";
import { logError } from "@/lib/logger";

const reissueSchema = z.object({
  tx_date: z.string().min(1, "Transaction date is required"),
  amount: z.string().min(1, "Amount is required"),
  closing_aum: z.string().min(1, "Closing AUM is required"),
  notes: z.string().optional(),
  tx_hash: z.string().optional(),
  reason: z.string().min(10, "Reason must be at least 10 characters for audit trail"),
});

type ReissueFormData = z.infer<typeof reissueSchema>;

/**
 * Transaction data required for void and reissue
 */
interface ReissuableTransaction {
  id: string;
  type: string;
  amount: string; // String for NUMERIC precision preservation
  asset: string;
  investorName: string;
  investorId?: string;
  fundId?: string | null;
  txDate: string;
  notes: string | null;
  txHash?: string | null;
  isSystemGenerated?: boolean;
}

interface VoidAndReissueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: ReissuableTransaction | null;
  onSuccess: () => void;
}

export function VoidAndReissueDialog({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}: VoidAndReissueDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [activeTab, setActiveTab] = useState<"changes" | "review">("changes");
  const [existingPreflow, setExistingPreflow] = useState<{
    closingAum: number;
    eventTs?: string;
    createdByName?: string;
  } | null>(null);
  const [checkingPreflow, setCheckingPreflow] = useState(false);
  const { voidAndReissueMutation } = useTransactionMutations();
  const { handleError, error: platformError, clearError } = usePlatformError();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReissueFormData>({
    resolver: zodResolver(reissueSchema),
    defaultValues: {
      reason: "",
    },
  });

  const watchedValues = watch();

  // Reset form when transaction changes
  useEffect(() => {
    if (transaction) {
      reset({
        tx_date: transaction.txDate,
        amount: transaction.amount,
        closing_aum: "",
        notes: transaction.notes || "",
        tx_hash: transaction.txHash || "",
        reason: "",
      });
      setConfirmText("");
      setActiveTab("changes");
      clearError();
      setExistingPreflow(null);
    }
  }, [transaction, reset, clearError]);

  // Probe for existing preflow AUM for fund/date and auto-fill closing AUM if found
  useEffect(() => {
    const fundId = transaction?.fundId;
    const txDate = watchedValues.tx_date;
    if (!open || !fundId || !txDate) return;

    setCheckingPreflow(true);
    preflowAumService
      .getExisting(fundId, txDate, "transaction")
      .then((record) => {
        if (record) {
          setExistingPreflow({
            closingAum: record.closingAum,
            eventTs: record.eventTs,
            createdByName: record.createdBy?.name || undefined,
          });
          setValue("closing_aum", String(record.closingAum), { shouldValidate: true });
        } else {
          setExistingPreflow(null);
        }
      })
      .catch((err) => {
        logError("VoidAndReissueDialog.preflowProbe", err, { fundId, txDate });
        setExistingPreflow(null);
      })
      .finally(() => setCheckingPreflow(false));
  }, [open, transaction?.fundId, watchedValues.tx_date, reset]);

  // Compute what changed
  const getChanges = () => {
    if (!transaction) return [];
    const changes: { field: string; oldValue: string; newValue: string }[] = [];

    if (watchedValues.tx_date !== transaction.txDate) {
      changes.push({
        field: "Date",
        oldValue: transaction.txDate,
        newValue: watchedValues.tx_date || "",
      });
    }
    if (watchedValues.amount !== transaction.amount) {
      changes.push({
        field: "Amount",
        oldValue: `${transaction.amount} ${transaction.asset}`,
        newValue: `${watchedValues.amount || "0"} ${transaction.asset}`,
      });
    }
    if ((watchedValues.notes || "") !== (transaction.notes || "")) {
      changes.push({
        field: "Notes",
        oldValue: transaction.notes || "(empty)",
        newValue: watchedValues.notes || "(empty)",
      });
    }
    if ((watchedValues.tx_hash || "") !== (transaction.txHash || "")) {
      changes.push({
        field: "Tx Hash",
        oldValue: transaction.txHash || "(none)",
        newValue: watchedValues.tx_hash || "(none)",
      });
    }

    return changes;
  };

  const changes = getChanges();
  const hasChanges = changes.length > 0;

  const onSubmit = async (data: ReissueFormData) => {
    if (!transaction) return;

    if (confirmText !== "REISSUE") {
      toast.error("Please type REISSUE to confirm");
      return;
    }

    if (!hasChanges) {
      toast.info("No changes to apply");
      return;
    }

    const closingAum = parseFloat(data.closing_aum);
    if (!isFinite(closingAum) || closingAum <= 0) {
      toast.error("Closing AUM must be a positive number");
      return;
    }

    // Ensure preflow exists for fund/date (idempotent). If one exists, it will be reused.
    if (transaction.fundId) {
      try {
        const user = await authService.getCurrentUser();

        await preflowAumService.ensure(
          transaction.fundId,
          data.tx_date,
          closingAum,
          user.id,
          "transaction"
        );
      } catch (err) {
        logError("VoidAndReissueDialog.ensurePreflow", err, {
          fundId: transaction.fundId,
          txDate: data.tx_date,
        });
        throw err;
      }
    }

    voidAndReissueMutation.mutate(
      {
        transactionId: transaction.id,
        newValues: {
          tx_date: data.tx_date,
          amount: data.amount, // Keep as string for NUMERIC precision
          notes: data.notes || null,
          tx_hash: data.tx_hash || null,
        },
        closingAum: String(closingAum),
        reason: data.reason.trim(),
        investorId: transaction.investorId,
        fundId: transaction.fundId || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Transaction voided and reissued", {
            description: "Original voided, new transaction created",
          });
          reset();
          setConfirmText("");
          onSuccess();
          onOpenChange(false);
        },
        onError: (err) => {
          handleError(err, {
            onUIAction: (_action, error) => {
              routeErrorAction(error, {
                onFocusDateField: () => setActiveTab("changes"),
              });
            },
          });
        },
      }
    );
  };

  const handleClose = () => {
    reset();
    setConfirmText("");
    clearError();
    onOpenChange(false);
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Void and Reissue Transaction
          </DialogTitle>
          <DialogDescription>
            Correct this transaction by voiding the original and creating a new one with the updated
            values. This maintains ledger immutability and full audit trail.
          </DialogDescription>
        </DialogHeader>

        {/* Transaction info banner */}
        <Alert>
          <AlertDescription>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div>
                <strong>Investor:</strong> {transaction.investorName}
              </div>
              <div>
                <strong>Type:</strong> {transaction.type}
              </div>
              <div>
                <strong>Current Amount:</strong>{" "}
                <FinancialValue value={transaction.amount} asset={transaction.asset} showAsset />
              </div>
              <div>
                <strong>Current Date:</strong> {transaction.txDate}
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {transaction.isSystemGenerated && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>System-generated transactions cannot be modified.</strong>
              <p className="text-sm mt-1">
                This transaction was created automatically (yield distribution, fee, etc.). Contact
                support if correction is needed.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Platform error display */}
        {platformError && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{platformError.code}</strong>
              <p className="text-sm">{platformError.message}</p>
              {platformError.user_action_hint && (
                <p className="text-xs text-muted-foreground mt-1">
                  {platformError.user_action_hint}
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "changes" | "review")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="changes">1. Enter Corrections</TabsTrigger>
              <TabsTrigger value="review" disabled={!hasChanges}>
                2. Review & Confirm
              </TabsTrigger>
            </TabsList>

            <TabsContent value="changes" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tx_date">Transaction Date *</Label>
                  <Input
                    id="tx_date"
                    type="date"
                    {...register("tx_date")}
                    disabled={transaction.isSystemGenerated}
                  />
                  {errors.tx_date && (
                    <p className="text-sm text-destructive">{errors.tx_date.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ({transaction.asset}) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.00000001"
                    {...register("amount")}
                    disabled={transaction.isSystemGenerated}
                  />
                  {errors.amount && (
                    <p className="text-sm text-destructive">{errors.amount.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="closing_aum">
                  Closing AUM Snapshot ({transaction.asset}) *
                  {existingPreflow && (
                    <span className="ml-2 text-xs text-emerald-400 font-medium">
                      (Using existing preflow)
                    </span>
                  )}
                </Label>
                <Input
                  id="closing_aum"
                  type="number"
                  step="0.00000001"
                  min="0"
                  placeholder={`Enter closing AUM in ${transaction.asset}`}
                  {...register("closing_aum")}
                  readOnly={Boolean(existingPreflow)}
                  disabled={transaction.isSystemGenerated || checkingPreflow}
                  className={existingPreflow ? "bg-muted" : undefined}
                />
                {checkingPreflow ? (
                  <p className="text-xs text-muted-foreground">
                    Checking for existing preflow AUM…
                  </p>
                ) : existingPreflow ? (
                  <p className="text-xs text-emerald-400">
                    Using existing preflow AUM recorded at{" "}
                    {existingPreflow.eventTs
                      ? new Date(existingPreflow.eventTs).toLocaleString()
                      : "(unknown time)"}
                    {existingPreflow.createdByName ? ` by ${existingPreflow.createdByName}` : ""}.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No existing preflow AUM found for this fund/date. Enter the fund AUM immediately
                    before the reissued transaction.
                  </p>
                )}
                {errors.closing_aum && (
                  <p className="text-sm text-destructive">{errors.closing_aum.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tx_hash">Transaction Hash</Label>
                <Input
                  id="tx_hash"
                  placeholder="Optional blockchain tx hash"
                  {...register("tx_hash")}
                  disabled={transaction.isSystemGenerated}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Transaction notes"
                  {...register("notes")}
                  rows={2}
                  disabled={transaction.isSystemGenerated}
                />
              </div>

              <Button
                type="button"
                className="w-full"
                disabled={!hasChanges || transaction.isSystemGenerated}
                onClick={() => setActiveTab("review")}
              >
                Continue to Review
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              {!hasChanges && (
                <p className="text-sm text-muted-foreground text-center">
                  Make changes to the fields above to continue
                </p>
              )}
            </TabsContent>

            <TabsContent value="review" className="space-y-4 mt-4">
              {/* Changes summary */}
              <div className="rounded-md border p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Changes to Apply
                </h4>
                {changes.map((change, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-2 text-sm">
                    <div className="font-medium">{change.field}:</div>
                    <div className="text-muted-foreground line-through">{change.oldValue}</div>
                    <div className="text-emerald-400 font-medium">{change.newValue}</div>
                  </div>
                ))}
              </div>

              {/* Workflow explanation */}
              <Alert>
                <AlertDescription className="text-sm">
                  <strong>What will happen:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Original transaction will be voided (marked as void, not deleted)</li>
                    <li>New transaction will be created with corrected values</li>
                    <li>Both transactions will be linked in the audit trail</li>
                    <li>Investor position and AUM will be recalculated</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <hr />

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for correction *</Label>
                <Textarea
                  id="reason"
                  placeholder="Explain why this transaction needs to be corrected (minimum 10 characters)..."
                  {...register("reason")}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Required for audit trail. Be specific about the error and correction.
                </p>
                {errors.reason && (
                  <p className="text-sm text-destructive">{errors.reason.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmText">Type REISSUE to confirm</Label>
                <Input
                  id="confirmText"
                  placeholder="Type REISSUE"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={voidAndReissueMutation.isPending}
            >
              Cancel
            </Button>
            {transaction.isSystemGenerated ? (
              <Button type="button" variant="secondary" disabled className="cursor-not-allowed">
                <Lock className="mr-2 h-4 w-4" />
                Cannot Modify System Transaction
              </Button>
            ) : activeTab === "review" ? (
              <Button
                type="submit"
                disabled={
                  voidAndReissueMutation.isPending ||
                  confirmText !== "REISSUE" ||
                  !hasChanges ||
                  !!errors.reason
                }
              >
                {voidAndReissueMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <RefreshCw className="mr-2 h-4 w-4" />
                Void and Reissue
              </Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default VoidAndReissueDialog;
